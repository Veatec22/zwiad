import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { type ChartType, chartConfigs } from '../../chart-engine/configs'

// Props

interface ChartTypePickerProps {
  value: ChartType
  onChange: (type: ChartType) => void
  disabled?: boolean
  className?: string
}

// Component

export function ChartTypePicker({
  value,
  onChange,
  disabled = false,
  className,
}: ChartTypePickerProps) {
  const { t } = useTranslation()

  const selectedConfig = chartConfigs[value]
  const SelectedIcon = selectedConfig.icon

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn('h-9', className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <SelectedIcon className="h-4 w-4" />
            <span>{t(selectedConfig.nameKey, value)}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[--radix-select-trigger-width] min-w-[--radix-select-trigger-width]">
        {Object.entries(chartConfigs).map(([type, config]) => {
          const Icon = config.icon
          return (
            <SelectItem key={type} value={type}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{t(config.nameKey, type)}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

// Grid Picker (alternative layout)

interface ChartTypeGridPickerProps {
  value: ChartType
  onChange: (type: ChartType) => void
  disabled?: boolean
}

export function ChartTypeGridPicker({
  value,
  onChange,
  disabled = false,
}: ChartTypeGridPickerProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-4 gap-1">
      {Object.entries(chartConfigs).map(([type, config]) => {
        const Icon = config.icon
        const isSelected = value === type

        return (
          <button
            type="button"
            key={type}
            onClick={() => onChange(type as ChartType)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded border transition-colors',
              'hover:bg-accent hover:border-accent',
              isSelected && 'bg-accent border-primary',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Icon className={cn('h-5 w-5', isSelected && 'text-primary')} />
            <span className="text-[10px] truncate w-full text-center">
              {t(config.nameKey, type)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
