'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Invisible sentinel appended while streaming; rendered as the bunny "cursor"
// that trails the latest text (like a typing caret).
const CURSOR = '⁣cozy-cursor⁣';

/** Renders an assistant reply as GitHub-flavored Markdown (tables, task lists,
 *  strikethrough, autolinks). Styling lives in `.cozy-md` in app-shell.css,
 *  mapped to the Momcozy tokens per the Figma spec. While `streaming`, a small
 *  bunny caret trails the text. */
export const MarkdownMessage = memo(function MarkdownMessage({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  // Only append the caret when code spans are balanced, so a half-typed `` ` ``
  // mid-stream doesn't swallow it.
  const balanced = (content.match(/`/g) || []).length % 2 === 0;
  const src = streaming && balanced ? `${content}\`${CURSOR}\`` : content;

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
        // Wide tables scroll horizontally instead of overflowing.
        table({ children, node: _node, ...props }) {
          return (
            <div className="cozy-md-table">
              <table {...props}>{children}</table>
            </div>
          );
        },
        // The streaming caret rides in as an inline code span, swapped for the bunny.
        code({ children, className, node: _node, ...props }) {
          const text = Array.isArray(children) ? children.join('') : String(children ?? '');
          if (text === CURSOR) {
            return (
              <img className="cozy-cursor" src="/icon/Frame%202147240664.png" alt="" aria-hidden="true" />
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {src}
    </ReactMarkdown>
  );
});
