import { sql as sqlLang } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppCodeMirror from '@/components/common/AppCodeMirror'
import { Button } from '@/components/ui/button'
import { Icons } from '@/config/icons'

type CopyState = 'idle' | 'copied' | 'error'

export function SqlTab({ sql: sqlText }: { sql: string | null }) {
  const { t } = useTranslation()
  const [copyState, setCopyState] = useState<CopyState>('idle')

  useEffect(() => {
    if (copyState === 'idle') return
    const timeout = window.setTimeout(() => setCopyState('idle'), 1500)
    return () => window.clearTimeout(timeout)
  }, [copyState])

  const canCopy = useMemo(
    () => Boolean(sqlText && navigator.clipboard?.writeText),
    [sqlText],
  )

  const handleCopy = useCallback(async () => {
    if (!sqlText) return
    if (!navigator.clipboard?.writeText) {
      setCopyState('error')
      return
    }
    try {
      await navigator.clipboard.writeText(sqlText)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }, [sqlText])

  if (!sqlText) {
    return (
      <div className="text-xs text-muted-foreground">
        {t('sql.empty', 'Configure the chart to preview generated SQL.')}
      </div>
    )
  }

  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('sql.title', 'SQL')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="default"
          className="h-7 px-2 text-xs"
          onClick={handleCopy}
          disabled={!canCopy}
        >
          <Icons.copy className="mr-1.5 h-3.5 w-3.5" />
          {copyState === 'copied'
            ? t('sql.copied', 'Copied')
            : copyState === 'error'
              ? t('sql.copyError', 'Copy failed')
              : t('sql.copy', 'Copy')}
        </Button>
      </div>
      <div className="border rounded-md overflow-hidden">
        <AppCodeMirror
          value={sqlText}
          height="260px"
          extensions={[sqlLang(), EditorView.lineWrapping]}
          editable={false}
          basicSetup={{
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: false,
          }}
        />
      </div>
    </div>
  )
}
