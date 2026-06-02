const pyodideVersion = '0.29.3'
const pyodideIndexUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`

let pyodidePromise = null
const loadedPackages = new Set()

function send(id, payload) {
  self.postMessage({ id, ok: true, payload })
}

function fail(id, error) {
  self.postMessage({
    id,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  })
}

async function ensurePyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      importScripts(`${pyodideIndexUrl}pyodide.js`)
      const pyodide = await loadPyodide({ indexURL: pyodideIndexUrl })
      await pyodide.loadPackage(['pandas', 'numpy', 'scikit-learn'])
      loadedPackages.add('pandas')
      loadedPackages.add('numpy')
      loadedPackages.add('scikit-learn')
      pyodide.runPython(basePython)
      return pyodide
    })()
  }

  return pyodidePromise
}

async function ensurePackage(pyodide, packageName) {
  if (loadedPackages.has(packageName)) {
    return
  }

  await pyodide.loadPackage(packageName)
  loadedPackages.add(packageName)
}

async function runJsonFunction(functionName, payload, packages = []) {
  const pyodide = await ensurePyodide()

  for (const packageName of packages) {
    await ensurePackage(pyodide, packageName)
  }

  pyodide.globals.set('MAEL_PAYLOAD', JSON.stringify(payload))
  const result = pyodide.runPython(`${functionName}(MAEL_PAYLOAD)`)
  pyodide.globals.delete('MAEL_PAYLOAD')
  return JSON.parse(result)
}

self.onmessage = (event) => {
  const { id, payload, type } = event.data

  ;(async () => {
    if (type === 'profile') {
      send(id, await runJsonFunction('profile_dataset', payload))
      return
    }

    if (type === 'review') {
      send(id, await runJsonFunction('review_dataset', payload))
      return
    }

    if (type === 'extract_date_features') {
      send(id, await runJsonFunction('extract_date_features', payload))
      return
    }

    if (type === 'train') {
      const functionName =
        payload?.validation === 'cv' ? 'cv_train_model' : 'train_model'
      send(id, await runJsonFunction(functionName, payload, ['xgboost']))
      return
    }

    if (type === 'predict') {
      send(id, await runJsonFunction('predict_one', payload))
      return
    }

    if (type === 'predict_batch') {
      send(id, await runJsonFunction('predict_batch', payload))
      return
    }

    if (type === 'predict_contribs_row') {
      send(id, await runJsonFunction('predict_contribs_row', payload))
      return
    }

    if (type === 'export_run') {
      send(id, await runJsonFunction('export_run', payload, ['xgboost']))
      return
    }

    if (type === 'set_active_run') {
      send(id, await runJsonFunction('set_active_run', payload))
      return
    }

    if (type === 'set_run_pinned') {
      send(id, await runJsonFunction('set_run_pinned', payload))
      return
    }

    throw new Error(`Unknown worker message: ${type}`)
  })().catch((error) => fail(id, error))
}

// biome-ignore lint/complexity/noUselessStringRaw: Pyodide executes this as an embedded Python module.
const basePython = String.raw`
import hashlib
import io
import json
import math
import re
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import accuracy_score, average_precision_score, auc, confusion_matrix, f1_score, log_loss, mean_squared_error, precision_recall_curve, r2_score, roc_curve
from sklearn.model_selection import KFold, StratifiedKFold, TimeSeriesSplit, train_test_split
from sklearn.preprocessing import LabelEncoder

STATE = {
    "runs": {},
    "order": [],
    "active": None,
    "dataset": None,
    "next_run_number": 1,
}


