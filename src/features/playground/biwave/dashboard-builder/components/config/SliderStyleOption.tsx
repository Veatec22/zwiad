/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { StyleOptionDefinition } from '../../chart-engine/configs/types'

interface SliderStyleOptionProps {
  option: StyleOptionDefinition
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function SliderStyleOption({
  option,
  value,
  onChange,
  disabled,
}: SliderStyleOptionProps) {
  const { t } = useTranslation()
  const label = t(option.labelKey, option.id)
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={option.id} className="text-xs font-normal">
          {label}
        </Label>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {draft}
        </span>
      </div>
      <Slider
        id={option.id}
        value={[draft]}
        onValueChange={([v]) => setDraft(v)}
        onValueCommit={([v]) => onChange(v)}
        min={option.min}
        max={option.max}
        step={option.step}
        disabled={disabled}
        className="w-full"
      />
    </div>
  )
}
