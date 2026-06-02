import { HexColorPicker } from 'react-colorful'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Icons } from '@/config/icons'
import { cn } from '@/lib/utils'
export const CATEGORICAL_PALETTES = {
  zinc: [
    '#71717a',
    '#a1a1aa',
    '#3f3f46',
    '#52525b',
    '#d4d4d8',
    '#27272a',
    '#b4b4bd',
    '#63636d',
  ],
  slate: [
    '#f8fafc',
    '#cbd5e1',
    '#94a3b8',
    '#64748b',
    '#475569',
    '#334155',
    '#1e293b',
    '#0f172a',
  ],
  tableau10: [
    '#4e79a7',
    '#f28e2b',
    '#e15759',
    '#76b7b2',
    '#59a14f',
    '#edc948',
    '#b07aa1',
    '#ff9da7',
    '#9c755f',
    '#bab0ac',
  ],
  vibrant: [
    '#e15759',
    '#f28e2b',
    '#59a14f',
    '#4e79a7',
    '#b07aa1',
    '#76b7b2',
    '#edc948',
    '#ff9da7',
    '#9c755f',
    '#bab0ac',
  ],
  pastel: [
    '#a6cee3',
    '#b2df8a',
    '#fb9a99',
    '#fdbf6f',
    '#cab2d6',
    '#ffff99',
    '#1f78b4',
    '#33a02c',
    '#e31a1c',
    '#ff7f00',
  ],
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
  trigger?: React.ReactNode
}

export function ColorPicker({
  value,
  onChange,
  disabled,
  trigger,
}: ColorPickerProps) {
  const { t } = useTranslation()

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="ghost"
            disabled={disabled}
            className="w-[130px] justify-start gap-2 border"
          >
            <div
              className="h-4 w-4 rounded-sm border shadow-sm"
              style={{ backgroundColor: value }}
            />
            <span className="flex-1 truncate text-left text-xs">
              {value || t('color.label', 'Color')}
            </span>
            <Icons.reportstyles className="h-3.5 w-3.5 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <Label className="text-xs font-medium">
            {t('color.pickColor', 'Pick a color')}
          </Label>
          <div className="space-y-3">
            <HexColorPicker color={value} onChange={onChange} />
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-md border shadow-sm shrink-0"
                style={{ backgroundColor: value }}
              />
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-8"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface PalettePickerProps {
  value: string[]
  onChange: (palette: string[]) => void
  disabled?: boolean
}

export function PalettePicker({
  value,
  onChange,
  disabled,
}: PalettePickerProps) {
  const { t } = useTranslation()

  const palettes = Object.entries(CATEGORICAL_PALETTES)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          className="w-[130px] justify-start gap-2 border"
        >
          <div className="flex gap-0.5">
            {value.slice(0, 4).map((color) => (
              <div
                key={color}
                className="h-3 w-2 rounded-sm first:rounded-l last:rounded-r"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="flex-1 truncate text-left text-xs">
            {t('color.palette', 'Palette')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3" align="start">
        <div className="space-y-3">
          <Label className="text-xs font-medium">
            {t('color.pickPalette', 'Pick a palette')}
          </Label>
          <div className="flex flex-col gap-2">
            {palettes.map(([name, colors]) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange(colors)}
                className={cn(
                  'flex items-center gap-2 rounded-md border p-2 transition-all',
                  'hover:bg-muted',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  JSON.stringify(value) === JSON.stringify(colors) &&
                    'ring-2 ring-primary bg-muted',
                )}
              >
                <div className="flex gap-0.5">
                  {colors.slice(0, 10).map((color) => (
                    <div
                      key={`${name}-${color}`}
                      className="h-5 w-3 first:rounded-l-sm last:rounded-r-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs capitalize ml-auto">{name}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