def _json_default(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        number = float(value)
        return None if math.isnan(number) or math.isinf(number) else number
    if isinstance(value, np.ndarray):
        return value.tolist()
    if pd.isna(value):
        return None
    return str(value)


def _to_json(payload):
    return json.dumps(payload, default=_json_default)


def _csv_hash(csv_text):
    return hashlib.sha256(csv_text.encode("utf-8")).hexdigest()


def _read_csv(csv_text):
    return pd.read_csv(io.StringIO(csv_text))


def _column_kind(series):
    return "numeric" if pd.api.types.is_numeric_dtype(series) else "categorical"


def _profile_column(name, series):
    kind = _column_kind(series)
    non_null = series.dropna()
    date_like = (
        bool(pd.to_datetime(non_null, errors="coerce", format="mixed").notna().mean() >= 0.8)
        if len(non_null) > 0
        else False
    )
    examples = [
        str(value)
        for value in non_null.astype(str).head(4).tolist()
    ]
    base = {
        "name": name,
        "dtype": str(series.dtype),
        "kind": kind,
        "missing": int(series.isna().sum()),
        "unique": int(series.nunique(dropna=True)),
        "examples": examples,
        "dateLike": date_like,
    }

    if kind == "numeric":
        numeric = pd.to_numeric(series, errors="coerce")
        base.update({
            "min": _json_default(numeric.min()),
            "max": _json_default(numeric.max()),
            "median": _json_default(numeric.median()),
        })
    else:
        base["categories"] = [
            str(value)
            for value in series.dropna().astype(str).value_counts().head(12).index.tolist()
        ]

    return base


def profile_dataset(payload_json):
    payload = json.loads(payload_json)
    df = _read_csv(payload["csvText"])

    if df.empty:
        raise ValueError("Dataset is empty")

    columns = [_profile_column(name, df[name]) for name in df.columns]
    preview = df.head(8).replace({np.nan: None}).to_dict(orient="records")

    return _to_json({
        "columns": columns,
        "rowCount": int(len(df)),
        "columnCount": int(len(df.columns)),
        "suggestedTarget": str(df.columns[-1]),
        "previewRows": preview,
    })


def _review_flag(feature, severity, code, message, suggested_action):
    return {
        "feature": feature,
        "severity": severity,
        "code": code,
        "message": message,
        "suggestedAction": suggested_action,
    }


def _cramers_v(feature, target):
    table = pd.crosstab(feature.fillna("__missing__").astype(str), target.fillna("__missing__").astype(str))
    if table.empty:
        return 0
    observed = table.to_numpy(dtype=float)
    total = observed.sum()
    if total <= 0:
        return 0
    row_sum = observed.sum(axis=1, keepdims=True)
    col_sum = observed.sum(axis=0, keepdims=True)
    expected = row_sum @ col_sum / total
    mask = expected > 0
    chi2 = (((observed - expected) ** 2) / np.where(mask, expected, 1))[mask].sum()
    denominator = total * max(1, min(observed.shape) - 1)
    return float(np.sqrt(chi2 / denominator)) if denominator > 0 else 0


def review_dataset(payload_json):
    payload = json.loads(payload_json)
    df = _read_csv(payload["csvText"])
    target = payload["target"]
    if target not in df.columns:
        raise ValueError("Target column does not exist")

    excluded = set(_normalize_excluded_features(df, target, payload.get("excludedFeatures")))
    target_series = df[target]
    flags = []

    for column in df.columns:
        if column == target or column in excluded:
            continue

        series = df[column]
        profile = _profile_column(column, series)
        unique = profile["unique"]
        row_count = max(1, len(df))

        if unique / row_count > 0.95:
            flags.append(_review_flag(
                column,
                "info",
                "id_like",
                "Column looks like a row identifier and usually has no reusable signal.",
                "exclude",
            ))
        if unique == 1:
            flags.append(_review_flag(
                column,
                "info",
                "constant",
                "Column has one value, so it cannot help the model.",
                "auto-drop",
            ))
        if re.search(r"date|time|timestamp|_at$", column, re.IGNORECASE):
            flags.append(_review_flag(
                column,
                "info",
                "date_named",
                "Column name looks time-based; raw timestamps often need date features.",
                "convert-date-features",
            ))
        if profile["kind"] == "categorical" and unique > 50:
            flags.append(_review_flag(
                column,
                "info",
                "high_cardinality",
                "Categorical column has many values and may slow training or overfit.",
                "drop-or-accept",
            ))

        target_numeric = pd.to_numeric(target_series, errors="coerce")
        if target_numeric.notna().sum() < 3 and target_series.nunique(dropna=True) == 2:
            target_numeric = pd.Series(
                LabelEncoder().fit_transform(target_series.astype(str)),
                index=target_series.index,
            )
        feature_numeric = pd.to_numeric(series, errors="coerce")
        if feature_numeric.notna().sum() >= 3 and target_numeric.notna().sum() >= 3:
            joined = pd.concat([feature_numeric, target_numeric], axis=1).dropna()
            if len(joined) >= 3:
                pearson = abs(float(joined.iloc[:, 0].corr(joined.iloc[:, 1], method="pearson")))
                spearman = abs(float(joined.iloc[:, 0].corr(joined.iloc[:, 1], method="spearman")))
                if max(pearson, spearman) > 0.95:
                    flags.append(_review_flag(
                        column,
                        "warning",
                        "target_leakage",
                        "Feature is almost perfectly correlated with the target.",
                        "exclude",
                    ))
                    continue

        cramers = _cramers_v(series, target_series) if profile["kind"] == "categorical" else 0
        if cramers > 0.95:
            flags.append(_review_flag(
                column,
                "warning",
                "target_leakage",
                "Feature is almost perfectly associated with the target.",
                "exclude",
            ))

    return _to_json(flags)


def _add_date_features(df, column, features):
    if column not in df.columns:
        raise ValueError("Date column does not exist")
    parsed = pd.to_datetime(df[column], errors="coerce", format="mixed")
    for feature in features:
        name = f"{column}_{feature}"
        if feature == "year":
            df[name] = parsed.dt.year
        elif feature == "month":
            df[name] = parsed.dt.month
        elif feature == "day":
            df[name] = parsed.dt.day
        elif feature == "dayofweek":
            df[name] = parsed.dt.dayofweek
        elif feature == "hour":
            df[name] = parsed.dt.hour
        elif feature == "is_weekend":
            df[name] = parsed.dt.dayofweek.isin([5, 6]).astype(int)
    return df


def extract_date_features(payload_json):
    payload = json.loads(payload_json)
    column = payload["column"]
    options = payload.get("options") or {}
    features = [
        feature
        for feature in (options.get("features") or [])
        if feature in {"year", "month", "day", "dayofweek", "hour", "is_weekend"}
    ]
    if not features:
        raise ValueError("Choose at least one date feature")
    df = _read_csv(payload["csvText"])
    df = _add_date_features(df, column, features)
    csv_text = df.to_csv(index=False)
    profile = json.loads(profile_dataset(json.dumps({"csvText": csv_text})))
    excluded = [] if options.get("keepOriginal") else [column]
    return _to_json({
        "csvText": csv_text,
        "excludedFeatures": excluded,
        "profile": profile,
        "transform": {
            "column": column,
            "features": features,
            "keepOriginal": bool(options.get("keepOriginal")),
        },
    })


def _resolve_task(task, target_series):
    if task != "auto":
        return task

    unique = target_series.nunique(dropna=True)
    if pd.api.types.is_numeric_dtype(target_series) and unique > 10:
        return "regression"
    if unique <= 2:
        return "binary"
    return "multiclass"


def _normalize_excluded_features(df, target, excluded_features):
    requested = excluded_features or []
    return [
        str(column)
        for column in requested
        if str(column) in df.columns and str(column) != target
    ]


def _resolve_missing_strategy(value):
    if value in {"native", "drop_rows", "fill", "fill_with_indicator"}:
        return value
    return "native"


def _resolve_ordering(value):
    return "time" if value == "time" else "random"


def _apply_time_ordering(df, ordering, time_column):
    if ordering != "time":
        return df, None
    if not time_column or time_column not in df.columns:
        raise ValueError("Time ordering requires a valid date column")
    parsed = pd.to_datetime(df[time_column], errors="coerce", format="mixed")
    if parsed.notna().mean() < 0.8:
        raise ValueError("Time column must mostly parse as dates")
    return (
        df.assign(__mael_time_order=parsed)
        .dropna(subset=["__mael_time_order"])
        .sort_values("__mael_time_order")
        .drop(columns=["__mael_time_order"])
        .reset_index(drop=True),
        time_column,
    )


def _temporal_holdout(X, y):
    train_end = int(len(X) * 0.6)
    val_end = int(len(X) * 0.8)
    if train_end < 1 or val_end <= train_end or len(X) <= val_end:
        raise ValueError("Need enough rows for temporal train/val/test split")
    if hasattr(y, "iloc"):
        return (
            X.iloc[:train_end],
            X.iloc[train_end:val_end],
            X.iloc[val_end:],
            y.iloc[:train_end],
            y.iloc[train_end:val_end],
            y.iloc[val_end:],
        )
    return (
        X.iloc[:train_end],
        X.iloc[train_end:val_end],
        X.iloc[val_end:],
        y[:train_end],
        y[train_end:val_end],
        y[val_end:],
    )


def _indicator_name(column, existing_columns):
    base = f"{column}_was_missing"
    candidate = base
    suffix = 2
    while candidate in existing_columns:
        candidate = f"{base}_{suffix}"
        suffix += 1
    existing_columns.add(candidate)
    return candidate


def _prepare_features(df, target, excluded_features=None, missing_strategy="native"):
    excluded = _normalize_excluded_features(df, target, excluded_features)
    missing_strategy = _resolve_missing_strategy(missing_strategy)
    X = df.drop(columns=[target, *excluded]).copy()
    feature_profiles = []
    category_values = {}
    defaults = {}
    missing_indicators = {}

    if missing_strategy == "fill_with_indicator":
        existing_columns = set(X.columns)
        for column in list(X.columns):
            if X[column].isna().any():
                indicator = _indicator_name(column, existing_columns)
                X[indicator] = X[column].isna().astype(float)
                defaults[indicator] = 0
                missing_indicators[column] = indicator

    for column in X.columns:
        series = X[column]
        kind = _column_kind(series)

        if kind == "numeric":
            numeric = pd.to_numeric(series, errors="coerce")
            median = numeric.median()
            default = 0 if pd.isna(median) else float(median)
            if missing_strategy in {"fill", "fill_with_indicator"}:
                numeric = numeric.fillna(default)
            X[column] = numeric
            defaults.setdefault(column, default)
            feature_profiles.append({
                "name": column,
                "kind": "numeric",
                "defaultValue": defaults[column],
                "min": _json_default(numeric.min()),
                "max": _json_default(numeric.max()),
            })
        else:
            values = [
                str(value)
                for value in series.dropna().astype(str).value_counts().head(20).index.tolist()
            ]
            if not values:
                values = ["missing"]
            category_values[column] = values
            default = values[0]
            defaults.setdefault(column, default)
            string_series = series.astype("string")
            if missing_strategy in {"fill", "fill_with_indicator"}:
                string_series = string_series.fillna(default)
            X[column] = pd.Categorical(string_series, categories=values)
            feature_profiles.append({
                "name": column,
                "kind": "categorical",
                "defaultValue": default,
                "categories": values,
            })

    return X, feature_profiles, category_values, defaults, excluded, missing_indicators


def _drop_missing_rows(X, y, missing_strategy):
    if missing_strategy != "drop_rows":
        return X, y
    mask = ~X.isna().any(axis=1)
    return X.loc[mask], y.loc[mask]


HYPERPARAM_DEFAULTS = {
    "n_estimators": 80,
    "learning_rate": 0.08,
    "max_depth": 4,
    "min_child_weight": 1,
    "gamma": 0,
    "subsample": 0.9,
    "colsample_bytree": 0.9,
    "reg_alpha": 0,
    "reg_lambda": 1,
    "scale_pos_weight": 1,
    "class_weight_balanced": False,
}


def _resolve_hyperparams(payload_hyperparams):
    incoming = payload_hyperparams or {}
    hyperparams = dict(HYPERPARAM_DEFAULTS)
    for key in HYPERPARAM_DEFAULTS:
        if key in incoming and incoming[key] is not None:
            hyperparams[key] = incoming[key]

    hyperparams["n_estimators"] = int(hyperparams["n_estimators"])
    hyperparams["max_depth"] = int(hyperparams["max_depth"])
    for key in (
        "learning_rate",
        "min_child_weight",
        "gamma",
        "subsample",
        "colsample_bytree",
        "reg_alpha",
        "reg_lambda",
        "scale_pos_weight",
    ):
        hyperparams[key] = float(hyperparams[key])
    hyperparams["class_weight_balanced"] = bool(hyperparams["class_weight_balanced"])

    return hyperparams


def _make_model(task, hyperparams, random_state, early_stopping=True):
    from xgboost import XGBClassifier, XGBRegressor

    model_hyperparams = {
        key: value
        for key, value in hyperparams.items()
        if key != "class_weight_balanced"
    }
    if task != "binary":
        model_hyperparams.pop("scale_pos_weight", None)

    common = {
        **model_hyperparams,
        "n_jobs": 1,
        "tree_method": "hist",
        "enable_categorical": True,
        "random_state": int(random_state),
    }
    if early_stopping:
        common["early_stopping_rounds"] = 20
    if task == "regression":
        return XGBRegressor(objective="reg:squarederror", **common)
    if task == "binary":
        return XGBClassifier(objective="binary:logistic", eval_metric="logloss", **common)
    return XGBClassifier(objective="multi:softprob", eval_metric="mlogloss", **common)


def _balanced_sample_weight(y):
    values, counts = np.unique(y, return_counts=True)
    if len(values) == 0:
        return None

    total = len(y)
    class_count = len(values)
    weights_by_class = {
        value: total / (class_count * count)
        for value, count in zip(values, counts)
        if count > 0
    }
    return np.asarray([weights_by_class[value] for value in y], dtype=float)


def _fit_model(model, X, y, eval_set=None, verbose=False, sample_weight=None):
    kwargs = {"verbose": verbose}
    if eval_set is not None:
        kwargs["eval_set"] = eval_set
    if sample_weight is not None:
        kwargs["sample_weight"] = sample_weight
    return model.fit(X, y, **kwargs)


def _importance(model, feature_names):
    values = getattr(model, "feature_importances_", None)
    if values is None:
        return []

    total = float(np.sum(values)) or 1.0
    rows = [
        {"feature": name, "importance": float(value) / total}
        for name, value in zip(feature_names, values)
    ]
    return sorted(rows, key=lambda row: row["importance"], reverse=True)[:12]


def _booster_contribs(model, X):
    from xgboost import DMatrix

    matrix = DMatrix(X, enable_categorical=True)
    return model.get_booster().predict(matrix, pred_contribs=True)


def _shap_importance(model, X, fields):
    contribs = _booster_contribs(model, X)
    feature_names = [field["name"] for field in fields]

    if contribs.ndim == 3:
        feature_contribs = contribs[:, :, :-1]
        mean_abs = np.mean(np.abs(feature_contribs), axis=(0, 1))
        distribution = np.mean(feature_contribs, axis=1)
    else:
        feature_contribs = contribs[:, :-1]
        mean_abs = np.mean(np.abs(feature_contribs), axis=0)
        distribution = feature_contribs

    rows = []
    for index, feature in enumerate(feature_names):
        values = distribution[:, index][:200]
        rows.append({
            "feature": feature,
            "meanAbs": float(mean_abs[index]),
            "contributions": [float(value) for value in values],
        })

    return sorted(rows, key=lambda row: row["meanAbs"], reverse=True)[:12]


def _primary_metric(metrics):
    if isinstance(metrics, dict):
        metric_rows = metrics.get("val") or metrics.get("cv") or []
    else:
        metric_rows = metrics
    if not metric_rows:
        return None
    return metric_rows[0]


def _best_iteration(model, fallback):
    value = getattr(model, "best_iteration", None)
    if value is None:
        value = getattr(model, "best_iteration_", None)
    if value is None:
        return int(fallback)
    return int(value) + 1


def _regression_metrics(y_true, predicted):
    return [
        {"label": "RMSE", "value": float(np.sqrt(mean_squared_error(y_true, predicted)))},
        {"label": "R2", "value": float(r2_score(y_true, predicted))},
    ]


def _classification_metrics(model, X, y_true):
    predicted = model.predict(X)
    metrics = [
        {"label": "F1 weighted", "value": float(f1_score(y_true, predicted, average="weighted"))},
        {"label": "Accuracy", "value": float(accuracy_score(y_true, predicted))},
    ]
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
        try:
            metrics.append({"label": "Log loss", "value": float(log_loss(y_true, probabilities))})
        except Exception:
            pass
    return metrics, predicted


def _classification_curves(y_true, probabilities, classes):
    if probabilities is None:
        return [], []

    roc_rows = []
    pr_rows = []
    class_count = probabilities.shape[1]

    for index in range(class_count):
        y_binary = (np.asarray(y_true) == index).astype(int)
        if len(np.unique(y_binary)) < 2:
            continue

        fpr, tpr, _ = roc_curve(y_binary, probabilities[:, index])
        precision, recall, _ = precision_recall_curve(y_binary, probabilities[:, index])
        label = classes[index] if index < len(classes) else str(index)
        roc_rows.append({
            "class": label,
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist(),
            "auc": float(auc(fpr, tpr)),
        })
        pr_rows.append({
            "class": label,
            "precision": precision.tolist(),
            "recall": recall.tolist(),
            "ap": float(average_precision_score(y_binary, probabilities[:, index])),
        })

    return roc_rows, pr_rows


def _classification_calibration(y_true, probabilities, classes):
    if probabilities is None:
        return []

    rows = []
    class_count = probabilities.shape[1]

    for index in range(class_count):
        y_binary = (np.asarray(y_true) == index).astype(int)
        if len(np.unique(y_binary)) < 2:
            continue

        fraction_positive, mean_predicted = calibration_curve(
            y_binary,
            probabilities[:, index],
            n_bins=10,
            strategy="quantile",
        )
        label = classes[index] if index < len(classes) else str(index)
        rows.append({
            "class": label,
            "meanPredicted": mean_predicted.tolist(),
            "fractionPositive": fraction_positive.tolist(),
        })

    return rows


def _class_imbalance(y_train, classes):
    values, counts = np.unique(y_train, return_counts=True)
    if len(values) < 2:
        return None

    min_index = int(np.argmin(counts))
    max_index = int(np.argmax(counts))
    minority_value = int(values[min_index])
    min_count = int(counts[min_index])
    max_count = int(counts[max_index])
    if min_count <= 0 or max_count <= 0:
        return None

    ratio = min_count / max_count
    if ratio >= 0.2:
        return None

    return {
        "minorityClass": classes[minority_value] if minority_value < len(classes) else str(minority_value),
        "ratio": float(ratio),
        "suggestedScalePosWeight": float(max_count / min_count),
    }


def _imbalance_corrected(task, hyperparams):
    if task == "binary":
        return float(hyperparams.get("scale_pos_weight", 1)) > 1
    if task == "multiclass":
        return bool(hyperparams.get("class_weight_balanced"))
    return False


def _review_warnings(payload):
    return [
        flag
        for flag in (payload.get("reviewWarnings") or [])
        if isinstance(flag, dict)
    ]


def _suspicious_leakage_warning(review_warnings, metrics):
    if not any(flag.get("code") == "target_leakage" for flag in review_warnings):
        return False

    candidates = metrics.get("test") or metrics.get("val") or metrics.get("cv") or []
    for metric in candidates:
        label = str(metric.get("label", "")).lower()
        value = metric.get("value")
        if label.startswith("f1") or label in {"accuracy", "auc"}:
            try:
                if float(value) > 0.98:
                    return True
            except Exception:
                pass
    return False


def _stratify_or_none(y, min_count):
    counts = pd.Series(y).value_counts()
    return y if counts.min() >= min_count else None


def _run_summary(run):
    test_primary_metric = None
    if "test" in run["result"]["metrics"]:
        for metric in run["result"]["metrics"]["test"]:
            if metric["label"] == run["primaryMetric"]["label"]:
                test_primary_metric = metric
                break

    return {
        "runId": run["runId"],
        "timestamp": run["timestamp"],
        "target": run["target"],
        "datasetName": run.get("datasetName"),
        "excludedFeatures": run["excludedFeatures"],
        "missingStrategy": run["missingStrategy"],
        "ordering": run["ordering"],
        "timeColumn": run.get("timeColumn"),
        "resolvedTask": run["task"],
        "primaryMetric": run["primaryMetric"],
        "testPrimaryMetric": test_primary_metric,
        "bestIteration": run["bestIteration"],
        "hyperparams": run["hyperparams"],
        "validation": run["validation"],
        "cvFolds": run["cvFolds"],
        "randomState": run["randomState"],
        "pinned": run["pinned"],
        "imbalanceCorrected": run["imbalanceCorrected"],
        "reviewWarningCount": len(run.get("reviewWarnings", [])),
        "hasLeakageWarning": any(
            flag.get("severity") == "warning"
            for flag in run.get("reviewWarnings", [])
        ),
        "datasetHash": run["csv_hash"],
        "isPreviousDataset": STATE.get("dataset", {}).get("csv_hash") != run["csv_hash"],
    }


def _run_summaries():
    return [
        _run_summary(STATE["runs"][run_id])
        for run_id in reversed(STATE["order"])
        if run_id in STATE["runs"]
    ]


def _decorate_result(run, evicted_run_id=None):
    result = dict(run["result"])
    result.update({
        "runId": run["runId"],
        "activeRunId": STATE["active"],
        "runs": _run_summaries(),
    })
    if evicted_run_id is not None:
        result["evictedRunId"] = evicted_run_id
    return result


def _next_run_id():
    run_id = f"run-{STATE['next_run_number']}"
    STATE["next_run_number"] += 1
    return run_id


def _purge_unpinned_for_dataset(csv_hash):
    if STATE.get("dataset") is None or STATE["dataset"].get("csv_hash") == csv_hash:
        return

    for run_id in list(STATE["order"]):
        run = STATE["runs"].get(run_id)
        if run and not run["pinned"]:
            STATE["runs"].pop(run_id, None)
            STATE["order"].remove(run_id)


def _evict_unpinned_runs(max_unpinned=10):
    unpinned = [
        run_id
        for run_id in STATE["order"]
        if run_id in STATE["runs"] and not STATE["runs"][run_id]["pinned"]
    ]
    if len(unpinned) <= max_unpinned:
        return None

    evicted_run_id = unpinned[0]
    STATE["runs"].pop(evicted_run_id, None)
    STATE["order"].remove(evicted_run_id)
    if STATE["active"] == evicted_run_id:
        STATE["active"] = STATE["order"][-1] if STATE["order"] else None
    return evicted_run_id


def _get_run(run_id=None, allow_previous_dataset=False):
    resolved_run_id = run_id or STATE.get("active")
    if not resolved_run_id:
        raise ValueError("Train a model first")

    run = STATE["runs"].get(resolved_run_id)
    if run is None:
        raise ValueError("Run does not exist")

    if (
        not allow_previous_dataset
        and STATE.get("dataset", {}).get("csv_hash") != run["csv_hash"]
    ):
        raise ValueError("Run belongs to a previous dataset")

    return run


def train_model(payload_json):
    payload = json.loads(payload_json)
    csv_text = payload["csvText"]
    csv_hash = _csv_hash(csv_text)
    dataset_name = payload.get("datasetName")
    _purge_unpinned_for_dataset(csv_hash)
    STATE["dataset"] = {"csv_hash": csv_hash}

    df = _read_csv(csv_text)
    target = payload["target"]

    if target not in df.columns:
        raise ValueError("Target column does not exist")

    ordering = _resolve_ordering(payload.get("ordering"))
    df, time_column = _apply_time_ordering(df, ordering, payload.get("timeColumn"))
    df = df.dropna(subset=[target])
    resolved_task = _resolve_task(payload["task"], df[target])
    hyperparams = _resolve_hyperparams(payload.get("hyperparams"))
    missing_strategy = _resolve_missing_strategy(payload.get("missingStrategy"))
    review_warnings = _review_warnings(payload)
    date_transforms = payload.get("dateTransforms") or []
    (
        X,
        fields,
        category_values,
        defaults,
        excluded_features,
        missing_indicators,
    ) = _prepare_features(
        df,
        target,
        [
            *(payload.get("excludedFeatures") or []),
            *([time_column] if time_column else []),
        ],
        missing_strategy,
    )
    y_raw = df[target]
    X, y_raw = _drop_missing_rows(X, y_raw, missing_strategy)

    if len(X) < 12:
        raise ValueError("Need at least 12 usable rows for a train/test split")

    random_state = int(payload.get("randomState", 42))
    test_size = 0.2
    val_size_from_remaining = 0.25
    engine = "xgboost"
    model = _make_model(resolved_task, hyperparams, random_state)

    classes = None
    confusion = None
    proba_cache = None
    y_true_test = None
    roc_curve_rows = []
    pr_curve_rows = []
    calibration_rows = []
    imbalance = None
    visualization = {}

    if resolved_task == "regression":
        y = pd.to_numeric(y_raw, errors="coerce")
        mask = y.notna()
        X = X.loc[mask]
        y = y.loc[mask]
        if ordering == "time":
            X_train, X_val, X_test, y_train, y_val, y_test = _temporal_holdout(X, y)
        else:
            X_train_val, X_test, y_train_val, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state
            )
            X_train, X_val, y_train, y_val = train_test_split(
                X_train_val,
                y_train_val,
                test_size=val_size_from_remaining,
                random_state=random_state,
            )
        _fit_model(model, X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        val_predicted = model.predict(X_val)
        test_predicted = model.predict(X_test)
        residuals = y_test.to_numpy() - test_predicted
        metrics = {
            "val": _regression_metrics(y_val, val_predicted),
            "test": _regression_metrics(y_test, test_predicted),
        }
        visualization = {
            "actual": y_test.head(80).to_numpy(),
            "predicted": test_predicted[:80],
            "residuals": residuals[:80],
        }
    else:
        encoder = LabelEncoder()
        y = encoder.fit_transform(y_raw.astype(str))
        classes = [str(label) for label in encoder.classes_]
        if ordering == "time":
            X_train, X_val, X_test, y_train, y_val, y_test = _temporal_holdout(X, y)
        else:
            stratify = _stratify_or_none(y, 3)
            X_train_val, X_test, y_train_val, y_test = train_test_split(
                X,
                y,
                test_size=test_size,
                random_state=random_state,
                stratify=stratify,
            )
            train_val_stratify = _stratify_or_none(y_train_val, 2)
            X_train, X_val, y_train, y_val = train_test_split(
                X_train_val,
                y_train_val,
                test_size=val_size_from_remaining,
                random_state=random_state,
                stratify=train_val_stratify,
            )
        sample_weight = (
            _balanced_sample_weight(y_train)
            if hyperparams.get("class_weight_balanced")
            else None
        )
        _fit_model(
            model,
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
            sample_weight=sample_weight,
        )
        imbalance = _class_imbalance(y_train, classes)
        val_metrics, _ = _classification_metrics(model, X_val, y_val)
        test_metrics, predicted = _classification_metrics(model, X_test, y_test)
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(X_test)
            proba_cache = probabilities.tolist()
            y_true_test = [int(value) for value in y_test]
            roc_curve_rows, pr_curve_rows = _classification_curves(
                y_test,
                probabilities,
                classes,
            )
            calibration_rows = _classification_calibration(
                y_test,
                probabilities,
                classes,
            )
        metrics = {
            "val": val_metrics,
            "test": test_metrics,
        }
        confusion = confusion_matrix(y_test, predicted).tolist()

    run_id = _next_run_id()
    result = {
        "engine": engine,
        "datasetName": dataset_name,
        "target": target,
        "resolvedTask": resolved_task,
        "rowCount": int(len(df)),
        "trainRows": int(len(X_train)),
        "valRows": int(len(X_val)),
        "testRows": int(len(X_test)),
        "metrics": metrics,
        "primaryMetric": _primary_metric(metrics),
        "bestIteration": _best_iteration(model, hyperparams["n_estimators"]),
        "validation": "holdout",
        "ordering": ordering,
        "timeColumn": time_column,
        "cvFolds": None,
        "randomState": random_state,
        "hyperparams": hyperparams,
        "excludedFeatures": excluded_features,
        "missingStrategy": missing_strategy,
        "fields": fields,
        "classes": classes,
        "confusionMatrix": confusion,
        "imbalance": imbalance,
        "imbalanceCorrected": _imbalance_corrected(resolved_task, hyperparams),
        "reviewWarnings": review_warnings,
        "dateTransforms": date_transforms,
        "suspiciousLeakageWarning": _suspicious_leakage_warning(review_warnings, metrics),
        "probaCache": proba_cache,
        "rocCurve": roc_curve_rows,
        "prCurve": pr_curve_rows,
        "calibration": calibration_rows,
        "yTrueTest": y_true_test,
        "featureImportance": _importance(model, list(X.columns)),
        "shapImportance": _shap_importance(model, X_test, fields),
        "visualization": visualization,
        "defaults": defaults,
    }
    run = {
        "runId": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": model,
        "engine": engine,
        "datasetName": dataset_name,
        "target": target,
        "excludedFeatures": excluded_features,
        "missingStrategy": missing_strategy,
        "task": resolved_task,
        "fields": fields,
        "category_values": category_values,
        "defaults": defaults,
        "missing_indicators": missing_indicators,
        "classes": classes,
        "csv_hash": csv_hash,
        "pinned": False,
        "imbalanceCorrected": result["imbalanceCorrected"],
        "reviewWarnings": review_warnings,
        "dateTransforms": date_transforms,
        "primaryMetric": _primary_metric(metrics),
        "bestIteration": result["bestIteration"],
        "validation": result["validation"],
        "ordering": ordering,
        "timeColumn": time_column,
        "cvFolds": result["cvFolds"],
        "randomState": result["randomState"],
        "hyperparams": hyperparams,
        "result": result,
    }

    STATE["runs"][run_id] = run
    STATE["order"].append(run_id)
    STATE["active"] = run_id
    evicted_run_id = _evict_unpinned_runs()

    return _to_json(_decorate_result(run, evicted_run_id))


def _aggregate_cv_metrics(fold_metrics):
    labels = [metric["label"] for metric in fold_metrics[0]]
    rows = []
    for label in labels:
        values = [
            metric["value"]
            for metrics in fold_metrics
            for metric in metrics
            if metric["label"] == label
        ]
        rows.append({
            "label": label,
            "mean": float(np.mean(values)),
            "std": float(np.std(values)),
            "value": float(np.mean(values)),
        })
    return rows


def cv_train_model(payload_json):
    payload = json.loads(payload_json)
    csv_text = payload["csvText"]
    csv_hash = _csv_hash(csv_text)
    dataset_name = payload.get("datasetName")
    _purge_unpinned_for_dataset(csv_hash)
    STATE["dataset"] = {"csv_hash": csv_hash}

    df = _read_csv(csv_text)
    target = payload["target"]

    if target not in df.columns:
        raise ValueError("Target column does not exist")

    ordering = _resolve_ordering(payload.get("ordering"))
    df, time_column = _apply_time_ordering(df, ordering, payload.get("timeColumn"))
    df = df.dropna(subset=[target])
    resolved_task = _resolve_task(payload["task"], df[target])
    hyperparams = _resolve_hyperparams(payload.get("hyperparams"))
    review_warnings = _review_warnings(payload)
    date_transforms = payload.get("dateTransforms") or []
    random_state = int(payload.get("randomState", 42))
    cv_folds = max(3, min(10, int(payload.get("cvFolds", 5))))
    missing_strategy = _resolve_missing_strategy(payload.get("missingStrategy"))
    (
        X,
        fields,
        category_values,
        defaults,
        excluded_features,
        missing_indicators,
    ) = _prepare_features(
        df,
        target,
        [
            *(payload.get("excludedFeatures") or []),
            *([time_column] if time_column else []),
        ],
        missing_strategy,
    )
    y_raw = df[target]
    X, y_raw = _drop_missing_rows(X, y_raw, missing_strategy)

    if len(X) < cv_folds:
        raise ValueError("Need at least as many usable rows as CV folds")

    engine = "xgboost"
    classes = None
    confusion = None
    visualization = {}
    fold_metrics = []

    if resolved_task == "regression":
        y = pd.to_numeric(y_raw, errors="coerce")
        mask = y.notna()
        X = X.loc[mask]
        y = y.loc[mask]
        splitter = (
            TimeSeriesSplit(n_splits=cv_folds)
            if ordering == "time"
            else KFold(n_splits=cv_folds, shuffle=True, random_state=random_state)
        )

        for train_index, val_index in splitter.split(X):
            X_train = X.iloc[train_index]
            X_val = X.iloc[val_index]
            y_train = y.iloc[train_index]
            y_val = y.iloc[val_index]
            fold_model = _make_model(resolved_task, hyperparams, random_state)
            _fit_model(fold_model, X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            fold_metrics.append(_regression_metrics(y_val, fold_model.predict(X_val)))

        model = _make_model(resolved_task, hyperparams, random_state, early_stopping=False)
        _fit_model(model, X, y, verbose=False)
    else:
        encoder = LabelEncoder()
        y = encoder.fit_transform(y_raw.astype(str))
        classes = [str(label) for label in encoder.classes_]
        if ordering == "time":
            splitter = TimeSeriesSplit(n_splits=cv_folds)
        else:
            min_count = pd.Series(y).value_counts().min()
            if min_count < cv_folds:
                raise ValueError("Each class needs at least cvFolds rows for stratified CV")
            splitter = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=random_state)

        for train_index, val_index in splitter.split(X, y):
            X_train = X.iloc[train_index]
            X_val = X.iloc[val_index]
            y_train = y[train_index]
            y_val = y[val_index]
            fold_model = _make_model(resolved_task, hyperparams, random_state)
            sample_weight = (
                _balanced_sample_weight(y_train)
                if hyperparams.get("class_weight_balanced")
                else None
            )
            _fit_model(
                fold_model,
                X_train,
                y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
                sample_weight=sample_weight,
            )
            metrics, _ = _classification_metrics(fold_model, X_val, y_val)
            fold_metrics.append(metrics)

        model = _make_model(resolved_task, hyperparams, random_state, early_stopping=False)
        sample_weight = (
            _balanced_sample_weight(y)
            if hyperparams.get("class_weight_balanced")
            else None
        )
        _fit_model(model, X, y, verbose=False, sample_weight=sample_weight)

    metrics = {"cv": _aggregate_cv_metrics(fold_metrics)}
    run_id = _next_run_id()
    result = {
        "engine": engine,
        "datasetName": dataset_name,
        "target": target,
        "resolvedTask": resolved_task,
        "rowCount": int(len(df)),
        "trainRows": int(len(X)),
        "valRows": 0,
        "testRows": 0,
        "metrics": metrics,
        "primaryMetric": _primary_metric(metrics),
        "bestIteration": _best_iteration(model, hyperparams["n_estimators"]),
        "validation": "cv",
        "ordering": ordering,
        "timeColumn": time_column,
        "cvFolds": cv_folds,
        "randomState": random_state,
        "hyperparams": hyperparams,
        "excludedFeatures": excluded_features,
        "missingStrategy": missing_strategy,
        "fields": fields,
        "classes": classes,
        "confusionMatrix": confusion,
        "imbalance": None,
        "imbalanceCorrected": _imbalance_corrected(resolved_task, hyperparams),
        "reviewWarnings": review_warnings,
        "dateTransforms": date_transforms,
        "suspiciousLeakageWarning": _suspicious_leakage_warning(review_warnings, metrics),
        "probaCache": None,
        "rocCurve": [],
        "prCurve": [],
        "calibration": [],
        "yTrueTest": None,
        "featureImportance": _importance(model, list(X.columns)),
        "shapImportance": [],
        "visualization": visualization,
        "defaults": defaults,
    }
    run = {
        "runId": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": model,
        "engine": engine,
        "datasetName": dataset_name,
        "target": target,
        "excludedFeatures": excluded_features,
        "missingStrategy": missing_strategy,
        "task": resolved_task,
        "fields": fields,
        "category_values": category_values,
        "defaults": defaults,
        "missing_indicators": missing_indicators,
        "classes": classes,
        "csv_hash": csv_hash,
        "pinned": False,
        "imbalanceCorrected": result["imbalanceCorrected"],
        "reviewWarnings": review_warnings,
        "dateTransforms": date_transforms,
        "primaryMetric": _primary_metric(metrics),
        "bestIteration": result["bestIteration"],
        "validation": result["validation"],
        "ordering": ordering,
        "timeColumn": time_column,
        "cvFolds": result["cvFolds"],
        "randomState": result["randomState"],
        "hyperparams": hyperparams,
        "result": result,
    }

    STATE["runs"][run_id] = run
    STATE["order"].append(run_id)
    STATE["active"] = run_id
    evicted_run_id = _evict_unpinned_runs()

    return _to_json(_decorate_result(run, evicted_run_id))


def _prediction_frame(run, values):
    row = {}
    missing_indicators = run.get("missing_indicators", {})
    missing_strategy = run.get("missingStrategy", "native")

    for source, indicator in missing_indicators.items():
        value = values.get(source)
        row[indicator] = 1 if value is None or value == "" else 0

    for field in run["fields"]:
        name = field["name"]
        if name in missing_indicators.values():
            continue
        value = values.get(name, run["defaults"].get(name))

        if field["kind"] == "numeric":
            parsed = pd.to_numeric(pd.Series([value]), errors="coerce")[0]
            if missing_strategy in {"fill", "fill_with_indicator"} and pd.isna(parsed):
                parsed = run["defaults"].get(name)
            row[name] = parsed
        else:
            categories = run["category_values"].get(name, [])
            string_value = str(value)
            if missing_strategy in {"fill", "fill_with_indicator"} and (value is None or value == ""):
                string_value = str(run["defaults"].get(name))
            if categories and string_value not in categories:
                string_value = categories[0]
            row[name] = string_value

    X = pd.DataFrame([row])
    for name, categories in run["category_values"].items():
        X[name] = pd.Categorical(X[name].astype(str), categories=categories)

    return X


def _batch_prediction_frame(run, df):
    frame = {}
    missing_indicators = run.get("missing_indicators", {})
    missing_strategy = run.get("missingStrategy", "native")

    for source, indicator in missing_indicators.items():
        if source in df.columns:
            frame[indicator] = df[source].isna().astype(float)
        else:
            frame[indicator] = pd.Series([1.0] * len(df))

    for field in run["fields"]:
        name = field["name"]
        if name in missing_indicators.values():
            continue
        if name in df.columns:
            series = df[name]
        else:
            series = pd.Series([run["defaults"].get(name)] * len(df))

        if field["kind"] == "numeric":
            default = run["defaults"].get(name)
            numeric = pd.to_numeric(series, errors="coerce")
            if missing_strategy in {"fill", "fill_with_indicator"}:
                numeric = numeric.fillna(default)
            frame[name] = numeric
        else:
            categories = run["category_values"].get(name, [])
            default = run["defaults"].get(name)
            string_series = series.astype("string")
            if missing_strategy in {"fill", "fill_with_indicator"}:
                string_series = string_series.fillna(default)
            if categories:
                string_series = string_series.where(string_series.isin(categories), categories[0])
            frame[name] = string_series

    X = pd.DataFrame(frame)
    for name, categories in run["category_values"].items():
        X[name] = pd.Categorical(X[name].astype(str), categories=categories)

    return X


def _named_contribs(fields, values):
    return [
        {"feature": field["name"], "contribution": float(value)}
        for field, value in zip(fields, values)
    ]


def _prediction_contribs(run, X, class_index=None):
    contribs = _booster_contribs(run["model"], X)
    fields = run["fields"]

    if contribs.ndim == 3:
        classes = run.get("classes") or []
        per_class = []
        for index, row in enumerate(contribs[0]):
            per_class.append({
                "class": classes[index] if index < len(classes) else str(index),
                "bias": float(row[-1]),
                "contribs": _named_contribs(fields, row[:-1]),
            })

        selected = per_class[class_index or 0]
        return {
            "bias": selected["bias"],
            "contribs": selected["contribs"],
            "classContribs": per_class,
        }

    row = contribs[0]
    return {
        "bias": float(row[-1]),
        "contribs": _named_contribs(fields, row[:-1]),
    }


def predict_one(payload_json):
    payload = json.loads(payload_json)
    run = _get_run(payload.get("runId"))
    X = _prediction_frame(run, payload["values"])
    model = run["model"]
    task = run["task"]

    prediction = model.predict(X)[0]

    if task == "regression":
        result = {"prediction": float(prediction), "runId": run["runId"]}
        result.update(_prediction_contribs(run, X))
        return _to_json(result)

    classes = run.get("classes") or []
    class_index = int(prediction)
    label = classes[class_index] if class_index < len(classes) else str(prediction)
    result = {"prediction": label, "runId": run["runId"]}
    result.update(_prediction_contribs(run, X, class_index))

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)[0]
        top = float(np.max(probabilities))
        result["probabilities"] = sorted(
            [
                {
                    "label": classes[index] if index < len(classes) else str(index),
                    "probability": float(probability),
                    "gapToWinner": float(top - probability),
                }
                for index, probability in enumerate(probabilities)
            ],
            key=lambda row: row["probability"],
            reverse=True,
        )

    return _to_json(result)


