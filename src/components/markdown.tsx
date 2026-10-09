import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "cn"

type MarkdownProps = {
  children: string
  className?: string
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "max-w-none text-sm leading-relaxed wrap-break-word",
        "*:first:mt-0 *:last:mb-0",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-xl font-semibold tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 text-lg font-semibold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1.5 text-base font-semibold">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b px-3 py-2 font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-3 py-2 align-top">
              {children}
            </td>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className?.includes("language-"))
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <code className={cn("font-mono text-[0.85em]", className)} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-[0.85em] leading-relaxed">
              {children}
            </pre>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
