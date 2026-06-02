import type { LucideIcon, LucideProps } from 'lucide-react'
import React from 'react'

export const rotateIcon = (
  Icon: LucideIcon,
  rotateClass: string,
): LucideIcon => {
  const RotatedIcon = React.forwardRef<SVGSVGElement, LucideProps>(
    (props, ref) =>
      React.createElement(Icon, {
        ...props,
        ref,
        className: `${props.className ?? ''} ${rotateClass}`.trim(),
      }),
  )
  RotatedIcon.displayName = `RotatedIcon(${Icon.displayName ?? Icon.name ?? 'Icon'})`
  return RotatedIcon as unknown as LucideIcon
}
