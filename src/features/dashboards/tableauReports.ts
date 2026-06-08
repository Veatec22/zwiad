export interface TableauReport {
  id: string
  title: string
  description: string
  staticImage: string
  previewImage: string
  desktopWidth: number
  desktopHeight: number
  mobileHeight: number
  tags: string[]
  publishedUrl: string
}

interface NamedTableauReport extends TableauReport {
  name: string
  path?: never
}

interface SharedTableauReport extends TableauReport {
  name?: never
  path: string
}

export type TableauReportEmbed = NamedTableauReport | SharedTableauReport

export const tableauReports = [
  {
    id: 'spaceship-titanic',
    title: 'Spaceship Titanic',
    description:
      'Public Tableau dashboard built around the Spaceship Titanic dataset.',
    name: 'SpaceshipTitanic_17629860584420/Dashboard',
    staticImage:
      'https://public.tableau.com/static/images/Sp/SpaceshipTitanic_17629860584420/Dashboard/1.png',
    previewImage:
      'https://public.tableau.com/static/images/Sp/SpaceshipTitanic_17629860584420/Dashboard/1_rss.png',
    desktopWidth: 1600,
    desktopHeight: 927,
    mobileHeight: 3577,
    tags: ['Tableau', 'Dashboard', 'Kaggle'],
    publishedUrl:
      'https://public.tableau.com/views/SpaceshipTitanic_17629860584420/Dashboard',
  },
  {
    id: 'video-games-sales',
    title: 'Video Games Sales',
    description:
      'Public Tableau dashboard analyzing video games sales across the market.',
    name: 'videogames_17630721405370/VideoGamesSales',
    staticImage:
      'https://public.tableau.com/static/images/vi/videogames_17630721405370/VideoGamesSales/1.png',
    previewImage:
      'https://public.tableau.com/static/images/vi/videogames_17630721405370/VideoGamesSales/1_rss.png',
    desktopWidth: 1600,
    desktopHeight: 927,
    mobileHeight: 2477,
    tags: ['Tableau', 'Dashboard', 'Video Games'],
    publishedUrl:
      'https://public.tableau.com/views/videogames_17630721405370/VideoGamesSales?:language=en-US&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link',
  },
  {
    id: 'tv-shows',
    title: 'TV Shows',
    description: 'Public Tableau dashboard exploring TV shows data.',
    path: 'shared/TFPC3DGHB',
    staticImage: 'https://public.tableau.com/static/images/TF/TFPC3DGHB/1.png',
    previewImage:
      'https://public.tableau.com/static/images/TF/TFPC3DGHB/1_rss.png',
    desktopWidth: 1600,
    desktopHeight: 950,
    mobileHeight: 2000,
    tags: ['Tableau', 'Dashboard', 'TV Shows'],
    publishedUrl:
      'https://public.tableau.com/shared/TFPC3DGHB?:display_count=n&:origin=viz_share_link',
  },
] satisfies TableauReportEmbed[]
