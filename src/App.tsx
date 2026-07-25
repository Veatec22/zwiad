import {
  BicepsFlexed,
  BrainCircuit,
  ChartBarBig,
  ChevronDown,
  CloudCog,
  DatabaseZap,
  Languages,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  Minimize2,
  Moon,
  PanelsTopLeft,
  Search,
  Server,
  Sun,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GithubLogo from '@/assets/logos/github.svg?react'
import BrandLogo from '@/assets/logos/logo.svg?react'
import biwaveLogo from '@/assets/logos/playground/biwave.png'
import maelLogo from '@/assets/logos/playground/mael.png'
import sailorLogo from '@/assets/logos/playground/sailor.png'
import sqlRushLogo from '@/assets/logos/playground/sqlrush.png'
import adkLogo from '@/assets/logos/stack/backend/adk.png'
import duckDbLogo from '@/assets/logos/stack/backend/duckdb.svg'
import fastApiLogo from '@/assets/logos/stack/backend/fastapi.svg'
import pythonLogo from '@/assets/logos/stack/backend/python.svg'
import streamlitLogo from '@/assets/logos/stack/ml/streamlit.svg'
import dataStudioLogo from '@/assets/logos/stack/bi/datastudio.svg'
import figmaLogo from '@/assets/logos/stack/bi/figma.svg'
import powerBiLogo from '@/assets/logos/stack/bi/powerbi.svg'
import tableauLogo from '@/assets/logos/stack/bi/tableau.svg'
import cloudFunctionsLogo from '@/assets/logos/stack/cloud/cloudfunctions.svg'
import cloudRunLogo from '@/assets/logos/stack/cloud/cloudrun.svg'
import dockerLogo from '@/assets/logos/stack/cloud/docker.svg'
import modalLogo from '@/assets/logos/stack/cloud/modal.svg'
import pubSubLogo from '@/assets/logos/stack/cloud/pubsub.svg'
import supabaseLogo from '@/assets/logos/stack/cloud/supabase.svg'
import terraformLogo from '@/assets/logos/stack/cloud/terraform.svg'
import airflowLogo from '@/assets/logos/stack/de/airflow.svg'
import bigQueryLogo from '@/assets/logos/stack/de/bigquery.svg'
import cosmosLogo from '@/assets/logos/stack/de/cosmos.svg'
import dataformLogo from '@/assets/logos/stack/de/dataform.png'
import dbtLogo from '@/assets/logos/stack/de/dbt.svg'
import postgresLogo from '@/assets/logos/stack/de/postgresql.svg'
import javaScriptLogo from '@/assets/logos/stack/frontend/javascript.svg'
import playwrightLogo from '@/assets/logos/stack/frontend/playwright.svg'
import reactLogo from '@/assets/logos/stack/frontend/react.svg'
import tauriLogo from '@/assets/logos/stack/frontend/tauri.svg'
import typeScriptLogo from '@/assets/logos/stack/frontend/typescript.svg'
import autogluonLogo from '@/assets/logos/stack/ml/autogluon.png'
import evidentlyLogo from '@/assets/logos/stack/ml/evidently.svg'
import kubeflowLogo from '@/assets/logos/stack/ml/kubeflow.png'
import scikitLearnLogo from '@/assets/logos/stack/ml/scikitlearn.svg'
import shapLogo from '@/assets/logos/stack/ml/shap.png'
import vertexAiLogo from '@/assets/logos/stack/ml/vertexai.svg'
import { AsciiWaveCanvas } from '@/components/common/AsciiWaveCanvas'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import stackCsv from '@/data/stack.csv?raw'
import { TableauDashboardCard } from '@/features/dashboards/TableauGalleryCard'
import {
  type TableauReportEmbed,
  tableauReports,
} from '@/features/dashboards/tableauReports'
import { SqlRushCard } from '@/features/playground/sql-rush/SqlRushCard'

const SailorCard = lazy(() =>
  import('@/features/playground/sailor/SailorCard').then((module) => ({
    default: module.SailorCard,
  })),
)

const MaelCard = lazy(() =>
  import('@/features/playground/mael/MaelCard').then((module) => ({
    default: module.MaelCard,
  })),
)

const BiwaveCard = lazy(() =>
  import('@/features/playground/biwave/BiwaveCard').then((module) => ({
    default: module.BiwaveCard,
  })),
)

type Language = 'pl' | 'en'
type Theme = 'light' | 'dark'
type PlaygroundProductId =
  | 'sql-rush'
  | 'sailor'
  | 'mael'
  | 'biwave'
  | `tableau-${string}`
type SortDirection = 'asc' | 'desc'
type SortableStackKey = 'name' | 'type' | 'prof'
type PlaygroundGroup = 'pocs' | 'dashboards'

interface SortState {
  key: SortableStackKey
  direction: SortDirection
}

interface PlaygroundProduct {
  id: PlaygroundProductId
  kind: string
  title: string
  description: string
  meta: string
  tableauReportId?: string
}

interface StackRow {
  id: string
  name: string
  type: string
  prof: number
}

interface AreaItem {
  title: string
  description: string
  keywords: string
}

interface HeroSnapshotItem {
  icon: 'primary' | 'secondary' | 'loc' | 'lang'
  label: string
  value: string
}

interface AreaLogoItem {
  label: string
  src: string
}

const navItems = ['areas', 'playground', 'stack', 'contact'] as const
const areaIcons = [
  DatabaseZap,
  BrainCircuit,
  CloudCog,
  ChartBarBig,
  PanelsTopLeft,
  Server,
] as const
const heroSnapshotIcons = {
  primary: BicepsFlexed,
  secondary: Layers,
  lang: Languages,
  loc: MapPin,
} as const

const stackRows = parseStackCsv(stackCsv)
const allStackTypeFilter = 'all'
const areaLogos = [
  [
    { label: 'Airflow', src: airflowLogo },
    { label: 'Cosmos', src: cosmosLogo },
    { label: 'dbt', src: dbtLogo },
    { label: 'BigQuery', src: bigQueryLogo },
    { label: 'Dataform', src: dataformLogo },
    { label: 'DuckDB', src: duckDbLogo },
    { label: 'PostgreSQL', src: postgresLogo },
  ],
  [
    { label: 'scikit-learn', src: scikitLearnLogo },
    { label: 'Vertex AI', src: vertexAiLogo },
    { label: 'Kubeflow', src: kubeflowLogo },
    { label: 'AutoGluon', src: autogluonLogo },
    { label: 'Evidently', src: evidentlyLogo },
    { label: 'SHAP', src: shapLogo },
    { label: 'Streamlit', src: streamlitLogo },
  ],
  [
    { label: 'Cloud Run', src: cloudRunLogo },
    { label: 'Cloud Functions', src: cloudFunctionsLogo },
    { label: 'Pub/Sub', src: pubSubLogo },
    { label: 'Terraform', src: terraformLogo },
    { label: 'Docker', src: dockerLogo },
    { label: 'Supabase', src: supabaseLogo },
    { label: 'Modal', src: modalLogo },
  ],
  [
    { label: 'Tableau', src: tableauLogo },
    { label: 'Looker Studio', src: dataStudioLogo },
    { label: 'Power BI', src: powerBiLogo },
    { label: 'Figma', src: figmaLogo },
  ],
  [
    { label: 'JavaScript', src: javaScriptLogo },
    { label: 'TypeScript', src: typeScriptLogo },
    { label: 'React', src: reactLogo },
    { label: 'Tauri', src: tauriLogo },
    { label: 'Playwright', src: playwrightLogo },
  ],
  [
    { label: 'FastAPI', src: fastApiLogo },
    { label: 'Google ADK', src: adkLogo },
    { label: 'Python', src: pythonLogo },
  ],
] as const satisfies readonly AreaLogoItem[][]

const stackLogoByName = new Map<string, string>(
  areaLogos.flat().map((logo) => [logo.label, logo.src]),
)

function getLanguage(language?: string): Language {
  return language?.startsWith('en') ? 'en' : 'pl'
}

function parseStackCsv(csv: string): StackRow[] {
  const [, ...rows] = csv.trim().split(/\r?\n/)

  return rows.map((row, index) => {
    const [name = '', type = '', prof = '0'] = row.split(',')

    return {
      id: `${index + 1}-${name.trim().toLowerCase().replace(/\s+/g, '-')}`,
      name: name.trim(),
      prof: Number.parseInt(prof, 10),
      type: type.trim(),
    }
  })
}

function isDashboardProduct(product: PlaygroundProduct) {
  return Boolean(product.tableauReportId)
}

function getInitialTheme(): Theme {
  const storedTheme = localStorage.getItem('theme')

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return 'dark'
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

function App() {
  const { t, i18n } = useTranslation()
  const language = getLanguage(i18n.resolvedLanguage)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 })
  const [activeProductId, setActiveProductId] =
    useState<PlaygroundProductId | null>(null)
  const [playgroundGroup, setPlaygroundGroup] =
    useState<PlaygroundGroup>('pocs')
  const isMobile = useMediaQuery('(max-width: 860px)')
  const [openAreas, setOpenAreas] = useState<Set<number>>(() => new Set())
  const toggleArea = useCallback((index: number) => {
    setOpenAreas((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])
  const [stackQuery, setStackQuery] = useState('')
  const [stackTypeFilter, setStackTypeFilter] = useState(allStackTypeFilter)
  const [stackProf, setStackProf] = useState(0)
  const [sort, setSort] = useState<SortState>({
    key: 'prof',
    direction: 'desc',
  })
  const navRef = useRef<HTMLDivElement>(null)
  const navLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})

  const products = useMemo<PlaygroundProduct[]>(() => {
    const baseProducts = (
      t('playground.items', { returnObjects: true }) as PlaygroundProduct[]
    ).map((item) => ({ ...item }))
    const [firstProduct, ...remainingProducts] = baseProducts
    const tableauProducts = tableauReports.map((report) => ({
      description: report.description,
      id: `tableau-${report.id}` as const,
      kind: 'dashboard',
      meta: 'Tableau',
      tableauReportId: report.id,
      title: report.title,
    }))

    return firstProduct
      ? [firstProduct, ...tableauProducts, ...remainingProducts]
      : tableauProducts
  }, [t])
  const pocProducts = useMemo(
    () => products.filter((product) => !isDashboardProduct(product)),
    [products],
  )
  const dashboardProducts = useMemo(
    () => products.filter((product) => isDashboardProduct(product)),
    [products],
  )
  const playgroundGroups = useMemo(
    () =>
      [
        {
          count: pocProducts.length,
          id: 'pocs',
          label: t('playground.groups.pocs'),
        },
        {
          count: dashboardProducts.length,
          id: 'dashboards',
          label: t('playground.groups.dashboards'),
        },
      ] as const,
    [dashboardProducts.length, pocProducts.length, t],
  )
  const activeProduct = products.find((item) => item.id === activeProductId)
  const activeTableauReport = activeProduct?.tableauReportId
    ? (tableauReports.find(
        (report) => report.id === activeProduct.tableauReportId,
      ) ?? null)
    : null

  const copyContactValue = useCallback(
    async (value: string) => {
      if (!navigator.clipboard?.writeText) {
        toast.error(t('contact.copyError'))
        return
      }

      try {
        await navigator.clipboard.writeText(value)
        toast.success(t('contact.copied'), {
          description: value,
        })
      } catch {
        toast.error(t('contact.copyError'))
      }
    },
    [t],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const onScroll = () => {
      let current: string | null = null

      for (const sectionId of navItems) {
        const element = document.getElementById(sectionId)

        if (element && element.getBoundingClientRect().top <= 80) {
          current = sectionId
        }
      }

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      ) {
        current = 'contact'
      }

      setActiveSection(current)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const nav = navRef.current

    if (!nav || !activeSection) {
      setIndicator((current) => ({ ...current, opacity: 0 }))
      return
    }

    const link = navLinkRefs.current[activeSection]

    if (!link) {
      setIndicator((current) => ({ ...current, opacity: 0 }))
      return
    }

    const parent = nav.getBoundingClientRect()
    const child = link.getBoundingClientRect()
    setIndicator({
      left: child.left - parent.left,
      width: child.width,
      opacity: 1,
    })
  }, [activeSection, language])

  useEffect(() => {
    if (!activeProductId) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveProductId(null)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [activeProductId])

  const filteredStackRows = useMemo(() => {
    const query = stackQuery.trim().toLowerCase()
    const rows = stackRows.filter((row) => {
      const matchesQuery =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query)
      const matchesType =
        stackTypeFilter === allStackTypeFilter || row.type === stackTypeFilter
      const matchesProf = stackProf === 0 || row.prof === stackProf

      return matchesQuery && matchesType && matchesProf
    })

    return [...rows].sort((first, second) => {
      const firstValue = first[sort.key]
      const secondValue = second[sort.key]
      const comparison =
        typeof firstValue === 'number' && typeof secondValue === 'number'
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue))

      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [sort, stackProf, stackQuery, stackTypeFilter])

  const stackTypes = useMemo(
    () => Array.from(new Set(stackRows.map((row) => row.type))).sort(),
    [],
  )

  const changeLanguage = () => {
    void i18n.changeLanguage(language === 'pl' ? 'en' : 'pl')
  }

  const changeTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  const goToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)

    if (element) {
      window.scrollTo({
        top: element.offsetTop - 56,
        behavior: 'smooth',
      })
    }
  }

  const toggleSort = (key: SortableStackKey) => {
    setSort((currentSort) => ({
      key,
      direction:
        currentSort.key === key
          ? currentSort.direction === 'asc'
            ? 'desc'
            : 'asc'
          : key === 'name' || key === 'type'
            ? 'asc'
            : 'desc',
    }))
  }

  return (
    <>
      <header className="site-nav is-scrolled">
        <div className="site-wrap site-nav-inner">
          <a
            className="brand-link"
            href="#top"
            onClick={(event) => {
              event.preventDefault()
              goToSection('top')
            }}
          >
            <BrandLogo aria-hidden="true" className="brand-mark" />
          </a>

          <nav aria-label="Main navigation" className="nav-links" ref={navRef}>
            {navItems.map((item) => (
              <a
                className={`nav-link ${activeSection === item ? 'active' : ''}`}
                href={`#${item}`}
                key={item}
                onClick={(event) => {
                  event.preventDefault()
                  goToSection(item)
                }}
                ref={(node) => {
                  navLinkRefs.current[item] = node
                }}
              >
                {t(`nav.${item}`)}
              </a>
            ))}
            <span
              className="nav-indicator"
              style={{
                left: indicator.left,
                opacity: indicator.opacity,
                width: indicator.width,
              }}
            />
          </nav>

          <div className="nav-actions">
            <button
              aria-label="Change language"
              className="lang-switch"
              onClick={changeLanguage}
              type="button"
            >
              <span className={language === 'pl' ? 'active' : ''}>PL</span>
              <span className={language === 'en' ? 'active' : ''}>EN</span>
            </button>
            <button
              aria-label="Toggle theme"
              className="icon-button"
              onClick={changeTheme}
              type="button"
            >
              {theme === 'dark' ? (
                <Sun aria-hidden="true" size={14} />
              ) : (
                <Moon aria-hidden="true" size={14} />
              )}
            </button>
            <a
              aria-label="GitHub"
              className="icon-button"
              href="https://github.com/Veatec22"
              rel="noreferrer"
              target="_blank"
            >
              <GithubLogo aria-hidden="true" className="github-mark" />
            </a>
            <a
              aria-label="Tableau Public"
              className="icon-button"
              href="https://public.tableau.com/app/profile/veatec/"
              rel="noreferrer"
              target="_blank"
            >
              <img alt="" className="tableau-mark" src={tableauLogo} />
            </a>
          </div>
        </div>
      </header>

      <main className="site-shell" id="top">
        <section className="hero-section">
          <AsciiWaveCanvas theme={theme} />
          <div className="site-wrap hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">{t('hero.eyebrow')}</div>
              <h1>
                {t('hero.title.0')}
                <br />
                <span>{t('hero.title.1')}</span>
              </h1>
              <p>{t('hero.lead')}</p>
              <div className="hero-quote">
                <span className="hero-quote-word">{t('hero.quote.word')}</span>
                {t('hero.quote.translation') ? (
                  <span className="hero-quote-translation">
                    {t('hero.quote.translation')}
                  </span>
                ) : null}
                <span className="hero-quote-pos">{t('hero.quote.pos')}</span>
                <span className="hero-quote-senses">
                  {t('hero.quote.senses')}
                </span>
              </div>
            </div>
            <aside
              className="hero-snapshot"
              aria-label={t('hero.snapshotLabel')}
            >
              {(
                t('hero.snapshot', {
                  returnObjects: true,
                }) as HeroSnapshotItem[]
              ).map((item) => {
                const Icon = heroSnapshotIcons[item.icon]

                return (
                  <div className="hero-snapshot-row" key={item.label}>
                    <Icon aria-hidden="true" size={15} />
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                )
              })}
            </aside>
          </div>
        </section>

        <section className="content-section" id="areas">
          <div className="site-wrap">
            <SectionHead eyebrow={t('areas.eyebrow')} />
            <div className="areas-grid">
              {(t('areas.items', { returnObjects: true }) as AreaItem[]).map(
                (item, index) => {
                  const Icon = areaIcons[index] ?? DatabaseZap
                  const logos: readonly AreaLogoItem[] = areaLogos[index] ?? []

                  return (
                    <article
                      className={`area-card${
                        openAreas.has(index) ? ' is-open' : ''
                      }`}
                      key={item.title}
                    >
                      <button
                        aria-expanded={openAreas.has(index)}
                        className="area-card-title"
                        onClick={() => toggleArea(index)}
                        type="button"
                      >
                        <Icon
                          aria-hidden="true"
                          className="area-card-icon"
                          size={18}
                          strokeWidth={1.8}
                        />
                        <h3>{item.title}</h3>
                      </button>
                      <div className="area-card-reveal">
                        <div className="area-card-reveal-inner">
                          <p>{item.description}</p>
                          {logos.length > 0 ? (
                            <div className="area-card-logos">
                              {logos.map(({ label, src }) => (
                                <Tooltip delayDuration={0} key={label}>
                                  <TooltipTrigger asChild>
                                    <button
                                      aria-label={label}
                                      className="area-logo-chip"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      type="button"
                                    >
                                      <img
                                        alt=""
                                        aria-hidden="true"
                                        className="area-logo"
                                        src={src}
                                      />
                                      <span className="area-logo-label">
                                        {label}
                                      </span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{label}</TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                },
              )}
            </div>
          </div>
        </section>

        <section className="content-section playground-section" id="playground">
          <div className="site-wrap">
            <SectionHead eyebrow={t('playground.eyebrow')} />
            <Tabs
              className="playground-tabs"
              onValueChange={(value) =>
                setPlaygroundGroup(value as PlaygroundGroup)
              }
              value={playgroundGroup}
            >
              <TabsList
                aria-label={t('playground.groupLabel')}
                className="playground-tabs-list"
              >
                {playgroundGroups.map((group) => (
                  <TabsTrigger
                    className="playground-tabs-trigger"
                    key={group.id}
                    value={group.id}
                  >
                    <span>{group.label}</span>
                    <small>{group.count}</small>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent className="playground-tabs-content" value="pocs">
                <PlaygroundCarousel
                  isMobile={isMobile}
                  onSelect={setActiveProductId}
                  products={pocProducts}
                  theme={theme}
                />
              </TabsContent>
              <TabsContent
                className="playground-tabs-content"
                value="dashboards"
              >
                <PlaygroundCarousel
                  isMobile={isMobile}
                  onSelect={setActiveProductId}
                  products={dashboardProducts}
                  theme={theme}
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <section className="content-section" id="stack">
          <div className="site-wrap">
            <SectionHead eyebrow={t('stack.eyebrow')} />
            <div className="stack-card">
              <div className="stack-toolbar">
                <div className="stack-search">
                  <Search aria-hidden="true" size={14} />
                  <input
                    onChange={(event) => setStackQuery(event.target.value)}
                    placeholder={t('stack.search')}
                    type="search"
                    value={stackQuery}
                  />
                </div>
                <Select
                  onValueChange={setStackTypeFilter}
                  value={stackTypeFilter}
                >
                  <SelectTrigger
                    aria-label={t('stack.filters.type')}
                    className="stack-type-filter"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={allStackTypeFilter}>
                        {t('stack.filters.allTypes')}
                      </SelectItem>
                      {stackTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div
                  aria-label={t('stack.filters.profLabel')}
                  className="stack-prof-filter"
                  role="group"
                >
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1

                    return (
                      <button
                        aria-label={t('stack.filters.prof', { value })}
                        aria-pressed={stackProf === value}
                        className={`stack-prof-dot ${
                          index < stackProf ? 'filled' : ''
                        }`}
                        key={value}
                        onClick={() =>
                          setStackProf((current) =>
                            current === value ? 0 : value,
                          )
                        }
                        type="button"
                      />
                    )
                  })}
                </div>
              </div>

              <div className="stack-table-wrap">
                <table className="stack-table">
                  <colgroup>
                    <col className="stack-col-name" />
                    <col className="stack-col-type" />
                    <col className="stack-col-prof" />
                  </colgroup>
                  <thead>
                    <tr>
                      <StackHeader
                        align="left"
                        column="name"
                        label={t('stack.columns.name')}
                        onClick={toggleSort}
                        sort={sort}
                      />
                      <StackHeader
                        align="left"
                        column="type"
                        label={t('stack.columns.type')}
                        onClick={toggleSort}
                        sort={sort}
                      />
                      <StackHeader
                        align="left"
                        column="prof"
                        label={t('stack.columns.prof')}
                        onClick={toggleSort}
                        sort={sort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStackRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span className="stack-name">
                            {stackLogoByName.has(row.name) ? (
                              <img
                                alt=""
                                aria-hidden="true"
                                className="stack-logo"
                                src={stackLogoByName.get(row.name)}
                              />
                            ) : null}
                            {row.name}
                          </span>
                        </td>
                        <td>
                          <span className="site-tag">{row.type}</span>
                        </td>
                        <td>
                          <Dots value={row.prof} />
                        </td>
                      </tr>
                    ))}
                    {filteredStackRows.length === 0 ? (
                      <tr>
                        <td className="empty-cell" colSpan={3}>
                          {t('stack.empty')} "{stackQuery}"
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="content-section contact-section" id="contact">
          <AsciiWaveCanvas theme={theme} />
          <div className="site-wrap">
            <div className="contact-card">
              <div className="eyebrow">{t('contact.eyebrow')}</div>
              <h2>{t('contact.title')}</h2>
              <p className="contact-lead">
                <Trans
                  components={{ z: <em className="zwiad-word" /> }}
                  i18nKey="contact.lead"
                />
              </p>
              <div className="contact-actions">
                <button
                  className="site-button primary"
                  type="button"
                  onClick={() => copyContactValue(t('contact.email'))}
                  aria-label={`Email: ${t('contact.email')}`}
                >
                  <Mail aria-hidden="true" size={14} />
                  {t('contact.email')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {activeProductId && activeProduct ? (
        <PlaygroundModal
          loadingLabel={t('playground.loading')}
          onClose={() => setActiveProductId(null)}
          product={activeProduct}
          tableauReport={activeTableauReport}
        />
      ) : null}

      <Toaster position="bottom-right" theme={theme} />
    </>
  )
}

function SectionHead({
  eyebrow,
  lead,
  title,
}: {
  eyebrow: string
  lead?: string
  title?: string
}) {
  return (
    <div className="section-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        {title ? <h2>{title}</h2> : null}
      </div>
      {lead ? <p>{lead}</p> : null}
    </div>
  )
}

function PlaygroundPreview({
  product,
  theme,
}: {
  product: PlaygroundProduct
  theme: Theme
}) {
  const id = product.id
  const tableauReport = product.tableauReportId
    ? tableauReports.find((report) => report.id === product.tableauReportId)
    : null

  if (tableauReport) {
    return (
      <div className="preview-panel tableau-preview">
        <img alt="" src={tableauReport.previewImage} />
      </div>
    )
  }

  if (id === 'biwave') {
    return (
      <LogoAsciiPreview theme={theme}>
        <img alt="" src={biwaveLogo} />
      </LogoAsciiPreview>
    )
  }

  if (id === 'sailor') {
    return (
      <LogoAsciiPreview theme={theme}>
        <img alt="" src={sailorLogo} />
      </LogoAsciiPreview>
    )
  }

  if (id === 'sql-rush') {
    return (
      <LogoAsciiPreview theme={theme}>
        <img alt="" className="logo-sqlrush" src={sqlRushLogo} />
      </LogoAsciiPreview>
    )
  }

  if (id === 'mael') {
    return (
      <LogoAsciiPreview theme={theme}>
        <img alt="" src={maelLogo} />
      </LogoAsciiPreview>
    )
  }

  return (
    <LogoAsciiPreview theme={theme}>
      <BrandLogo aria-hidden="true" className="playground-logo-mark" />
    </LogoAsciiPreview>
  )
}

function LogoAsciiPreview({
  children,
  theme,
}: {
  children: ReactNode
  theme: Theme
}) {
  return (
    <div className="preview-panel biwave-preview">
      <AsciiWaveCanvas
        className="ascii-wave-card"
        configOverride={{
          alphaBase: 0.14,
          alphaRange: 0.22,
          amplitude: 0.5,
          cellSize: 10,
          choppiness: 0.25,
          contrast: 0.85,
          depthEffect: 0.55,
          foamThreshold: 0.95,
          frequency: 1.5,
          layers: 2,
          timeSpeed: 1.4,
          vignetteIntensity: 0.75,
          vignetteRadius: 0.35,
          vignetteSoftness: 0.6,
        }}
        hoverTarget=".playground-card"
        playMode="hover"
        theme={theme}
      />
      {children}
    </div>
  )
}

function PlaygroundCarousel({
  isMobile,
  onSelect,
  products,
  theme,
}: {
  isMobile: boolean
  onSelect: (productId: PlaygroundProductId) => void
  products: PlaygroundProduct[]
  theme: Theme
}) {
  const { t } = useTranslation()
  return (
    <Carousel
      className="playground-carousel"
      opts={{
        align: 'start',
        loop: true,
      }}
    >
      <CarouselContent className="playground-carousel-track">
        {products.map((product) => (
          <CarouselItem className="playground-carousel-item" key={product.id}>
            <button
              className="playground-card"
              onClick={() => {
                if (isMobile) {
                  toast(t('playground.desktopOnly'))
                  return
                }
                onSelect(product.id)
              }}
              type="button"
            >
              {isMobile ? (
                <span className="playground-card-desktop-badge">
                  {t('playground.desktopBadge')}
                </span>
              ) : null}
              <PlaygroundPreview product={product} theme={theme} />
              <div className="playground-card-body">
                <div className="playground-card-title">
                  <h3>{product.title}</h3>
                  <div className="playground-card-tags">
                    {product.meta.split(' · ').map((tag) => (
                      <span className="site-tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p>{product.description}</p>
              </div>
            </button>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="playground-carousel-control previous" />
      <CarouselNext className="playground-carousel-control next" />
    </Carousel>
  )
}

function StackHeader({
  align,
  column,
  label,
  onClick,
  sort,
}: {
  align: 'left' | 'right'
  column: SortableStackKey
  label: string
  onClick: (column: SortableStackKey) => void
  sort: SortState
}) {
  const isActive = sort.key === column

  return (
    <th className={align === 'right' ? 'align-right' : undefined}>
      <button
        className={isActive ? 'active' : undefined}
        onClick={() => onClick(column)}
        type="button"
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className={isActive && sort.direction === 'asc' ? 'sort-asc' : ''}
          size={12}
        />
      </button>
    </th>
  )
}

function Dots({ value }: { value: number }) {
  return (
    <span className="dots">
      {Array.from({ length: 5 }).map((_, index) => (
        <i className={index < value ? 'filled' : undefined} key={index} />
      ))}
    </span>
  )
}

function PlaygroundModal({
  loadingLabel,
  onClose,
  product,
  tableauReport,
}: {
  loadingLabel: string
  onClose: () => void
  product: PlaygroundProduct
  tableauReport?: TableauReportEmbed | null
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <div
      aria-modal="true"
      className={`modal-backdrop open${isFullscreen ? ' modal-fullscreen' : ''}`}
      onClick={onClose}
      role="dialog"
    >
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-bar">
          <div className="modal-title">
            <span>
              playground /{' '}
              {product.id === 'biwave' ? product.title : product.id}
            </span>
          </div>
          <div className="modal-actions">
            <button
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="icon-button"
              onClick={() => setIsFullscreen((f) => !f)}
              type="button"
            >
              {isFullscreen ? (
                <Minimize2 aria-hidden="true" size={14} />
              ) : (
                <Maximize2 aria-hidden="true" size={14} />
              )}
            </button>
            <button
              aria-label="Close"
              className="icon-button"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        </div>
        <div
          className={`modal-content ${
            product.id === 'sql-rush' ||
            product.id === 'sailor' ||
            product.id === 'mael' ||
            product.id === 'biwave'
              ? 'modal-content-flush'
              : ''
          }`}
        >
          {product.id === 'sql-rush' ? (
            <SqlRushCard />
          ) : tableauReport ? (
            <TableauDashboardCard report={tableauReport} />
          ) : product.id === 'biwave' ? (
            <Suspense
              fallback={<div className="modal-loading">{loadingLabel}</div>}
            >
              <BiwaveCard />
            </Suspense>
          ) : product.id === 'mael' ? (
            <Suspense
              fallback={<div className="modal-loading">{loadingLabel}</div>}
            >
              <MaelCard />
            </Suspense>
          ) : (
            <Suspense
              fallback={<div className="modal-loading">{loadingLabel}</div>}
            >
              <SailorCard />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
