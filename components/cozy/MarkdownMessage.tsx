'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Renders an assistant reply as GitHub-flavored Markdown (tables, task lists,
 *  strikethrough, autolinks). All visual styling lives in `.cozy-md` in
 *  app-shell.css, mapped to the Momcozy typography/color tokens per the Figma
 *  "Markdown 元素" spec. The parent supplies the `.cozy-md` container. */
export const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // External links open in a new tab (the ↗ is added via CSS).
        a({ href, children, node: _node, ...props }) {
          const external = !!href && /^https?:\/\//i.test(href);
          return (
            <a
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              {...props}
            >
              {children}
            </a>
          );
        },
        // Wrap tables so wide ones scroll horizontally instead of overflowing.
        table({ children, node: _node, ...props }) {
          return (
            <div className="cozy-md-table">
              <table {...props}>{children}</table>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});
