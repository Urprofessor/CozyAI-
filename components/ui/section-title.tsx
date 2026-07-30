import { ChevronRight } from 'lucide-react';

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action ? (
        <button type="button">
          {action}
          <ChevronRight size={16} />
        </button>
      ) : (
        <ChevronRight size={17} aria-hidden="true" />
      )}
    </div>
  );
}
