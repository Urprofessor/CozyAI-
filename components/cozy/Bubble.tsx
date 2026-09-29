'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CozyMessage } from '@/lib/cozy/types';
import { ImageGrid } from './ImageGrid';
import { MarkdownMessage } from './MarkdownMessage';
import { CZ, showToast } from './ui';

export type Rating = 'up' | 'down' | null;

interface Props {
  msg: CozyMessage;
  onOpenImage: (src: string) => void;
  /** Still streaming — no action bar yet, tail rabbit keeps animating. */
  streaming?: boolean;
  /** Newest reply of the conversation: owns the response tail + retry. */
  isLatestReply?: boolean;
  /** Follow-up chips (only on the latest reply once it has finished). */
  showSuggestions?: boolean;
  onSuggest?: (text: string) => void;
  onRetry?: () => void;
  rating?: Rating;
  onRate?: (rating: Rating) => void;
  onNegativeFeedback?: () => void;
  onOpenSources?: () => void;
}

const DISCLAIMER = 'For information purpose only. Not medical advice.';

/** One chat row, following the App's ChatList rows: UserMessage,
 *  AssistantMarkdown, AssistantMessageActions, GenerationStopped and the
 *  AgentResponseTail. */
export function Bubble({
  msg,
  onOpenImage,
  streaming = false,
  isLatestReply = false,
  showSuggestions = false,
  onSuggest,
  onRetry,
  rating = null,
  onRate,
  onNegativeFeedback,
  onOpenSources,
}: Props) {
  if (msg.role === 'system') {
    // The __HANDOFF_CARD__ sentinel is intercepted by Chat.tsx to render the card.
    if (msg.content === '__HANDOFF_CARD__') return null;
    return <div className="cz-system">{msg.content}</div>;
  }

  if (msg.role === 'user') {
    return (
      <div className="cz-row cz-row--user">
        {msg.images && msg.images.length > 0 && <ImageGrid images={msg.images} onOpen={onOpenImage} />}
        {msg.content && <UserText text={msg.content} />}
      </div>
    );
  }

  const isSupport = msg.persona === 'support';
  const done = !streaming;

  return (
    <div className="cz-row cz-row--agent">
      {msg.content && (
        <div className="cozy-md">
          <MarkdownMessage content={msg.content} />
        </div>
      )}

      {msg.stopped ? (
        <div className="cz-stopped">
          <strong>Response stopped</strong>
          <span>Want a different answer? Regenerate it.</span>
          {onRetry && (
            <button type="button" className="cz-action" onClick={onRetry} aria-label="Regenerate">
              <img src={`${CZ}/icons/action_refresh.svg`} alt="" />
            </button>
          )}
        </div>
      ) : (
        done &&
        msg.content && (
          <ActionBar
            content={msg.content}
            rateable={!isSupport}
            rating={rating}
            onRate={onRate}
            onNegativeFeedback={onNegativeFeedback}
            onOpenSources={onOpenSources}
            onRetry={isLatestReply && !isSupport ? onRetry : undefined}
          />
        )
      )}

      {isLatestReply && !isSupport && !msg.stopped && (msg.content || streaming) && (
        <ResponseTail completed={done} />
      )}

      {showSuggestions && msg.suggestions && msg.suggestions.length > 0 && onSuggest && (
        <div className="cz-followups">
          {msg.suggestions.map((q) => (
            <button key={q} type="button" className="cz-chip" onClick={() => onSuggest(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** White 24pt-radius bubble, clamped to 5 lines; tapping a clamped message
 *  shows it in full. */
function UserText({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div
      ref={ref}
      className={cn('cz-user-bubble', !expanded && 'is-clamped', clamped && 'is-tappable')}
      onClick={clamped || expanded ? () => setExpanded((v) => !v) : undefined}
    >
      {text}
    </div>
  );
}

function ActionBar({
  content,
  rateable,
  rating,
  onRate,
  onNegativeFeedback,
  onOpenSources,
  onRetry,
}: {
  content: string;
  rateable: boolean;
  rating: Rating;
  onRate?: (rating: Rating) => void;
  onNegativeFeedback?: () => void;
  onOpenSources?: () => void;
  onRetry?: () => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied');
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function up() {
    if (rating === 'up') return onRate?.(null);
    onRate?.('up');
    showToast('Thanks for the feedback.');
  }

  function down() {
    if (rating === 'down') return onRate?.(null);
    onNegativeFeedback?.();
  }

  return (
    <div className="cz-actions">
      <button type="button" className="cz-action" onClick={copy} aria-label="Copy">
        <img src={`${CZ}/icons/action_copy.svg`} alt="" />
      </button>
      {rateable && (
        <>
          <button
            type="button"
            className="cz-action"
            onClick={up}
            aria-label="Helpful"
            aria-pressed={rating === 'up'}
          >
            <img src={`${CZ}/icons/action_thumb_up${rating === 'up' ? '_filled' : ''}.svg`} alt="" />
          </button>
          <button
            type="button"
            className="cz-action"
            onClick={down}
            aria-label="Not helpful"
            aria-pressed={rating === 'down'}
          >
            <img src={`${CZ}/icons/action_thumb_down${rating === 'down' ? '_filled' : ''}.svg`} alt="" />
          </button>
        </>
      )}
      {onRetry && (
        <button type="button" className="cz-action" onClick={onRetry} aria-label="Regenerate">
          <img src={`${CZ}/icons/action_refresh.svg`} alt="" />
        </button>
      )}
      {rateable && onOpenSources && (
        <button type="button" className="cz-sources-pill" onClick={onOpenSources}>
          Sources ↗
        </button>
      )}
    </div>
  );
}

/** App ChatResponseTailCell: thinking rabbit while the reply streams, then the
 *  resting rabbit + right-aligned disclaimer. */
function ResponseTail({ completed }: { completed: boolean }) {
  return (
    <div className="cz-tail">
      <img
        className="cz-tail__rabbit"
        src={completed ? `${CZ}/icons/cozie_response_initial.png` : `${CZ}/ip/Cozie_Thinking_Light.webp`}
        alt=""
        draggable={false}
      />
      {completed && (
        // App formatResponseDisclaimer: one sentence per line.
        <span className="cz-tail__disclaimer">
          {DISCLAIMER.split(/(?<=\.)\s+/).map((s, i) => (
            <span key={i} className="block">
              {s}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** App AgentChatRunStatusView: looping thinking rabbit + shimmering stage text,
 *  shown before the first token arrives. */
export function RunStatus({ text = 'Thinking…' }: { text?: string }) {
  return (
    <div className="cz-row cz-row--agent">
      <div className="cz-runstatus">
        <img src={`${CZ}/ip/Cozie_Thinking_Light.webp`} alt="" draggable={false} />
        <span className="cz-shimmer" data-text={text}>
          {text}
        </span>
      </div>
    </div>
  );
}
