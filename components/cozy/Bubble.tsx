'use client';

import { useState, type ReactNode } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, RotateCcw, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CozyMessage } from '@/lib/cozy/types';
import { ImageGrid } from './ImageGrid';
import { MarkdownMessage } from './MarkdownMessage';

interface Props {
  msg: CozyMessage;
  onOpenImage: (src: string) => void;
  agentName?: string;
  agentAvatar?: string;
  /** Show the like / dislike / copy / share row under the reply. Suppressed
   *  while a reply is still streaming. */
  showActions?: boolean;
  /** Show the follow-up ("猜你想问") chips — only on the latest turn's reply. */
  showSuggestions?: boolean;
  /** Send a tapped follow-up as the next user message. */
  onSuggest?: (text: string) => void;
  /** This reply is still streaming — trails a bunny caret after the text. */
  streaming?: boolean;
  /** Re-generate this reply in place (retry button). */
  onRetry?: () => void;
}

/** One rendered chat message. Delegates to sub-forms by role. */
export function Bubble({
  msg,
  onOpenImage,
  showActions = true,
  showSuggestions = false,
  onSuggest,
  streaming = false,
  onRetry,
}: Props) {
  if (msg.role === 'system') {
    return <SystemMessage content={msg.content} />;
  }

  if (msg.role === 'user') {
    return (
      <div className="flex flex-col self-end items-end max-w-[86%] gap-1.5">
        {msg.images && msg.images.length > 0 && (
          <ImageGrid images={msg.images} onOpen={onOpenImage} />
        )}
        {msg.content && (
          <div className="bg-surface-bubble text-text-1 rounded-[18px_18px_4px_18px] px-4 py-3 max-w-full">
            <div className="whitespace-pre-wrap break-words leading-6">{msg.content}</div>
          </div>
        )}
      </div>
    );
  }

  // assistant — no header; markdown body, actions, then a bunny + disclaimer
  // footer once the reply has finished streaming.
  return (
    <div className="flex flex-col self-start items-start max-w-[86%] gap-1.5">
      <div className="cozy-md px-0.5">
        <MarkdownMessage content={msg.content} streaming={streaming} />
      </div>
      {msg.reference && (
        <div className="mt-2.5 text-[13px] leading-5 tracking-[0.28px] text-text-2 font-aeonik">
          {msg.reference}
        </div>
      )}
      {showActions && msg.content && (
        <MessageActions
          content={msg.content}
          rateable={msg.persona !== 'support'}
          onRetry={onRetry}
        />
      )}
      {showSuggestions && msg.suggestions && msg.suggestions.length > 0 && onSuggest && (
        <div className="cozy-followups">
          {msg.suggestions.map((q) => (
            <button
              key={q}
              type="button"
              className="cozy-followup"
              onClick={() => onSuggest(q)}
            >
              <ArrowUpRight size={13} strokeWidth={2} />
              <span>{q}</span>
            </button>
          ))}
        </div>
      )}
      {!streaming && msg.content && msg.persona !== 'support' && (
        <div className="cozy-reply-foot">
          <img src="/icon/Frame%202147240664.png" alt="" draggable={false} />
          <span>
            For information purpose only.
            <br />
            Not medical advice.
          </span>
        </div>
      )}
    </div>
  );
}

/** Copy / like / dislike / retry row + a Sources placeholder, under a reply.
 *  Ratings are local-only (demo); retry re-generates the reply in place. */
function MessageActions({
  content,
  rateable,
  onRetry,
}: {
  content: string;
  rateable: boolean;
  onRetry?: () => void;
}) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div className="mt-2 flex w-full items-center justify-between">
      <div className="flex items-center gap-0.5 -ml-1.5">
        <ActionButton label={copied ? 'Copied' : 'Copy'} onClick={copy}>
          {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.9} />}
        </ActionButton>
        {rateable && (
          <>
            <ActionButton
              label="Helpful"
              active={vote === 'up'}
              onClick={() => setVote((v) => (v === 'up' ? null : 'up'))}
            >
              <ThumbsUp size={15} strokeWidth={1.9} />
            </ActionButton>
            <ActionButton
              label="Not helpful"
              active={vote === 'down'}
              onClick={() => setVote((v) => (v === 'down' ? null : 'down'))}
            >
              <ThumbsDown size={15} strokeWidth={1.9} />
            </ActionButton>
            {onRetry && (
              <ActionButton label="Regenerate" onClick={onRetry}>
                <RotateCcw size={15} strokeWidth={1.9} />
              </ActionButton>
            )}
          </>
        )}
      </div>
      {rateable && (
        <button type="button" className="cozy-sources" title="Sources (coming soon)">
          Sources
          <ArrowUpRight size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function ActionButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
        'text-text-2 hover:bg-surface-bubble active:scale-95',
        active && 'text-brand-rose-700 bg-surface-bubble'
      )}
    >
      {children}
    </button>
  );
}

function SystemMessage({ content }: { content: string }) {
  // The __HANDOFF_CARD__ sentinel is intercepted by Chat.tsx to render the card.
  if (content === '__HANDOFF_CARD__') return null;
  return <div className="cozy-tier-3 self-center max-w-[90%] px-3 py-0.5 my-1">{content}</div>;
}
