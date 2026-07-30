'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src?: string;
  images?: string[];
  initialIndex?: number;
  onClose: () => void;
}

/** Fullscreen image viewer — single image or swipeable gallery. */
export function Lightbox({ src, images, initialIndex = 0, onClose }: Props) {
  const list = images ?? (src ? [src] : []);
  const [idx, setIdx] = useState(initialIndex);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || list.length <= 1) return;
    requestAnimationFrame(() => {
      el.scrollTo({ left: initialIndex * el.clientWidth, behavior: 'instant' as ScrollBehavior });
      setIdx(initialIndex);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || list.length <= 1) return;
    const onScroll = () => {
      const next = Math.round(el.scrollLeft / el.clientWidth);
      if (next !== idx) setIdx(next);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [idx, list.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!list.length) return null;

  return (
    <div
      role="dialog"
      aria-label="Image viewer"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 animate-lightbox-in cursor-zoom-out"
    >
      {list.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2] pointer-events-none text-white/85 text-[13px] font-medium tabular-nums">
          {idx + 1} / {list.length}
        </div>
      )}

      <div
        ref={trackRef}
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {list.map((url, i) => (
          <div key={i} className="min-w-full h-full snap-center flex items-center justify-center">
            <img
              src={url}
              alt=""
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain select-none cursor-default"
            />
          </div>
        ))}
      </div>

      {list.length > 1 && (
        <div className="absolute left-0 right-0 bottom-5 flex justify-center gap-2 z-[2]">
          {list.map((_, i) => (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                const el = trackRef.current;
                if (!el) return;
                el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
              }}
              className="w-2 h-2 rounded-full transition-colors cursor-pointer pointer-events-auto"
              style={{ background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
