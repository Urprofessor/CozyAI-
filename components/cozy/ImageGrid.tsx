'use client';

import { cn } from '@/lib/utils';

interface Props {
  images: string[];
  onOpen: (src: string) => void;
}

/** 1-4 image grid used inside user bubbles. */
export function ImageGrid({ images, onOpen }: Props) {
  const count = Math.min(images.length, 4);
  if (!count) return null;

  return (
    <div
      className={cn(
        'grid gap-1 mb-1 rounded-2xl overflow-hidden',
        count === 1 && 'grid-cols-1 max-w-[220px]',
        count > 1 && 'grid-cols-2 max-w-[260px]'
      )}
    >
      {images.slice(0, 4).map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          loading="lazy"
          onClick={() => onOpen(src)}
          className={cn(
            'w-full object-cover block bg-neutral-200 cursor-zoom-in',
            count === 1 ? 'max-h-[320px]' : 'aspect-square'
          )}
        />
      ))}
    </div>
  );
}
