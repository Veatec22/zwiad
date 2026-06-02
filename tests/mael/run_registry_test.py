from pathlib import Path


def load_worker_namespace():
    worker_path = (
        Path(__file__).resolve().parents[2]
        / "public"
        / "playground"
        / "tools"
        / "mael"
        / "mael_worker.js"
    )
    source = worker_path.read_text(encoding="utf-8")
    marker = "const basePython = String.raw`"
    start = source.index(marker) + len(marker)
    end = source.rindex("`\n")
    namespace = {}
    exec(source[start:end], namespace)
    return namespace


def make_csv(multiplier):
    rows = ["age,income,segment,bought"]
    for index in range(40):
        age = 20 + index
        income = 3000 + (index * multiplier)
        segment = "A" if index % 2 == 0 else "B"
        bought = "yes" if index % 3 == 0 else "no"
        rows.append(f"{age},{income},{segment},{bought}")
    return "\n".join(rows)


def make_imbalanced_csv():
    rows = ["age,income,segment,bought"]
    for index in range(60):
        age = 20 + index
        income = 3000 + (index * 7)
        segment = "A" if index % 2 == 0 else "B"
        bought = "yes" if index < 6 else "no"
        rows.append(f"{age},{income},{segment},{bought}")
    return "\n".join(rows)


def make_csv_with_id_column():
    rows = ["row_id,age,income,segment,bought"]
    for index in range(40):
        age = 20 + index
        income = 3000 + (index * 10)
        segment = "A" if index % 2 == 0 else "B"
        bought = "yes" if index % 3 == 0 else "no"
        rows.append(f"id-{index},{age},{income},{segment},{bought}")
    return "\n".join(rows)


def make_csv_with_missing_values():
    rows = ["age,income,segment,bought"]
    for index in range(40):
        age = "" if index % 11 == 0 else 20 + index
        income = "" if index % 7 == 0 else 3000 + (index * 10)
        segment = "" if index % 9 == 0 else ("A" if index % 2 == 0 else "B")
        bought = "yes" if index % 3 == 0 else "no"
        rows.append(f"{age},{income},{segment},{bought}")
    return "\n".join(rows)


def make_leaky_csv():
    rows = ["age,leaky_score,bought"]
    for index in range(40):
        bought = "yes" if index % 2 == 0 else "no"
        leaky_score = 1 if bought == "yes" else 0
        rows.append(f"{20 + index},{leaky_score},{bought}")
    return "\n".join(rows)


def make_time_csv():
    rows = ["event_date,age,income,segment,bought"]
    for index in range(40):
        date = f"2024-01-{(index % 28) + 1:02d}"
        age = 20 + index
        income = 3000 + (index * 10)
        segment = "A" if index % 2 == 0 else "B"
        bought = "yes" if index > 24 else "no"
        rows.append(f"{date},{age},{income},{segment},{bought}")
    return "\n".join(rows)


def train(
    namespace,
    csv_text,
    random_state=42,
    hyperparams=None,
    validation="holdout",
    cv_folds=5,
    excluded_features=None,
    missing_strategy="native",
    review_warnings=None,
    ordering="random",
    time_column=None,
):
    return namespace["json"].loads(
        namespace["train_model"](
            namespace["json"].dumps(
                {
                    "cvFolds": cv_folds,
                    "csvText": csv_text,
                    "excludedFeatures": excluded_features or [],
                    "hyperparams": hyperparams,
                    "missingStrategy": missing_strategy,
                    "ordering": ordering,
                    "randomState": random_state,
                    "reviewWarnings": review_warnings or [],
                    "target": "bought",
                    "task": "binary",
                    "testSize": 0.2,
                    "timeColumn": time_column,
                    "validation": validation,
                }
            )
        )
    )


