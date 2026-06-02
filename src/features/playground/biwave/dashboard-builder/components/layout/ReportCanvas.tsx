import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useTranslation } from 'react-i18next'
import { Icons } from '@/config/icons'
import { useDashboardStore, type Widget } from '../../chart-engine/store'
import { WidgetWrapper } from './WidgetWrapper'

// Constants

const COLS = 12
const ROW_HEIGHT = 60
const MARGIN: [number, number] = [8, 8]
const CONTAINER_PADDING: [number, number] = [12, 12]

// Props

interface ReportCanvasProps {
  width: number
  transformScale?: number
  renderWidget: (widget: Widget) => React.ReactNode
  disabled?: boolean
}

interface GridItemLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

// Memoized Widget Item

const WidgetItem = memo(function WidgetItem({
  widget,
  isSelected,
  onSelect,
  children,
  disabled,
}: {
  widget: Widget
  isSelected: boolean
  onSelect: () => void
  children: React.ReactNode
  disabled: boolean
}) {
  return (
    <div className="h-full group">
      <WidgetWrapper
        widget={widget}
        isSelected={isSelected}
        onSelect={onSelect}
        disabled={disabled}
      >
        {children}
      </WidgetWrapper>
    </div>
  )
})

// Component

export function ReportCanvas({
  width,
  renderWidget,
  disabled = false,
}: ReportCanvasProps) {
  const { t } = useTranslation()

  const {
    widgets,
    selectedWidgetId,
    selectWidget,
    updateLayouts,
    saveSnapshot,
  } = useDashboardStore()

  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.react-grid-item')) return
      selectWidget(null)
    }

    el.addEventListener('mousedown', onMouseDown)
    return () => el.removeEventListener('mousedown', onMouseDown)
  }, [selectWidget])

  // Convert widgets to grid layout
  const layout = useMemo<GridItemLayout[]>(() => {
    return widgets.map((w) => ({
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: w.layout.w,
      h: w.layout.h,
      minW: w.layout.minW ?? 2,
      minH: w.layout.minH ?? 2,
      maxW: w.layout.maxW,
      maxH: w.layout.maxH,
    }))
  }, [widgets])

  // Handle layout change
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const updates = newLayout.map((item) => ({
        id: item.i,
        layout: {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
          maxW: item.maxW,
          maxH: item.maxH,
        },
      }))
      updateLayouts(updates)
    },
    [updateLayouts],
  )

  // Empty state
  if (widgets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Icons.report className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">
            {t('canvas.empty.title', 'upload data and click add element')}
          </h3>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="h-full overflow-hidden">
      <GridLayout
        className="layout"
        layout={layout}
        width={width - 32}
        gridConfig={{
          cols: COLS,
          rowHeight: ROW_HEIGHT,
          margin: MARGIN,
          containerPadding: CONTAINER_PADDING,
        }}
        dragConfig={{
          enabled: !disabled,
          handle: '.drag-handle',
        }}
        resizeConfig={{
          enabled: !disabled,
        }}
        onLayoutChange={handleLayoutChange}
        onDragStart={() => saveSnapshot()}
        onResizeStart={() => saveSnapshot()}
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetItem
              widget={widget}
              isSelected={!disabled && selectedWidgetId === widget.id}
              disabled={disabled}
              onSelect={() => {
                if (!disabled) selectWidget(widget.id)
              }}
            >
              {renderWidget(widget)}
            </WidgetItem>
          </div>
        ))}
      </GridLayout>
    </div>
  )
}

// Responsive version (optional)

export function ResponsiveReportCanvas({
  renderWidget,
  disabled,
}: Omit<ReportCanvasProps, 'width'>) {
  // This would use a resize observer to get container width
  // For now, we'll use a simpler approach
  return (
    <div className="h-full w-full" id="dashboard-canvas-container">
      <ReportCanvas
        width={1200} // Default width, should be measured
        renderWidget={renderWidget}
        disabled={disabled}
      />
    </div>
  )
}
