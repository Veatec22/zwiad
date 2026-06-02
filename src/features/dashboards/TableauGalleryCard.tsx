import { TableauEmbed } from './TableauEmbed'
import { tableauReports, type TableauReport } from './tableauReports'

interface TableauDashboardCardProps {
  report: TableauReport
}

export function TableauDashboardCard({ report }: TableauDashboardCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <TableauEmbed key={report.id} report={report} />
    </div>
  )
}

export function TableauGalleryCard() {
  return <TableauDashboardCard report={tableauReports[0]} />
}
