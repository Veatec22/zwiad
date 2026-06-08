import { TableauEmbed } from './TableauEmbed'
import { tableauReports, type TableauReportEmbed } from './tableauReports'

interface TableauDashboardCardProps {
  report: TableauReportEmbed
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
