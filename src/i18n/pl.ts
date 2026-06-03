const pl = {
  nav: {
    areas: 'obszary',
    playground: 'playground',
    stack: 'stack',
    contact: 'kontakt',
  },
  hero: {
    eyebrow: 'O mnie',
    title: ['Z danych buduję', 'działające aplikacje.'],
    lead: 'Inżynier danych dostarczający rozwiązania end-to-end. Specjalizuję się w SQL, potokach danych, BI i tabelarycznym ML, a efekt dowożę jako gotową aplikację — na GCP, Supabase lub w architekturze serverless.',
    quote: {
      word: 'zwiad',
      translation: '',
      pos: 'rzecz.',
      senses: 'rozpoznanie terenu · zbieranie informacji',
    },
    primary: 'zobacz playground',
    secondary: 'napisz do mnie',
    available: 'available · Q3 2026',
    role: 'Data Engineer',
    loc: 'Katowice · remote',
    lang: 'PL · EN',
    snapshotLabel: 'Techniczny snapshot',
    snapshot: [
      { icon: 'primary', label: 'primary', value: 'DE · BI · ML' },
      { icon: 'secondary', label: 'secondary', value: 'Frontend · Backend' },
      { icon: 'loc', label: 'loc', value: 'Katowice · remote' },
      { icon: 'lang', label: 'lang', value: 'PL · EN' },
    ],
  },
  trusted: 'trusted by',
  areas: {
    eyebrow: 'obszary',
    items: [
      {
        tag: '01',
        title: 'Data Engineering',
        description:
          'Modele dbt, hurtownie danych, pipeline execution i self-service reporting dla zespołów.',
        keywords: 'sql · dbt · bigquery',
      },
      {
        tag: '02',
        title: 'Machine Learning',
        description:
          'Modele churn, reactivation, VIP i AML włączone w procesy decyzyjne.',
        keywords: 'python · scikit-learn · autogluon',
      },
      {
        tag: '03',
        title: 'Cloud',
        description:
          'Serverless workflow, IAM, sekrety i infrastruktura GCP utrzymywana jako kod.',
        keywords: 'python · gcp · terraform',
      },
      {
        tag: '04',
        title: 'Business Intelligence',
        description:
          'Przekładanie danych na dashboardy, targeting, automatyzacje i decyzje produktowe.',
        keywords: 'tableau · looker studio · power bi',
      },
      {
        tag: '05',
        title: 'Frontend',
        description:
          'Aplikacje wewnętrzne dla zespołów: narzędzia operacyjne, panele danych i interfejsy do workflow.',
        keywords: 'react · typescript · tailwind',
      },
      {
        tag: '06',
        title: 'Backend',
        description:
          'Produkcyjne API i serwisy agentów AI, od endpointów REST po agentic workflows.',
        keywords: 'fastapi · google adk · python',
      },
    ],
  },
  playground: {
    eyebrow: 'playground',
    open: 'otwórz',
    close: 'Zamknij playground',
    loading: 'Ładowanie...',
    groupLabel: 'Kategorie playgroundu',
    desktopBadge: 'desktop',
    desktopOnly:
      'Otwórz na większym ekranie — narzędzia playgroundu wymagają komputera.',
    groups: {
      pocs: 'POCs',
      dashboards: 'Dashboards',
    },
    items: [
      {
        id: 'sql-rush',
        kind: 'gra',
        title: 'SQL Rush',
        description: 'Typing game z lokalnym bankiem słów SQL.',
        meta: 'pyodide · pyxel',
      },
      {
        id: 'sailor',
        kind: 'tool',
        title: 'Sailor',
        description:
          'Lokalny eksplorator CSV z DuckDB, profilem danych i szkieletem AI.',
        meta: 'duckdb wasm · openrouter · webllm',
      },
      {
        id: 'mael',
        kind: 'tool',
        title: 'MÆL',
        description:
          'Mini AutoML w przeglądarce: CSV, XGBoost i panel what-if.',
        meta: 'pyodide · xgboost',
      },
      {
        id: 'biwave',
        kind: 'dashboard',
        title: 'biwave',
        description:
          'Lokalny builder dashboardów: CSV, DuckDB, ECharts i grid layout.',
        meta: 'duckdb wasm · echarts',
      },
    ],
  },
  stack: {
    eyebrow: 'stack',
    search: 'szukaj...',
    empty: 'nic nie pasuje do',
    columns: {
      name: 'narzędzie',
      type: 'typ',
      prof: 'biegłość',
    },
    filters: {
      type: 'typ',
      allTypes: 'wszystkie typy',
      prof: 'min {{value}}/5',
      profLabel: 'Minimalna biegłość',
    },
  },
  contact: {
    eyebrow: 'kontakt',
    title: 'Napisz do mnie.',
    lead: 'Zróbmy <z>zwiad</z> w Twojej firmie.',
    email: 'contact@zwiad.com',
    copied: 'skopiowano',
    copyError: 'błąd kopiowania',
  },
  footer: {
    rights: 'wszystkie prawa zarezerwowane',
    built: 'zbudowane ręcznie, bez frameworków UI',
  },

  // biwave dashboard builder
  canvas: {
    empty: { title: 'wgraj dane i kliknij dodaj element' },
  },
  query: { error: 'Błąd zapytania' },
  widget: {
    configure:
      'Przeciągnij lub kliknij dwukrotnie pola, aby skonfigurować wykres',
  },
  dashboard: {
    addElement: 'Dodaj element',
    text: 'Tekst',
    filter: 'Filtr',
    data: 'DANE',
    csv: 'CSV',
    widgetTextDefault: 'Napisz coś...',
  },
  calculated: {
    title: 'Pole obliczane',
    editTitle: 'Edytuj pole obliczane',
    cancel: 'Anuluj',
    name: 'Nazwa',
    namePlaceholder: 'revenue_per_user',
    expression: 'Wyrażenie',
    expressionPlaceholder: 'revenue / NULLIF(users, 0)',
    saving: 'Zapisywanie...',
    save: 'Zapisz',
    create: 'Dodaj',
    add: 'Obliczane',
    errors: {
      nameRequired: 'Nazwa pola jest wymagana.',
      expressionRequired: 'Wyrażenie jest wymagane.',
      semicolon: 'Średniki nie są dozwolone w wyrażeniach.',
      expressionOnly: 'Dozwolone jest tylko jedno wyrażenie.',
      syntax: 'Wyrażenie zawiera niepoprawną składnię SQL.',
    },
  },
  color: {
    label: 'Kolor',
    pickColor: 'Wybierz kolor',
    palette: 'Paleta',
    pickPalette: 'Wybierz paletę',
  },
  config: {
    noSelection: 'Wybierz wykres do konfiguracji',
    selectChartType: 'Wybierz typ wykresu:',
    chartType: 'Typ wykresu',
  },
  tabs: {
    configuration: 'Ustawienia',
    style: 'Styl',
  },
  style: {
    noOptions: 'Brak opcji stylu dla tego wykresu',
    borderWidth: 'Szerokość obramowania',
    xAxis: 'Oś X',
    yAxis: 'Oś Y',
    fontSize: 'Rozmiar czcionki',
    lineWidth: 'Szerokość linii',
    size: 'Rozmiar',
    title: 'Tytuł',
    titleText: 'Tekst',
    background: 'Tło',
    opacity: 'Przezroczystość',
  },
  sql: {
    empty: 'Skonfiguruj wykres, aby podejrzeć generowany SQL.',
    title: 'SQL',
    copied: 'Skopiowano',
    copyError: 'Kopiowanie nie powiodło się',
    copy: 'Kopiuj',
  },
  fields: {
    search: 'Szukaj...',
    dimensions: 'Wymiary',
    measures: 'Miary',
    calculated: 'Obliczane',
  },

  // sailor
  sailor: {
    noData: 'BRAK DANYCH',
    dropCsv:
      'Upuść plik CSV tutaj lub wybierz z dysku. Pliki pozostają w tej sesji przeglądarki. Aktualny limit: {{limit}}.',
    uploadCsv: 'Wgraj CSV',
    addDataset: 'Dodaj kolejny dataset',
    sqlWorkspace: 'SQL workspace',
    queryTable: 'Tabela:',
    run: 'Uruchom',
    ai: 'AI',
    queryResults: 'Wyniki zapytania',
    queryPlaceholder: 'Uruchom zapytanie, żeby zobaczyć wyniki.',
    rows: 'Wiersze',
    exportCsv: 'Eksportuj CSV',
    noQueryResults: 'Brak wyników',
    datasetLoaded:
      'Dataset załadowany. Napisz zapytanie SQL i uruchom je, żeby przeglądać wiersze.',
    queryNoRows: 'Zapytanie nie zwróciło wierszy.',
    page: 'Strona {{current}} / {{total}}',
    prev: 'Poprz.',
    next: 'Nast.',
    aiProvider: 'Dostawca AI',
    aiModel: 'Model AI',
    freeModel: 'Model AI',
    loadingModels: 'Ładowanie modeli...',
    noModels: 'Brak dostępnych modeli',
    closeAi: 'Zamknij asystenta AI',
    startChat: 'Napisz pytanie, żeby rozpocząć czat',
    thinking: 'Myślę...',
    sendQuestion: 'Wyślij pytanie',
    connectOpenRouter: 'Połącz OpenRouter',
    openRouterAuthHint:
      'Połącz konto OpenRouter albo wklej własny API key. Klucz zostaje w tej przeglądarce.',
    openRouterConnected: 'OpenRouter połączony',
    pasteOpenRouterKey: 'Wklej API key',
    saveKey: 'Zapisz',
    forgetKey: 'Zapomnij',
    providers: {
      openrouter: 'OpenRouter',
      webllm: 'WebLLM (lokalnie)',
    },
    errors: {
      csvTooLarge: 'Plik CSV jest za duży. Aktualny limit: {{limit}}.',
      csvOnly: 'Tylko pliki CSV są obsługiwane w tym POC.',
      queryFirst: 'Najpierw napisz zapytanie SQL.',
      queryFailed: 'Błąd zapytania',
      aiFailed: 'Analiza AI nie powiodła się',
      modelsFailed: 'Nie udało się załadować modeli',
      datasetFailed: 'Nie udało się załadować datasetu',
      openRouterAuthFailed: 'Autoryzacja OpenRouter nie powiodła się',
    },
  },

  // mael
  mael: {
    dataset: 'Dataset',
    uploadCsv: 'Wgraj CSV',
    loadSample: 'Wczytaj sample',
    uploadHint: 'Pliki nie opuszczają przeglądarki. Limit CSV: {{limit}}.',
    samples: {
      title: 'Sample datasety',
      trapReveal:
        'Trap ujawniony: ten sample zawiera unikalne ID i score przeciekający target. Wyklucz oflagowane cechy i trenuj ponownie, żeby zobaczyć spadek uczciwej metryki.',
    },
    trainingSetup: 'Konfiguracja treningu',
    target: 'Cel',
    task: 'Zadanie',
    taskAuto: 'Auto detect',
    taskBinary: 'Binarny',
    taskMulticlass: 'Wieloklasowy',
    taskRegression: 'Regresja',
    targetTypeHint:
      'Auto wykrywa typ targetu z wybranej kolumny. Override wymusza binary, multiclass albo regression.',
    targetBadge: 'Target',
    likelyId: 'Likely ID',
    dateLike: 'date?',
    useAsFeature: 'Użyj {{column}} jako cechy',
    missingSummary: 'Brakujące komórki: {{total}} w {{columns}} kolumnach',
    missingCount: '{{count}} missing',
    missingValues: 'Braki danych',
    missingStrategies: {
      native: 'XGBoost native',
      drop_rows: 'Usuń wiersze z NaN',
      fill: 'Uzupełnij medianą (num) + modą (cat)',
      fill_with_indicator: 'Uzupełnij + missing indicator',
      short: {
        native: 'native missing',
        drop_rows: 'drop missing',
        fill: 'fill missing',
        fill_with_indicator: 'fill + indicators',
      },
    },
    dataReview: {
      title: 'Data review ({{count}} aktywne)',
      exclude: 'Wyklucz',
      dismiss: 'Ukryj',
      empty: 'Wszystkie flagi review są ukryte albo wykluczone.',
    },
    dateExtraction: {
      title: 'Extract date features',
      extract: 'Extract date features',
      features: 'Które cechy wygenerować?',
      keepOriginal: 'Zostawić oryginalną kolumnę daty?',
      keep: 'Zostaw',
      drop: 'Drop',
      apply: 'Zastosuj ekstrakcję',
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
      'Metryki podejrzanie wysokie - użyto cechy podejrzanej o leakage.',
    targetOverrideWarnings: {
      binary:
        'Override binary wymaga dokładnie 2 wartości targetu. Wybierz Auto albo Multiclass dla tej kolumny.',
      multiclass:
        'Override multiclass oczekuje co najmniej 3 wartości targetu. Wybierz Auto albo Binary dla tej kolumny.',
      regression:
        'Override regression oczekuje numerycznej kolumny targetu. Wybierz Auto albo typ klasyfikacyjny dla tej kolumny.',
    },
    testSplit: 'Test split: {{pct}}%',
    trainModel: 'Trenuj model',
    leaderboard: 'Leaderboard',
    activeRun: 'Aktywny',
    pinRun: 'Przypnij',
    unpinRun: 'Odepnij',
    cloneParams: 'Klonuj parametry',
    downloadBundle: 'Pobierz bundle',
    previousDataset: 'Poprzedni dataset',
    previousDatasetDisabled:
      'Ten run był trenowany na poprzednim datasecie. Diagnostyka zostaje widoczna, ale predykcja jest wyłączona do aktywacji runu z bieżącego datasetu.',
    datasetSwitchConfirm:
      'Zmienić dataset? Nieprzypięte runy mogą zostać wyczyszczone przy następnym treningu. Przypięte zostaną w leaderboardzie.',
    noMetric: 'Brak metryki',
    deltaVsActive: 'Delta vs aktywny run',
    deltaDifferentValidation: 'Inny reżim walidacji - nieporównywalne',
    deltaRandomStateWarning: 'Random state jest inny; porównuj ostrożnie.',
    imbalanceBadge: 'Imbalance: {{ratio}}:1',
    imbalanceHint:
      'Silny imbalance klas może ukryć problemy z klasą mniejszościową w metrykach łącznych. Zastosuj sugestię, wytrenuj ponownie i porównaj run.',
    applyScalePosWeight: 'Ustaw scale_pos_weight = {{value}}',
    applyClassWeightBalanced: 'Ustaw class_weight = balanced',
    imbalanceCorrected: 'imbalance-corrected',
    randomState: 'Random state',
    randomStateHint: 'Seed dla powtarzalnych splitów i treningu modelu.',
    validation: {
      title: 'Walidacja',
      holdout: 'Holdout',
      cv: 'CV',
      cvFolds: 'Foldy CV: {{count}}',
      largeDatasetWarning:
        'CV uruchamia trening {{folds}}x dłużej - to może potrwać kilka minut.',
    },
    ordering: {
      title: 'Ordering',
      random: 'Random',
      time: 'Time',
      timeColumn: 'Kolumna czasu',
      timeOrdered: 'Time-ordered',
      timeImbalanceWarning:
        'Time-ordered CV nie może stratyfikować - metryki per fold mogą być szumne, szczególnie wczesne foldy z małą liczbą klasy mniejszościowej.',
    },
    hyperparams: {
      title: 'Hyperparametry',
      snapshot: 'Snapshot hyperparametrów',
      presets: {
        conservative: 'Conservative',
        balanced: 'Balanced',
        aggressive: 'Aggressive',
      },
      groups: {
        boosting: 'Boosting',
        tree: 'Struktura drzewa',
        sampling: 'Sampling',
        regularization: 'Regularyzacja',
      },
      tooltips: {
        n_estimators:
          'Liczba rund boostingu; ignorowana, jeśli zadziała early stopping.',
        learning_rate:
          'Mniejsze wartości uczą wolniej i zwykle wymagają więcej drzew.',
        max_depth:
          'Maksymalna głębokość drzewa; wyższa łapie mocniejsze interakcje.',
        min_child_weight:
          'Minimalna waga dziecka; wyższa wartość robi bardziej konserwatywne splity.',
        gamma: 'Minimalna redukcja straty wymagana do utworzenia splitu.',
        subsample: 'Odsetek wierszy próbkowany dla każdego drzewa.',
        colsample_bytree: 'Odsetek cech próbkowany dla każdego drzewa.',
        reg_alpha: 'Siła regularyzacji L1.',
        reg_lambda: 'Siła regularyzacji L2.',
        scale_pos_weight:
          'Ważenie klas binarnych. Dla imbalance użyj w przybliżeniu liczba większości / liczba mniejszości.',
      },
      classWeightBalanced: 'class_weight = balanced',
    },
    featureImportance: 'Ważność cech',
    importanceView: {
      shap: 'SHAP',
      gain: 'Gain',
    },
    shapImportanceTooltip:
      'Średnia |kontrybucja| na secie testowym. Więcej = większy średni wpływ na predykcję.',
    trainHelp:
      'Wgraj dataset, wybierz kolumnę docelową i wytrenuj kompaktowy model. Pierwsze uruchomienie pobiera Pyodide i biblioteki ML, więc może chwilę potrwać.',
    singlePrediction: 'Predykcja pojedynczego wiersza',
    predict: 'Przewiduj',
    predictionLabel: 'Predykcja',
    trainFirst:
      'Najpierw wytrenuj model. Ten panel odwzoruje schemat cech i uruchomi predykcję dla pojedynczego wiersza z Twoimi wartościami.',
    regressionPlot: 'Wykres regresji',
    noRegressionPoints: 'Brak punktów diagnostycznych regresji.',
    confusionMatrix: 'Macierz pomyłek',
    classificationDiagnostics: 'Diagnostyka klasyfikacji',
    thresholdValue: 'Threshold: {{value}}',
    rocReference: 'Losowy baseline',
    calibrationReference: 'Idealna kalibracja',
    calibrationMeanPredicted: 'Średnia predykcja',
    calibrationFractionPositive: 'Zaobserwowana częstość',
    calibrationHint:
      'Dobrze skalibrowany model leży na przekątnej: gdy przewiduje 80%, około 80% tych przypadków jest pozytywna.',
    prCurveHint:
      'Krzywa PR jest bardziej informatywna niż ROC przy niezbalansowanych klasach.',
    multiclassThresholdHint:
      'Threshold tuning dotyczy zadań binarnych. Dla multiclass predykcja używa argmax po prawdopodobieństwach klas.',
    noCalibration: 'Brak danych kalibracji dla tego uruchomienia.',
    noConfusionMatrix: 'Brak macierzy pomyłek dla tego uruchomienia.',
    classProbabilities: 'Prawdopodobieństwa klas',
    localContribs: 'Lokalne kontrybucje',
    localContribsClassification:
      'Log-odds - dodatnie wartości przesuwają predykcję w stronę {{label}}.',
    localContribsRegression:
      'Jednostki targetu - dodatnie wartości przesuwają predykcję w górę.',
    batchPrediction: 'Predykcja wsadowa',
    uploadBatchCsv: 'Wgraj CSV wsadowy',
    batchHint:
      'CSV powinien zawierać te same kolumny cech co podczas treningu. Dodatkowe kolumny są zachowane w wyniku.',
    batchFile: 'Plik wsadowy',
    predictionSplit: 'Rozkład predykcji',
    batchDistributionHint:
      'Wykres rozkładu dostępny dla modeli klasyfikacyjnych.',
    batchOutput: 'Wynik wsadowy',
    explain: 'Wyjaśnij',
    explainRow: 'Wyjaśnij wiersz',
    csv: 'CSV',
    truncatedHint:
      'Pokazuję pierwsze 80 wierszy. Eksport CSV zawiera pełną partię.',
    tabs: {
      whatIf: 'What-if',
      batch: 'Wsadowa',
      confusion: 'Confusion',
      threshold: 'Threshold',
      roc: 'ROC',
      pr: 'PR',
      calibration: 'Kalibracja',
    },
    chart: {
      actual: 'Rzeczywiste',
      predicted: 'Przewidywane',
    },
    metrics: {
      task: 'Zadanie',
      trainRows: 'Wiersze treningu',
      valRows: 'Wiersze walidacji',
      testRows: 'Wiersze testu',
      bestIteration: 'Early stopping',
      bestIterationValue: 'Stop na {{best}} / max {{max}}',
      primaryMetric: 'Metryka główna',
      val: 'Metryki walidacji',
      test: 'Metryki testu',
      cv: 'Metryki CV',
      precision: 'Precision',
      recall: 'Recall',
      f1: 'F1',
      rows: 'Wiersze',
      columns: 'Kolumny',
      outputColumns: 'Kolumny wyjściowe',
    },
    errors: {
      profileFailed: 'Profilowanie datasetu nie powiodło się',
      sampleFailed: 'Nie udało się wczytać sample datasetu',
      exportFailed: 'Nie udało się wyeksportować bundle runu',
      dateExtractionFailed: 'Nie udało się wyekstrahować cech daty',
      csvLimit: 'Limit CSV to {{limit}} dla tego POC.',
      csvOnly: 'Tylko pliki CSV są obsługiwane w tym POC.',
      trainingFailed: 'Trening nie powiódł się',
      predictionFailed: 'Predykcja nie powiodła się',
      batchFailed: 'Predykcja wsadowa nie powiodła się',
      runFailed: 'Operacja na runie nie powiodła się',
    },
    status: {
      loading: 'Ładowanie Pyodide i profilowanie datasetu...',
      loaded: 'Załadowano {{rows}} wierszy x {{cols}} kolumn.',
      training: 'Ładowanie XGBoost i trening w przeglądarce...',
      trained:
        'Wytrenowano {{engine}} na {{trainRows}} wierszach, walidowano na {{valRows}}, testowano na {{testRows}}.',
      predicted: 'Przewidziano {{count}} wierszy z {{file}}.',
      evicted: 'Run {{runId}} został usunięty, przypnij run, aby go zachować.',
      delta:
        '{{label}} {{delta}} vs poprzedni Run ({{previousRun}}: {{previousValue}} -> {{nextRun}}: {{nextValue}}).',
      deltaNotComparable:
        'Delta metryki niedostępna: runy nie są porównywalne.',
      deltaRandomStateWarning: 'Random state jest inny; porównuj ostrożnie.',
    },
  },
} as const

export default pl
