import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Icons } from '@/config/icons'
import type { StyleOptionDefinition } from '../../../chart-engine/configs/types'
import { ColorPicker } from '../../ColorPicker'
import { SliderStyleOption } from '../SliderStyleOption'

interface StyleOptionProps {
  option: StyleOptionDefinition
  value: unknown
  onChange: (value: unknown) => void
  disabled: boolean
}

export function StyleOption({
  option,
  value,
  onChange,
  disabled,
}: StyleOptionProps) {
  const { t } = useTranslation()
  const label = t(option.labelKey, option.id)

  switch (option.type) {
    case 'toggle':
      if (option.id === 'showPoints') {
        return (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={option.id} className="text-xs font-normal">
              {label}
            </Label>
            <Toggle
              pressed={Boolean(value ?? option.defaultValue)}
              onPressedChange={(pressed) => onChange(pressed)}
              size="sm"
              variant="outline"
              disabled={disabled}
              className="h-7 w-8 p-0 data-[state=on]:bg-muted"
            >
              <Icons.pointToggle className="h-3.5 w-3.5" />
            </Toggle>
          </div>
        )
      }

      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={option.id} className="text-xs font-normal">
            {label}
          </Label>
          <Switch
            id={option.id}
            checked={Boolean(value ?? option.defaultValue)}
            onCheckedChange={onChange}
            disabled={disabled}
            className="scale-75 origin-right"
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-1">
          <Label htmlFor={option.id} className="text-xs font-normal">
            {label}
          </Label>
          <Select
            value={String(value ?? option.defaultValue)}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger id={option.id} className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[--radix-select-trigger-width] min-w-[--radix-select-trigger-width]">
              {option.options?.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {t(opt.labelKey, opt.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case 'toggle-group':
      return (
        <div className="space-y-1">
          <Label htmlFor={option.id} className="text-xs font-normal">
            {label}
          </Label>
          <ToggleGroup
            type="single"
            value={String(value ?? option.defaultValue)}
            onValueChange={(val) => {
              if (val) onChange(val)
            }}
            className="justify-start border rounded-md p-1 h-8 w-fit"
          >
            {option.options?.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                size="sm"
                className="h-6 w-8 p-0"
                disabled={disabled}
              >
                <div className="text-[10px] font-bold">
                  {opt.value.substring(0, 1).toUpperCase()}
                </div>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )

    case 'slider':
      return (
        <SliderStyleOption
          option={option}
          value={
            typeof value === 'number' ? value : (option.defaultValue as number)
          }
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      )

    case 'color':
      return (
        <div className="space-y-1">
          <Label htmlFor={option.id} className="text-xs font-normal">
            {label}
          </Label>
          <ColorPicker
            value={
              typeof value === 'string'
                ? value
                : String(option.defaultValue ?? 'hsl(var(--foreground))')
            }
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      )

    case 'number':
      return (
        <div className="space-y-1">
          <Label htmlFor={option.id} className="text-xs font-normal">
            {label}
          </Label>
          <input
            type="number"
            id={option.id}
            value={String(value ?? option.defaultValue)}
            onChange={(e) => onChange(Number(e.target.value))}
            min={option.min}
            max={option.max}
            step={option.step}
            disabled={disabled}
            className="w-full h-7 px-2 border rounded text-xs"
          />
        </div>
      )

    default:
      return null
  }
}
