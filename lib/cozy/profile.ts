// User profile store. Kept deliberately method-agnostic: the extraction layer
// (currently inline [[PROFILE]] tags) only ever produces a Partial<CozyProfile>
// patch and hands it to applyProfilePatch — swapping extraction strategies
// later (a dedicated call, tool use) never touches the store or consumers.
//
// Times are stored as human text (e.g. "3 PM", "every 3h") rather than epoch,
// so the LLM can produce them reliably without knowing the wall clock.

export type FeedingType = 'breast' | 'bottle' | 'mixed';

export interface CozyProfile {
  name?: string; // mom's name
  momAge?: number;
  baby?: {
    name?: string;
    birthDate?: string; // ISO date if known
    ageText?: string; // e.g. "2 weeks", "3 months"
  };
  feeding?: {
    type?: FeedingType;
    intervalHrs?: number;
    note?: string;
  };
  pumping?: {
    intervalHrs?: number;
    note?: string;
  };
  sleep?: {
    note?: string;
  };
  reminders?: Array<{ label: string; when?: string }>;
  updatedAt?: number;
}

const NESTED_KEYS: Array<keyof CozyProfile> = ['baby', 'feeding', 'pumping', 'sleep'];

/** The single merge entry point. Overlays a patch onto the current profile:
 *  scalars replace, known nested objects shallow-merge, reminders upsert by
 *  label. Null/undefined patch fields are ignored (never blank existing data). */
export function applyProfilePatch(cur: CozyProfile, patch: Partial<CozyProfile>): CozyProfile {
  const next: CozyProfile = { ...cur };

  for (const key of Object.keys(patch) as Array<keyof CozyProfile>) {
    const value = patch[key];
    if (value === null || value === undefined) continue;

    if (key === 'reminders' && Array.isArray(value)) {
      const merged = [...(next.reminders ?? [])];
      for (const r of value as CozyProfile['reminders'] as Array<{ label: string; when?: string }>) {
        if (!r?.label) continue;
        const i = merged.findIndex((x) => x.label.toLowerCase() === r.label.toLowerCase());
        if (i >= 0) merged[i] = { ...merged[i], ...r };
        else merged.push(r);
      }
      next.reminders = merged;
    } else if (NESTED_KEYS.includes(key) && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = { ...(cur[key] as object), ...(value as object) } as never;
    } else {
      next[key] = value as never;
    }
  }

  next.updatedAt = Date.now();
  return next;
}

/** Warm vs cold-start: name + baby age + at least one routine. */
export function isProfileSufficient(p: CozyProfile): boolean {
  const hasName = Boolean(p.name || p.baby?.name);
  const hasBabyAge = Boolean(p.baby?.birthDate || p.baby?.ageText);
  const hasRoutine = Boolean(
    p.feeding?.type || p.feeding?.intervalHrs || p.pumping?.intervalHrs
  );
  return hasName && hasBabyAge && hasRoutine;
}

export interface NextUpItem {
  key: string;
  label: string;
  detail: string;
}

/** Aggregated "what's coming up" for the warm state: reminders first, then a
 *  routine summary derived from the known profile. */
export function deriveNextUp(p: CozyProfile): NextUpItem[] {
  const items: NextUpItem[] = [];

  for (const r of p.reminders ?? []) {
    items.push({ key: `rem-${r.label}`, label: r.label, detail: r.when ?? 'Today' });
  }

  if (p.feeding?.type || p.feeding?.intervalHrs) {
    const bits = [p.feeding.type, p.feeding.intervalHrs ? `every ${p.feeding.intervalHrs}h` : '']
      .filter(Boolean)
      .join(' · ');
    items.push({ key: 'feeding', label: 'Feeding', detail: bits || 'Tracked' });
  }

  if (p.pumping?.intervalHrs) {
    items.push({ key: 'pumping', label: 'Pumping', detail: `every ${p.pumping.intervalHrs}h` });
  }

  if (p.baby?.ageText || p.baby?.birthDate) {
    items.push({
      key: 'baby',
      label: p.baby?.name ? p.baby.name : 'Baby',
      detail: p.baby?.ageText || babyAgeFromBirth(p.baby?.birthDate) || 'Tracked',
    });
  }

  return items.slice(0, 5);
}

function babyAgeFromBirth(birthDate?: string): string | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}
