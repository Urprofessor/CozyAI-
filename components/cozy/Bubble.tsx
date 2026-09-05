'use client';

import { useState, type ReactNode } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, Share2, ArrowUpRight } from 'lucide-react';
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
}

/** One rendered chat message. Delegates to sub-forms by role. */
export function Bubble({
  msg,
  onOpenImage,
  agentName = 'Cozy AI',
  agentAvatar,
  showActions = true,
  showSuggestions = false,
  onSuggest,
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

  // assistant — no heavy bubble, avatar + name header, plain text body.
  const avatarSrc = msg.avatar || agentAvatar || '/images/IP_%E9%AB%98%E5%85%B4.png';
  const name = msg.persona === 'support' ? 'Sarah' : agentName;
  return (
    <div className="flex flex-col self-start items-start max-w-[86%] gap-1.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <img src={avatarSrc} alt="" className="w-6 h-6 object-contain" />
        <span className="text-xs font-semibold text-brand-rose-700 opacity-80">{name}</span>
      </div>
      <div className="cozy-md px-0.5">
        <MarkdownMessage content={msg.content} />
      </div>
      {msg.reference && (
        <div className="mt-2.5 text-[13px] leading-5 tracking-[0.28px] text-text-2 font-aeonik">
          {msg.reference}
        </div>
      )}
      {showActions && msg.content && (
        <MessageActions content={msg.content} rateable={msg.persona !== 'support'} />
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
    </div>
  );
}

/** Like / dislike / copy / forward row under an assistant reply. Ratings are
 *  local-only (demo); copy and forward act on the reply text. */
function MessageActions({ content, rateable }: { content: string; rateable: boolean }) {
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

  async function forward() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: content });
        return;
      } catch {
        /* user cancelled or unsupported — fall through to copy */
      }
    }
    copy();
  }

  return (
    <div className="mt-2 flex items-center gap-0.5 -ml-1.5">
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
        </>
      )}
      <ActionButton label={copied ? 'Copied' : 'Copy'} onClick={copy}>
        {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.9} />}
      </ActionButton>
      <ActionButton label="Forward" onClick={forward}>
        <Share2 size={15} strokeWidth={1.9} />
      </ActionButton>
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