def test_train_model_keeps_multiple_runs_and_predicts_by_run_id():
    namespace = load_worker_namespace()

    csv_text = make_csv(10)
    first = train(namespace, csv_text, 42)
    second = train(namespace, csv_text, 7)

    assert first["runId"] != second["runId"]
    assert second["activeRunId"] == second["runId"]
    assert [run["runId"] for run in second["runs"]] == [
        second["runId"],
        first["runId"],
    ]
    assert first["runs"][0]["target"] == "bought"
    assert first["runs"][0]["primaryMetric"]["label"] == "F1 weighted"

    prediction = namespace["json"].loads(
        namespace["predict_one"](
            namespace["json"].dumps(
                {
                    "runId": first["runId"],
                    "values": {"age": 31, "income": 3300, "segment": "A"},
                }
            )
        )
    )

    assert prediction["runId"] == first["runId"]
    assert prediction["prediction"] in {"yes", "no"}
    assert prediction["bias"] is not None
    assert prediction["contribs"]
    assert {row["feature"] for row in prediction["contribs"]} == {
        "age",
        "income",
        "segment",
    }
    assert all("contribution" in row for row in prediction["contribs"])


def test_pin_run_exempts_it_from_fifo_eviction():
    namespace = load_worker_namespace()
    first = train(namespace, make_csv(10), 1)
    first_run_id = first["runId"]

    pinned = namespace["json"].loads(
        namespace["set_run_pinned"](
            namespace["json"].dumps({"runId": first_run_id, "pinned": True})
        )
    )
    assert pinned["runs"][-1]["pinned"] is True

    latest = pinned
    csv_text = make_csv(10)
    for random_state in range(2, 14):
        latest = train(namespace, csv_text, random_state)

    run_ids = [run["runId"] for run in latest["runs"]]
    assert first_run_id in run_ids
    assert len([run for run in latest["runs"] if not run["pinned"]]) <= 10


def test_train_model_stores_hyperparameter_snapshot_per_run():
    namespace = load_worker_namespace()
    hyperparams = {
        "colsample_bytree": 0.75,
        "gamma": 0.2,
        "learning_rate": 0.05,
        "max_depth": 3,
        "min_child_weight": 2,
        "n_estimators": 40,
        "reg_alpha": 0.1,
        "reg_lambda": 1.4,
        "subsample": 0.8,
    }

    result = train(namespace, make_csv(10), 42, hyperparams)

    assert result["hyperparams"] == {
        **hyperparams,
        "class_weight_balanced": False,
        "scale_pos_weight": 1.0,
    }
    assert result["runs"][0]["hyperparams"] == result["hyperparams"]


def test_train_model_uses_three_way_split_and_reports_val_test_metrics():
    namespace = load_worker_namespace()

    result = train(namespace, make_csv(10), 42, {"n_estimators": 40})

    assert result["trainRows"] == 24
    assert result["valRows"] == 8
    assert result["testRows"] == 8
    assert set(result["metrics"]) == {"test", "val"}
    assert result["metrics"]["val"][0]["label"] == "F1 weighted"
    assert result["metrics"]["test"][0]["label"] == "F1 weighted"
    assert result["primaryMetric"] == result["metrics"]["val"][0]
    assert result["bestIteration"] <= result["hyperparams"]["n_estimators"]
    assert result["runs"][0]["primaryMetric"] == result["metrics"]["val"][0]
    assert result["shapImportance"]
    assert result["shapImportance"][0]["meanAbs"] >= result["shapImportance"][-1]["meanAbs"]
    assert all(row["contributions"] for row in result["shapImportance"])
    assert result["probaCache"]
    assert result["rocCurve"]
    assert result["prCurve"]
    assert result["calibration"]
    assert result["yTrueTest"]
    assert len(result["probaCache"]) == result["testRows"]
    assert len(result["yTrueTest"]) == result["testRows"]
    assert set(result["calibration"][0]) == {
        "class",
        "fractionPositive",
        "meanPredicted",
    }
    assert len(result["calibration"][0]["meanPredicted"]) <= 10
    assert (
        len(result["calibration"][0]["meanPredicted"])
        == len(result["calibration"][0]["fractionPositive"])
    )


