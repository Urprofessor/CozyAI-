import type { MemoryProfile, MemorySection } from './memory-profile';
import { DIMENSION_LABELS, blockKey, entrySourceKey, type Dimension } from './memory-profile-demo';

/** Mom's memory profile as plain lines for the chat model: every entry she
 *  kept, grouped by person and section. Left out: entries whose source is
 *  switched off in Data sources (the Momcozy account, an import), and topics
 *  she asked Cozie not to remember — those are listed so Cozie doesn't save
 *  them again. */
export function memoryContext(
  profile: MemoryProfile,
  off: Set<string> = new Set(),
  blocked: Set<string> = new Set()
): string {
  const lines: string[] = [];
  const stopped: string[] = [];
  const add = (person: string, who: string, sections: Record<string, MemorySection<never> | undefined>) => {
    for (const [dim, section] of Object.entries(sections)) {
      const label = DIMENSION_LABELS[dim as Dimension] ?? dim;
      if (blocked.has(blockKey(person, dim as Dimension))) continue;
      const texts = (section?.entries ?? [])
        .filter((e) => {
          const key = entrySourceKey(e.source);
          return !(key && off.has(key));
        })
        .map(entryText)
        .filter(Boolean);
      if (texts.length) lines.push(`${who} · ${label}: ${texts.join('; ')}`);
    }
  };
  add('mom', `Mom (${profile.mom.displayName})`, profile.mom.sections as Record<string, MemorySection<never>>);
  for (const baby of profile.babies) {
    add(baby.babyId, `Baby (${baby.displayName})`, baby.sections as Record<string, MemorySection<never>>);
  }
  for (const key of blocked) {
    const [person, dim] = key.split(':');
    const name = person === 'mom' ? profile.mom.displayName : profile.babies.find((b) => b.babyId === person)?.displayName;
    if (name) stopped.push(`${name} · ${DIMENSION_LABELS[dim as Dimension] ?? dim}`);
  }
  const out: string[] = [];
  if (lines.length) out.push(`Memory profile:\n${lines.join('\n')}`);
  if (stopped.length) {
    out.push(
      `She asked Cozie not to remember these topics: ${stopped.join(', ')}. Don't save new details about them, and don't bring up earlier ones unless she does.`
    );
  }
  return out.join('\n');
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
