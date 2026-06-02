import { Plus, Trash2, X } from 'lucide-react'
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useDashboardStore } from '../../chart-engine/store'

/**
 * Tab bar for biwave dashboards (biwave-08).
 *
 * Renders one pill per Tab plus an `+` action.
 * - Click a pill → activate the Tab.
 * - Double-click a pill → inline rename.
 * - X icon on hover (when Tabs > 1) → delete with confirm.
 */
export function TabBar() {
  const tabs = useDashboardStore((state) => state.tabs)
  const activeTabId = useDashboardStore((state) => state.activeTabId)
  const { addTab, setActiveTab, renameTab, deleteTab } = useDashboardStore()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [renamingId])

  const startRename = useCallback((tabId: string, currentName: string) => {
    setRenamingId(tabId)
    setDraft(currentName)
  }, [])

  const commitRename = useCallback(() => {
    if (!renamingId) return
    const next = draft.trim()
    if (next) renameTab(renamingId, next)
    setRenamingId(null)
  }, [draft, renamingId, renameTab])

  const cancelRename = useCallback(() => {
    setRenamingId(null)
  }, [])

  const handleKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commitRename()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        cancelRename()
      }
    },
    [cancelRename, commitRename],
  )

  const handleDelete = useCallback(
    (event: MouseEvent, tabId: string) => {
      event.stopPropagation()
      if (tabs.length <= 1) return
      deleteTab(tabId)
    },
    [deleteTab, tabs.length],
  )

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto border-border border-b bg-background px-2 py-1"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const isRenaming = renamingId === tab.id
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              isActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
            role="tab"
            aria-selected={isActive}
          >
            {isRenaming ? (
              <input
                ref={inputRef}
                className="h-5 w-24 rounded-sm border border-border bg-background px-1 text-xs"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKey}
              />
            ) : (
              <button
                className="max-w-[140px] truncate"
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => startRename(tab.id, tab.name)}
                title={`${tab.name} — double-click to rename`}
                type="button"
              >
                {tab.name}
              </button>
            )}
            {tabs.length > 1 && !isRenaming ? (
              <button
                aria-label={`Delete ${tab.name}`}
                className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                onClick={(event) => handleDelete(event, tab.id)}
                title="Delete tab"
                type="button"
              >
                {isActive ? (
                  <Trash2 className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            ) : null}
          </div>
        )
      })}
      <button
        aria-label="Add tab"
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        onClick={addTab}
        title="Add tab"
        type="button"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