def test_cv_train_model_reports_fold_mean_std_and_refits_full_model():
    namespace = load_worker_namespace()

    result = namespace["json"].loads(
        namespace["cv_train_model"](
            namespace["json"].dumps(
                {
                    "cvFolds": 5,
                    "csvText": make_csv(10),
                    "hyperparams": {"n_estimators": 30},
                    "randomState": 42,
                    "target": "bought",
                    "task": "binary",
                    "validation": "cv",
                }
            )
        )
    )

    assert result["validation"] == "cv"
    assert result["cvFolds"] == 5
    assert result["trainRows"] == 40
    assert "mean" in result["metrics"]["cv"][0]
    assert "std" in result["metrics"]["cv"][0]
    assert result["runs"][0]["validation"] == "cv"
    assert result["runs"][0]["cvFolds"] == 5

    prediction = namespace["json"].loads(
        namespace["predict_one"](
            namespace["json"].dumps(
                {
                    "runId": result["runId"],
                    "values": {"age": 31, "income": 3300, "segment": "A"},
                }
            )
        )
    )

    assert prediction["prediction"] in {"yes", "no"}
    assert prediction["contribs"]


def test_predict_contribs_row_explains_one_batch_row_lazily():
    namespace = load_worker_namespace()
    result = train(namespace, make_csv(10), 42)

    explanation = namespace["json"].loads(
        namespace["predict_contribs_row"](
            namespace["json"].dumps(
                {
                    "runId": result["runId"],
                    "values": {"age": 31, "income": 3300, "segment": "A"},
                }
            )
        )
    )

    assert explanation["runId"] == result["runId"]
    assert explanation["bias"] is not None
    assert {row["feature"] for row in explanation["contribs"]} == {
        "age",
        "income",
        "segment",
    }


def test_train_model_suggests_imbalance_correction_and_marks_corrected_run():
    namespace = load_worker_namespace()
    csv_text = make_imbalanced_csv()

    result = train(namespace, csv_text, 42)

    assert result["imbalance"]["minorityClass"] == "yes"
    assert result["imbalance"]["ratio"] < 0.2
    assert result["imbalance"]["suggestedScalePosWeight"] > 1
    assert result["runs"][0]["imbalanceCorrected"] is False

    corrected = train(
        namespace,
        csv_text,
        42,
        {**result["hyperparams"], "scale_pos_weight": result["imbalance"]["suggestedScalePosWeight"]},
    )

    assert corrected["hyperparams"]["scale_pos_weight"] == result["imbalance"]["suggestedScalePosWeight"]
    assert corrected["runs"][0]["imbalanceCorrected"] is True


def test_train_model_drops_excluded_features_and_records_metadata():
    namespace = load_worker_namespace()

    result = train(
        namespace,
        make_csv_with_id_column(),
        42,
        {"n_estimators": 40},
        excluded_features=["row_id"],
    )

    assert result["excludedFeatures"] == ["row_id"]
    assert result["runs"][0]["excludedFeatures"] == ["row_id"]
    assert "row_id" not in {field["name"] for field in result["fields"]}
    assert "row_id" not in {row["feature"] for row in result["featureImportance"]}


def test_train_model_records_missing_strategy_and_adds_missing_indicators():
    namespace = load_worker_namespace()

    result = train(
        namespace,
        make_csv_with_missing_values(),
        42,
        {"n_estimators": 40},
        missing_strategy="fill_with_indicator",
    )

    field_names = {field["name"] for field in result["fields"]}
    assert result["missingStrategy"] == "fill_with_indicator"
    assert result["runs"][0]["missingStrategy"] == "fill_with_indicator"
    assert "age_was_missing" in field_names
    assert "income_was_missing" in field_names
    assert "segment_was_missing" in field_names
    assert result["defaults"]["age_was_missing"] == 0


