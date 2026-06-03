const en = {
  nav: {
    areas: 'areas',
    playground: 'playground',
    stack: 'stack',
    contact: 'contact',
  },
  hero: {
    eyebrow: 'About me',
    title: ['I build working apps', 'on a data core.'],
    lead: 'Data engineer delivering end-to-end solutions. I specialize in SQL, data pipelines, BI and tabular ML, then ship the result as a production-ready app on GCP, Supabase or serverless.',
    quote: {
      word: 'zwiad',
      translation: '(reconnaissance)',
      pos: 'noun',
      senses: 'surveying the terrain · gathering intel',
    },
    primary: 'see playground',
    secondary: 'get in touch',
    available: 'available · Q3 2026',
    role: 'Data Engineer',
    loc: 'Katowice · remote',
    lang: 'PL · EN',
    snapshotLabel: 'Technical snapshot',
    snapshot: [
      { icon: 'primary', label: 'primary', value: 'DE · BI · ML' },
      { icon: 'secondary', label: 'secondary', value: 'Frontend · Backend' },
      { icon: 'loc', label: 'loc', value: 'Katowice · remote' },
      { icon: 'lang', label: 'lang', value: 'PL · EN' },
    ],
  },
  trusted: 'trusted by',
  areas: {
    eyebrow: 'areas',
    items: [
      {
        tag: '01',
        title: 'Data Engineering',
        description:
          'dbt models, warehouses, pipeline execution and self-service reporting for teams.',
        keywords: 'sql · dbt · bigquery',
      },
      {
        tag: '02',
        title: 'Machine Learning',
        description:
          'Churn, reactivation, VIP and AML models integrated into decision workflows.',
        keywords: 'python · scikit-learn · autogluon',
      },
      {
        tag: '03',
        title: 'Cloud',
        description:
          'Serverless workflows, IAM, secrets and GCP infrastructure managed as code.',
        keywords: 'python · gcp · terraform',
      },
      {
        tag: '04',
        title: 'Business Intelligence',
        description:
          'Turning data into dashboards, targeting, automation and product decisions.',
        keywords: 'tableau · looker studio · power bi',
      },
      {
        tag: '05',
        title: 'Frontend',
        description:
          'Internal applications for teams: operational tools, data panels and workflow interfaces.',
        keywords: 'react · typescript · tailwind',
      },
      {
        tag: '06',
        title: 'Backend',
        description:
          'Production APIs and AI agent services, from REST endpoints to agentic workflows.',
        keywords: 'fastapi · google adk · python',
      },
    ],
  },
  playground: {
    eyebrow: 'playground',
    open: 'open',
    close: 'Close playground',
    loading: 'Loading...',
    groupLabel: 'Playground categories',
    desktopBadge: 'desktop',
    desktopOnly:
      'Open this on a larger screen — the playground tools need a desktop.',
    groups: {
      pocs: 'POCs',
      dashboards: 'Dashboards',
    },
    items: [
      {
        id: 'sql-rush',
        kind: 'game',
        title: 'SQL Rush',
        description: 'A typing game with a local SQL word bank.',
        meta: 'pyodide · pyxel',
      },
      {
        id: 'sailor',
        kind: 'tool',
        title: 'Sailor',
        description:
          'A local CSV explorer with DuckDB, data profiling and an AI skeleton.',
        meta: 'duckdb wasm · openrouter · webllm',
      },
      {
        id: 'mael',
        kind: 'tool',
        title: 'MÆL',
        description:
          'Mini AutoML in the browser: CSV, XGBoost and what-if analysis.',
        meta: 'pyodide · xgboost',
      },
      {
        id: 'biwave',
        kind: 'dashboard',
        title: 'biwave',
        description:
          'A local dashboard builder with CSV, DuckDB, ECharts and grid layout.',
        meta: 'duckdb wasm · echarts',
      },
    ],
  },
  stack: {
    eyebrow: 'stack',
    search: 'search...',
    empty: 'nothing matches',
    columns: {
      name: 'tool',
      type: 'type',
      prof: 'proficiency',
    },
    filters: {
      type: 'type',
      allTypes: 'all types',
      prof: 'min {{value}}/5',
      profLabel: 'Minimum proficiency',
    },
  },
  contact: {
    eyebrow: 'contact',
    title: 'Get in touch.',
    lead: "Let's run <z>zwiad</z> in your company.",
    email: 'contact@zwiad.com',
    copied: 'copied',
    copyError: 'copy failed',
  },
  footer: {
    rights: 'all rights reserved',
    built: 'hand-built, no UI frameworks',
  },

  // biwave dashboard builder — EN only, PL falls back here via fallbackLng
  canvas: {
    empty: {
      title: 'upload data and click add element',
    },
  },
  query: {
    error: 'Query failed',
  },
  widget: {
    configure: 'Drag or double-click fields to configure this chart',
  },
  dashboard: {
    addElement: 'Add element',
    text: 'Text',
    filter: 'Filter',
    data: 'DATA',
    csv: 'CSV',
    widgetTextDefault: 'Write something...',
  },
  calculated: {
    title: 'Calculated field',
    editTitle: 'Edit calculated field',
    cancel: 'Cancel',
    name: 'Name',
    namePlaceholder: 'revenue_per_user',
    expression: 'Expression',
    expressionPlaceholder: 'revenue / NULLIF(users, 0)',
    saving: 'Saving...',
    save: 'Save',
    create: 'Add',
    add: 'Calculated',
    errors: {
      nameRequired: 'Field name is required.',
      expressionRequired: 'Expression is required.',
      semicolon: 'Semicolons are not allowed in expressions.',
      expressionOnly: 'Only a single expression is allowed.',
      syntax: 'Expression has invalid SQL syntax.',
    },
  },
  color: {
    label: 'Color',
    pickColor: 'Pick a color',
    palette: 'Palette',
    pickPalette: 'Pick a palette',
  },
  config: {
    noSelection: 'Select a chart to configure',
    selectChartType: 'Select a chart type:',
    chartType: 'Chart type',
  },
  tabs: {
    configuration: 'Settings',
    style: 'Style',
  },
  style: {
    noOptions: 'No style options for this chart type',
    borderWidth: 'Border width',
    xAxis: 'X Axis',
    yAxis: 'Y Axis',
    fontSize: 'Font Size',
    lineWidth: 'Line width',
    size: 'Size',
    title: 'Title',
    titleText: 'Text',
    background: 'Background',
    opacity: 'Opacity',
  },
  sql: {
    empty: 'Configure the chart to preview generated SQL.',
    title: 'SQL',
    copied: 'Copied',
    copyError: 'Copy failed',
    copy: 'Copy',
  },
  fields: {
    search: 'Search...',
    dimensions: 'Dimensions',
    measures: 'Measures',
    calculated: 'Calculated',
  },

  // sailor
  sailor: {
    noData: 'NO DATA',
    dropCsv:
      'Drop a CSV file here or choose one from disk. Files stay in this browser session. Current limit: {{limit}}.',
    uploadCsv: 'Upload CSV',
    addDataset: 'Add new dataset',
    sqlWorkspace: 'SQL workspace',
    queryTable: 'Query table',
    run: 'Run',
    ai: 'AI',
    queryResults: 'Query results',
    queryPlaceholder: 'Run a query to populate results.',
    rows: 'Rows',
    exportCsv: 'Export CSV',
    noQueryResults: 'No query results',
    datasetLoaded:
      'The dataset is loaded. Write a SQL query and run it when you want to inspect rows.',
    queryNoRows: 'Query returned no rows.',
    page: 'Page {{current}} / {{total}}',
    prev: 'Prev',
    next: 'Next',
    aiProvider: 'AI provider',
    aiModel: 'AI model',
    freeModel: 'AI model',
    loadingModels: 'Loading models...',
    noModels: 'No models available',
    closeAi: 'Close AI assistant',
    startChat: 'Write question to start chat',
    thinking: 'Thinking',
    sendQuestion: 'Send question',
    connectOpenRouter: 'Connect OpenRouter',
    openRouterAuthHint:
      'Connect your OpenRouter account or paste your own API key. The key stays in this browser.',
    openRouterConnected: 'OpenRouter connected',
    pasteOpenRouterKey: 'Paste API key',
    saveKey: 'Save',
    forgetKey: 'Forget',
    providers: {
      openrouter: 'OpenRouter',
      webllm: 'WebLLM (local)',
    },
    errors: {
      csvTooLarge: 'CSV is too large. Current limit is {{limit}}.',
      csvOnly: 'Only CSV files are supported in this POC.',
      queryFirst: 'Write a SQL query first.',
      queryFailed: 'Query failed',
      aiFailed: 'AI analysis failed',
      modelsFailed: 'Failed to load models',
      datasetFailed: 'Failed to load dataset',
      openRouterAuthFailed: 'OpenRouter authorization failed',
    },
  },

  // mael
  mael: {
    dataset: 'Dataset',
    uploadCsv: 'Upload CSV',
    loadSample: 'Load sample',
    uploadHint: 'Files never leave the browser. Current CSV limit: {{limit}}.',
    samples: {
      title: 'Sample datasets',
      trapReveal:
        'Trap revealed: this sample includes a unique ID and a target-leaking score. Exclude flagged features and retrain to see the honest metric drop.',
    },
    trainingSetup: 'Training setup',
    target: 'Target',
    task: 'Task',
    taskAuto: 'Auto detect',
    taskBinary: 'Binary',
    taskMulticlass: 'Multiclass',
    taskRegression: 'Regression',
    targetTypeHint:
      'Auto infers the target type from the selected column. Overrides force binary, multiclass, or regression training.',
    targetBadge: 'Target',
    likelyId: 'Likely ID',
    dateLike: 'date?',
    useAsFeature: 'Use {{column}} as feature',
    missingSummary: 'Total missing cells: {{total}} across {{columns}} columns',
    missingCount: '{{count}} missing',
    missingValues: 'Missing values',
    missingStrategies: {
      native: 'XGBoost native',
      drop_rows: 'Drop rows with NaN',
      fill: 'Fill median (num) + mode (cat)',
      fill_with_indicator: 'Fill + missing indicator',
      short: {
        native: 'native missing',
        drop_rows: 'drop missing',
        fill: 'fill missing',
        fill_with_indicator: 'fill + indicators',
      },
    },
    dataReview: {
      title: 'Data review ({{count}} active)',
      exclude: 'Exclude',
      dismiss: 'Dismiss',
      empty: 'All review flags are dismissed or excluded.',
    },
    dateExtraction: {
      title: 'Extract date features',
      extract: 'Extract date features',
      features: 'Generate which features?',
      keepOriginal: 'Keep original date column?',
      keep: 'Keep',
      drop: 'Drop',
      apply: 'Apply extraction',
      options: {
        year: 'year',
        month: 'month',
        day: 'day',
        dayofweek: 'dayofweek',
        hour: 'hour',
        is_weekend: 'is_weekend',
      },
    },
    trainedWithWarnings: 'trained with {{count}} warnings',
    suspiciousLeakageWarning:
      'Metrics suspiciously high - leakage suspect feature was used.',
    targetOverrideWarnings: {
      binary:
        'Binary target override needs exactly 2 target values. Pick Auto or Multiclass for this column.',
      multiclass:
        'Multiclass override expects at least 3 target values. Pick Auto or Binary for this column.',
      regression:
        'Regression override expects a numeric target column. Pick Auto or a classification type for this column.',
    },
    testSplit: 'Test split: {{pct}}%',
    trainModel: 'Train model',
    leaderboard: 'Leaderboard',
    activeRun: 'Active',
    pinRun: 'Pin',
    unpinRun: 'Unpin',
    cloneParams: 'Clone params',
    downloadBundle: 'Download bundle',
    previousDataset: 'Previous dataset',
    previousDatasetDisabled:
      'This run was trained on a previous dataset. Diagnostics remain visible, but prediction is disabled until you activate a run from the current dataset.',
    datasetSwitchConfirm:
      'Switch dataset? Unpinned runs may be purged on the next training run. Pinned runs stay in the leaderboard.',
    noMetric: 'No metric',
    deltaVsActive: 'Delta vs active run',
    deltaDifferentValidation: 'Different validation regime — not comparable',
    deltaRandomStateWarning: 'Random state differs; compare carefully.',
    imbalanceBadge: 'Imbalance: {{ratio}}:1',
    imbalanceHint:
      'Strong class imbalance can make aggregate metrics look healthy while the minority class is missed. Apply the suggestion, retrain, then compare the run.',
    applyScalePosWeight: 'Apply scale_pos_weight = {{value}}',
    applyClassWeightBalanced: 'Apply class_weight = balanced',
    imbalanceCorrected: 'imbalance-corrected',
    randomState: 'Random state',
    randomStateHint: 'Seed used for reproducible splits and model training.',
    validation: {
      title: 'Validation',
      holdout: 'Holdout',
      cv: 'CV',
      cvFolds: 'CV folds: {{count}}',
      largeDatasetWarning:
        'CV runs {{folds}}x training time — this may take a few minutes.',
    },
    ordering: {
      title: 'Ordering',
      random: 'Random',
      time: 'Time',
      timeColumn: 'Time column',
      timeOrdered: 'Time-ordered',
      timeImbalanceWarning:
        'Time-ordered CV cannot stratify - per-fold metrics may be noisy, especially early folds with few minority-class examples.',
    },
    hyperparams: {
      title: 'Hyperparameters',
      snapshot: 'Hyperparameter snapshot',
      presets: {
        conservative: 'Conservative',
        balanced: 'Balanced',
        aggressive: 'Aggressive',
      },
      groups: {
        boosting: 'Boosting',
        tree: 'Tree structure',
        sampling: 'Sampling',
        regularization: 'Regularization',
      },
      tooltips: {
        n_estimators:
          'Number of boosting rounds; ignored if early stopping triggers.',
        learning_rate:
          'Smaller values learn slower and usually need more trees.',
        max_depth:
          'Maximum tree depth; higher values model sharper interactions.',
        min_child_weight:
          'Minimum child weight; higher values make splits more conservative.',
        gamma: 'Minimum loss reduction required to create a split.',
        subsample: 'Fraction of rows sampled for each tree.',
        colsample_bytree: 'Fraction of feature columns sampled for each tree.',
        reg_alpha: 'L1 regularization strength.',
        reg_lambda: 'L2 regularization strength.',
        scale_pos_weight:
          'Binary class weighting. Use roughly majority/minority class count for imbalanced data.',
      },
      classWeightBalanced: 'class_weight = balanced',
    },
    featureImportance: 'Feature importance',
    importanceView: {
      shap: 'SHAP',
      gain: 'Gain',
    },
    shapImportanceTooltip:
      'Mean |contribution| across test set. Larger = greater average impact on predictions.',
    trainHelp:
      'Upload a dataset, choose a target column and train a compact model. The first run downloads Pyodide and ML wheels, so it can take a moment.',
    singlePrediction: 'Single row prediction',
    predict: 'Predict',
    predictionLabel: 'Prediction',
    trainFirst:
      'Train a model first. This panel will mirror the feature schema and run a single-row prediction with your custom values.',
    regressionPlot: 'Regression plot',
    noRegressionPoints: 'No regression diagnostic points available.',
    confusionMatrix: 'Confusion matrix',
    classificationDiagnostics: 'Classification diagnostics',
    thresholdValue: 'Threshold: {{value}}',
    rocReference: 'Random baseline',
    calibrationReference: 'Perfect calibration',
    calibrationMeanPredicted: 'Mean predicted',
    calibrationFractionPositive: 'Observed frequency',
    calibrationHint:
      'A well-calibrated model sits on the diagonal: when it predicts 80%, about 80% of those cases are positive.',
    prCurveHint:
      'PR curve is more informative than ROC when classes are imbalanced.',
    multiclassThresholdHint:
      'Threshold tuning applies to binary tasks. For multiclass, predictions use argmax over class probabilities.',
    noCalibration: 'No calibration data available for this run.',
    noConfusionMatrix: 'No confusion matrix available for this run.',
    classProbabilities: 'Class probabilities',
    localContribs: 'Local contributions',
    localContribsClassification:
      'Log-odds — positive values push the prediction toward {{label}}.',
    localContribsRegression:
      'Target units — positive values push the prediction upward.',
    batchPrediction: 'Batch prediction',
    uploadBatchCsv: 'Upload batch CSV',
    batchHint:
      'The CSV should contain the same feature columns used during training. Extra columns are preserved in the output.',
    batchFile: 'Batch file',
    predictionSplit: 'Prediction split',
    batchDistributionHint:
      'Batch distribution chart is available for classification models.',
    batchOutput: 'Batch output',
    explain: 'Explain',
    explainRow: 'Explain row',
    csv: 'CSV',
    truncatedHint: 'Showing first 80 rows. CSV export contains the full batch.',
    tabs: {
      whatIf: 'What-if',
      batch: 'Batch',
      confusion: 'Confusion',
      threshold: 'Threshold',
      roc: 'ROC',
      pr: 'PR',
      calibration: 'Calibration',
    },
    chart: {
      actual: 'Actual',
      predicted: 'Predicted',
    },
    metrics: {
      task: 'Task',
      trainRows: 'Train rows',
      valRows: 'Val rows',
      testRows: 'Test rows',
      bestIteration: 'Early stopping',
      bestIterationValue: 'Stopped at {{best}} / max {{max}}',
      primaryMetric: 'Primary metric',
      val: 'Validation metrics',
      test: 'Test metrics',
      cv: 'CV metrics',
      precision: 'Precision',
      recall: 'Recall',
      f1: 'F1',
      rows: 'Rows',
      columns: 'Columns',
      outputColumns: 'Output columns',
    },
    errors: {
      profileFailed: 'Could not profile dataset',
      sampleFailed: 'Could not load sample dataset',
      exportFailed: 'Could not export run bundle',
      dateExtractionFailed: 'Could not extract date features',
      csvLimit: 'CSV limit is {{limit}} for this POC.',
      csvOnly: 'Only CSV files are supported in this POC.',
      trainingFailed: 'Training failed',
      predictionFailed: 'Prediction failed',
      batchFailed: 'Batch prediction failed',
      runFailed: 'Run action failed',
    },
    status: {
      loading: 'Loading Pyodide and profiling dataset...',
      loaded: 'Loaded {{rows}} rows x {{cols}} columns.',
      training: 'Loading XGBoost and training in the browser...',
      trained:
        'Trained {{engine}} on {{trainRows}} rows, validated on {{valRows}}, tested on {{testRows}}.',
      predicted: 'Predicted {{count}} batch rows from {{file}}.',
      evicted: 'Run {{runId}} evicted, pin to retain.',
      delta:
        '{{label}} {{delta}} vs previous Run ({{previousRun}}: {{previousValue}} -> {{nextRun}}: {{nextValue}}).',
      deltaNotComparable: 'Metric delta unavailable: runs are not comparable.',
      deltaRandomStateWarning: 'Random state differs; compare carefully.',
    },
  },
} as const

export default en
