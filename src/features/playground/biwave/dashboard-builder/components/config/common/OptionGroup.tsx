interface OptionGroupProps {
  title: string
  children: React.ReactNode
}

export function OptionGroup({ title, children }: OptionGroupProps) {
  return (
    <div>
      <div className="py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </div>
      <div className="space-y-2 pb-2 pl-2">{children}</div>
    </div>
  )
}
