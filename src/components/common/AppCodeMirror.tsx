import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Prec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror'
import ReactCodeMirror from '@uiw/react-codemirror'
import { useEffect, useMemo, useState } from 'react'

type AppTheme = 'light' | 'dark'

const base16DarkTheme = EditorView.theme(
  {
    '&, &.cm-editor': {
      backgroundColor: '#151515',
      color: '#d0d0d0',
      fontFamily: 'var(--font-mono)',
    },
    '.cm-scroller': {
      backgroundColor: '#151515',
    },
    '.cm-content': {
      caretColor: '#d0d0d0',
      fontFamily: 'var(--font-mono)',
    },
    '.cm-cursor': {
      borderLeftColor: '#d0d0d0',
    },
    '.cm-gutters, .cm-gutter': {
      backgroundColor: '#202020',
      borderRightColor: '#303030',
      color: '#808080',
    },
    '.cm-activeLine': {
      backgroundColor: '#202020',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#303030',
      color: '#b0b0b0',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: '#515151',
    },
    '&.cm-focused': {
      outline: '1px solid var(--border-strong)',
    },
  },
  { dark: true },
)

const base16LightTheme = EditorView.theme(
  {
    '&, &.cm-editor': {
      backgroundColor: '#f5f5f5',
      color: '#202020',
      fontFamily: 'var(--font-mono)',
    },
    '.cm-scroller': {
      backgroundColor: '#f5f5f5',
    },
    '.cm-content': {
      caretColor: '#202020',
      fontFamily: 'var(--font-mono)',
    },
    '.cm-cursor': {
      borderLeftColor: '#202020',
    },
    '.cm-gutters, .cm-gutter': {
      backgroundColor: '#e0e0e0',
      borderRightColor: '#d0d0d0',
      color: '#808080',
    },
    '.cm-activeLine': {
      backgroundColor: '#e0e0e0',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#d0d0d0',
      color: '#505050',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: '#d0d0d0',
    },
    '&.cm-focused': {
      outline: '1px solid var(--border-strong)',
    },
  },
  { dark: false },
)

const base16DarkHighlight = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: [tags.comment, tags.lineComment, tags.blockComment],
      color: '#505050',
      fontStyle: 'italic',
    },
    { tag: [tags.keyword, tags.operator], color: '#ac4142' },
    { tag: [tags.atom, tags.bool, tags.null, tags.number], color: '#d28445' },
    {
      tag: [tags.string, tags.special(tags.string), tags.regexp],
      color: '#90a959',
    },
    {
      tag: [
        tags.name,
        tags.standard(tags.name),
        tags.special(tags.name),
        tags.variableName,
        tags.propertyName,
      ],
      color: '#6a9fb5',
    },
    { tag: tags.function(tags.variableName), color: '#f4bf75' },
    { tag: [tags.className, tags.typeName], color: '#aa759f' },
    {
      tag: [tags.punctuation, tags.paren, tags.brace, tags.squareBracket],
      color: '#b0b0b0',
    },
  ]),
)

const base16LightHighlight = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: [tags.comment, tags.lineComment, tags.blockComment],
      color: '#8f5536',
      fontStyle: 'italic',
    },
    { tag: [tags.keyword, tags.operator], color: '#ac4142' },
    { tag: [tags.atom, tags.bool, tags.null, tags.number], color: '#d28445' },
    {
      tag: [tags.string, tags.special(tags.string), tags.regexp],
      color: '#90a959',
    },
    {
      tag: [
        tags.name,
        tags.standard(tags.name),
        tags.special(tags.name),
        tags.variableName,
        tags.propertyName,
      ],
      color: '#6a9fb5',
    },
    { tag: tags.function(tags.variableName), color: '#f4bf75' },
    { tag: [tags.className, tags.typeName], color: '#aa759f' },
    {
      tag: [tags.punctuation, tags.paren, tags.brace, tags.squareBracket],
      color: '#505050',
    },
  ]),
)

const getDocumentTheme = (): AppTheme =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'

const useDocumentTheme = () => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof document === 'undefined') return 'dark'
    return getDocumentTheme()
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getDocumentTheme())
    })

    observer.observe(document.documentElement, {
      attributeFilter: ['class', 'data-theme'],
      attributes: true,
    })

    return () => observer.disconnect()
  }, [])

  return theme
}

export default function AppCodeMirror({
  basicSetup,
  extensions,
  theme: _theme,
  ...props
}: ReactCodeMirrorProps) {
  const documentTheme = useDocumentTheme()
  const codeMirrorTheme =
    documentTheme === 'light' ? base16LightTheme : base16DarkTheme
  const codeMirrorHighlight =
    documentTheme === 'light' ? base16LightHighlight : base16DarkHighlight
  const themedExtensions = useMemo(
    () => [...(extensions ?? []), Prec.highest(codeMirrorHighlight)],
    [codeMirrorHighlight, extensions],
  )
  const codeMirrorBasicSetup = useMemo(() => {
    if (basicSetup === false) return false
    if (basicSetup === true || basicSetup === undefined) {
      return { syntaxHighlighting: false }
    }

    return {
      ...basicSetup,
      syntaxHighlighting: false,
    }
  }, [basicSetup])

  return (
    <ReactCodeMirror
      {...props}
      basicSetup={codeMirrorBasicSetup}
      theme={codeMirrorTheme}
      extensions={themedExtensions}
    />
  )
}
