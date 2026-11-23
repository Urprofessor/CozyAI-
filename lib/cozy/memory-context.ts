import type { MemoryProfile, MemorySection } from './memory-profile';
import { DIMENSION_LABELS } from './memory-profile-demo';

/** Mom's memory profile as plain lines for the chat model: every entry she
 *  kept (including what she imported, unless that import is switched off),
 *  grouped by person and section. */
export function memoryContext(profile: MemoryProfile, off: Set<string> = new Set()): string {
  const lines: string[] = [];
  const add = (who: string, sections: Record<string, MemorySection<never> | undefined>) => {
    for (const [dim, section] of Object.entries(sections)) {
      // Imports switched off in Data sources are left out.
      const texts = (section?.entries ?? [])
        .filter((e) => !(e.source.kind === 'imported' && off.has(`import:${e.source.from}`)))
        .map(entryText)
        .filter(Boolean);
      if (texts.length) lines.push(`${who} · ${DIMENSION_LABELS[dim as keyof typeof DIMENSION_LABELS] ?? dim}: ${texts.join('; ')}`);
    }
  };
  add(`Mom (${profile.mom.displayName})`, profile.mom.sections as Record<string, MemorySection<never>>);
  for (const baby of profile.babies) add(`Baby (${baby.displayName})`, baby.sections as Record<string, MemorySection<never>>);
  return lines.length ? `Memory profile:\n${lines.join('\n')}` : '';
}

function entryText(entry: MemorySection<never>['entries'][number] | { kind: 'field'; value: unknown }): string {
  if (entry.kind === 'memory') return entry.content;
  const value = (entry as { value: unknown }).value;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'label' in value) {
    const v = value as { label: string; date?: string };
    return v.date ? `${v.label} (${v.date})` : v.label;
  }
  return '';
}
