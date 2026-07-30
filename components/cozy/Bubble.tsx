'use client';

import { cn } from '@/lib/utils';
import type { CozyMessage } from '@/lib/cozy/types';
import { ImageGrid } from './ImageGrid';

interface Props {
  msg: CozyMessage;
  onOpenImage: (src: string) => void;
  agentName?: string;
  agentAvatar?: string;
}

/** One rendered chat message. Delegates to sub-forms by role. */
export function Bubble({ msg, onOpenImage, agentName = 'Cozy AI', agentAvatar }: Props) {
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
      <div
        className={cn(
          'text-text-1 px-0.5',
          'font-aeonik text-[16px] leading-[150%] whitespace-pre-wrap break-words'
        )}
      >
        {msg.content}
      </div>
      {msg.reference && (
        <div className="mt-2.5 text-[13px] leading-5 tracking-[0.28px] text-text-2 font-aeonik">
          {msg.reference}
        </div>
      )}
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  // The __HANDOFF_CARD__ sentinel is intercepted by Chat.tsx to render the card.
  if (content === '__HANDOFF_CARD__') return null;
  return <div className="cozy-tier-3 self-center max-w-[90%] px-3 py-0.5 my-1">{content}</div>;
}