def predict_contribs_row(payload_json):
    payload = json.loads(payload_json)
    run = _get_run(payload.get("runId"))
    X = _prediction_frame(run, payload["values"])
    result = {"runId": run["runId"]}
    result.update(_prediction_contribs(run, X))
    return _to_json(result)


def predict_batch(payload_json):
    payload = json.loads(payload_json)
    run = _get_run(payload.get("runId"))
    df = _read_csv(payload["csvText"])

    if df.empty:
        raise ValueError("Batch dataset is empty")

    model = run["model"]
    task = run["task"]
    X = _batch_prediction_frame(run, df)
    raw_predictions = model.predict(X)
    result_df = df.copy()

    prediction_column = "prediction"
    probability_column = None
    probability_columns = []
    distribution = None

    if task == "regression":
        result_df[prediction_column] = [float(value) for value in raw_predictions]
    else:
        classes = run.get("classes") or []
        labels = [
            classes[int(value)] if int(value) < len(classes) else str(value)
            for value in raw_predictions
        ]
        result_df[prediction_column] = labels
        distribution = [
            {"label": str(label), "count": int(count)}
            for label, count in result_df[prediction_column].astype(str).value_counts().items()
        ]

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(X)
            max_probabilities = np.max(probabilities, axis=1)
            probability_column = "prediction_probability"
            result_df[probability_column] = [float(value) for value in max_probabilities]

            for index in range(probabilities.shape[1]):
                label = classes[index] if index < len(classes) else str(index)
                safe_label = "".join(ch if ch.isalnum() else "_" for ch in str(label)).strip("_")
                column_name = f"probability_{safe_label or index}"
                probability_columns.append(column_name)
                result_df[column_name] = [float(value) for value in probabilities[:, index]]

    result_df = result_df.replace({np.nan: None})
    rows = result_df.to_dict(orient="records")

    return _to_json({
        "columns": [str(column) for column in result_df.columns.tolist()],
        "distribution": distribution,
        "predictionColumn": prediction_column,
        "probabilityColumn": probability_column,
        "probabilityColumns": probability_columns,
        "rowCount": int(len(result_df)),
        "rows": rows,
        "runId": run["runId"],
    })