def test_review_dataset_flags_leakage_and_train_records_active_warnings():
    namespace = load_worker_namespace()
    csv_text = make_leaky_csv()

    review = namespace["json"].loads(
        namespace["review_dataset"](
            namespace["json"].dumps(
                {
                    "csvText": csv_text,
                    "excludedFeatures": [],
                    "target": "bought",
                }
            )
        )
    )
    leakage = [flag for flag in review if flag["code"] == "target_leakage"]

    assert leakage
    assert leakage[0]["feature"] == "leaky_score"
    assert leakage[0]["severity"] == "warning"

    result = train(namespace, csv_text, 42, review_warnings=leakage)

    assert result["reviewWarnings"] == leakage
    assert result["runs"][0]["reviewWarningCount"] == len(leakage)


def test_export_run_returns_model_json_and_metadata():
    namespace = load_worker_namespace()
    result = train(namespace, make_csv(10), 42)

    exported = namespace["json"].loads(
        namespace["export_run"](
            namespace["json"].dumps({"runId": result["runId"]})
        )
    )

    assert exported["modelJson"].startswith("{")
    assert exported["metadata"]["schemaVersion"] == 1
    assert exported["metadata"]["engine"] == "xgboost"
    assert exported["metadata"]["target"] == "bought"
    assert exported["metadata"]["features"]
    assert exported["metadata"]["missingStrategy"] == result["missingStrategy"]
    assert exported["metadata"]["datasetHash"]
    assert exported["metadata"]["xgboostVersion"]


def test_time_ordering_detects_date_column_and_uses_temporal_holdout():
    namespace = load_worker_namespace()
    csv_text = make_time_csv()

    profile = namespace["json"].loads(
        namespace["profile_dataset"](
            namespace["json"].dumps({"csvText": csv_text})
        )
    )
    event_date = next(column for column in profile["columns"] if column["name"] == "event_date")
    assert event_date["dateLike"] is True

    result = train(
        namespace,
        csv_text,
        42,
        {"n_estimators": 40},
        ordering="time",
        time_column="event_date",
    )

    assert result["ordering"] == "time"
    assert result["timeColumn"] == "event_date"
    assert result["trainRows"] == 24
    assert result["valRows"] == 8
    assert result["testRows"] == 8
    assert result["runs"][0]["ordering"] == "time"
    assert "event_date" in result["excludedFeatures"]


def test_extract_date_features_adds_columns_and_profile():
    namespace = load_worker_namespace()
    extracted = namespace["json"].loads(
        namespace["extract_date_features"](
            namespace["json"].dumps(
                {
                    "column": "event_date",
                    "csvText": make_time_csv(),
                    "options": {
                        "features": ["year", "month", "dayofweek", "is_weekend"],
                        "keepOriginal": False,
                    },
                }
            )
        )
    )

    names = {column["name"] for column in extracted["profile"]["columns"]}
    assert "event_date_year" in names
    assert "event_date_month" in names
    assert "event_date_dayofweek" in names
    assert "event_date_is_weekend" in names
    assert "event_date" in names
    assert "event_date" in extracted["excludedFeatures"]


if __name__ == "__main__":
    test_train_model_keeps_multiple_runs_and_predicts_by_run_id()
    test_pin_run_exempts_it_from_fifo_eviction()
    test_train_model_stores_hyperparameter_snapshot_per_run()
    test_train_model_uses_three_way_split_and_reports_val_test_metrics()
    test_cv_train_model_reports_fold_mean_std_and_refits_full_model()
    test_predict_contribs_row_explains_one_batch_row_lazily()
    test_train_model_suggests_imbalance_correction_and_marks_corrected_run()
    test_train_model_drops_excluded_features_and_records_metadata()
    test_train_model_records_missing_strategy_and_adds_missing_indicators()
    test_review_dataset_flags_leakage_and_train_records_active_warnings()
    test_export_run_returns_model_json_and_metadata()
    test_time_ordering_detects_date_column_and_uses_temporal_holdout()
    test_extract_date_features_adds_columns_and_profile()
