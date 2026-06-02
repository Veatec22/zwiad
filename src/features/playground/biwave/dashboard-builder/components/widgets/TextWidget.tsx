import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function TextWidget({ text }: { text: string }) {
  const source = text || ''

  return (
    <div className="h-full w-full overflow-auto p-3">
      <div className="max-w-none text-sm leading-6 text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-semibold mb-3">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mb-2">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-2 text-sm text-foreground/95">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground my-2">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isBlock = Boolean(className)
              if (isBlock) {
                return (
                  <code className="block rounded-md border border-border/60 bg-muted/50 p-2 text-xs font-mono overflow-x-auto">
                    {children}
                  </code>
                )
              }
              return (
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              )
            },
            table: ({ children }) => (
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-xs border-collapse">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-border px-2 py-1 text-left bg-muted/60">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-2 py-1">{children}</td>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {children}
              </a>
            ),
          }}
        >
          {source}
        </ReactMarkdown>
      </div>
    </div>
  )
}
