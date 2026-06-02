import { useTranslation } from 'react-i18next'

export function SqlRushCard() {
  const { t } = useTranslation()

  return (
    <section className="h-full min-h-[560px] overflow-hidden rounded-xl border border-border bg-black">
      <iframe
        className="h-full min-h-[560px] w-full bg-black"
        sandbox="allow-scripts allow-same-origin"
        src="/playground/sql-rush/sql_rush.html"
        title={t('playground.game.title')}
      />
    </section>
  )
}
