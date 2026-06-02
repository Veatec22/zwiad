import { useEffect, useRef } from 'react'

import type { TableauReport } from './tableauReports'

interface TableauEmbedProps {
  report: TableauReport
}

const tableauScriptSrc = 'https://public.tableau.com/javascripts/api/viz_v1.js'

function getVizHeight(report: TableauReport, width: number) {
  if (width <= 520) {
    return Math.min(report.mobileHeight, 900)
  }

  return Math.max(
    420,
    Math.round((width * report.desktopHeight) / report.desktopWidth),
  )
}

export function TableauEmbed({ report }: TableauEmbedProps) {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const vizRef = useRef<HTMLObjectElement>(null)

  useEffect(() => {
    const placeholder = placeholderRef.current
    const viz = vizRef.current

    if (!placeholder || !viz) {
      return
    }

    const applySize = () => {
      const width = placeholder.offsetWidth

      viz.style.width = '100%'
      viz.style.height = `${getVizHeight(report, width)}px`
    }

    applySize()

    const resizeObserver = new ResizeObserver(applySize)
    resizeObserver.observe(placeholder)

    const script = document.createElement('script')
    script.src = tableauScriptSrc
    script.async = true
    viz.parentNode?.insertBefore(script, viz)

    return () => {
      resizeObserver.disconnect()
      script.remove()
    }
  }, [report])

  return (
    <div
      className="tableauPlaceholder overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
      key={report.id}
      ref={placeholderRef}
    >
      <noscript>
        <a href={report.publishedUrl} rel="noreferrer" target="_blank">
          <img
            alt={report.title}
            className="w-full"
            src={report.previewImage}
          />
        </a>
      </noscript>
      <object className="tableauViz" ref={vizRef} style={{ display: 'none' }}>
        <param name="host_url" value="https%3A%2F%2Fpublic.tableau.com%2F" />
        <param name="embed_code_version" value="3" />
        <param name="site_root" value="" />
        <param name="name" value={report.name} />
        <param name="tabs" value="no" />
        <param name="toolbar" value="yes" />
        <param name="static_image" value={report.staticImage} />
        <param name="animate_transition" value="yes" />
        <param name="display_static_image" value="yes" />
        <param name="display_spinner" value="yes" />
        <param name="display_overlay" value="yes" />
        <param name="display_count" value="yes" />
        <param name="language" value="en-US" />
      </object>
    </div>
  )
}