def export_run(payload_json):
    import xgboost

    payload = json.loads(payload_json)
    run = _get_run(payload.get("runId"), allow_previous_dataset=True)
    result = run["result"]
    raw = run["model"].get_booster().save_raw(raw_format="json")
    model_json = raw.decode("utf-8") if isinstance(raw, bytes) else bytes(raw).decode("utf-8")

    metadata = {
        "schemaVersion": 1,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "engine": run["engine"],
        "task": run["task"],
        "target": run["target"],
        "classes": run.get("classes"),
        "features": run["fields"],
        "hyperparameters": run["hyperparams"],
        "missingStrategy": run["missingStrategy"],
        "ordering": run["ordering"],
        "timeColumn": run.get("timeColumn"),
        "missingIndicators": run.get("missing_indicators", {}),
        "excludedFeatures": run["excludedFeatures"],
        "datasetHash": run["csv_hash"],
        "datasetName": run.get("datasetName"),
        "metrics": result["metrics"],
        "dateTransforms": run.get("dateTransforms", []),
        "xgboostVersion": xgboost.__version__,
    }

    return _to_json({
        "modelJson": model_json,
        "metadata": metadata,
    })


def set_active_run(payload_json):
    payload = json.loads(payload_json)
    run = _get_run(payload["runId"], allow_previous_dataset=True)
    STATE["active"] = run["runId"]
    return _to_json(_decorate_result(run))


def set_run_pinned(payload_json):
    payload = json.loads(payload_json)
    run = _get_run(payload["runId"], allow_previous_dataset=True)
    run["pinned"] = bool(payload["pinned"])
    evicted_run_id = _evict_unpinned_runs()
    return _to_json(_decorate_result(_get_run(allow_previous_dataset=True), evicted_run_id))
`
