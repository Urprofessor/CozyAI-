// Demo data and local edits for the Memory Profile page. The chat's
// `CozyProfile` (profile.ts) keeps serving chat and the lactation plan; this
// is a separate, fictional profile (Clara + three children) so the page can
// show multiple babies before a real memory API exists.

import {
  BABY_MEMORY_DIMENSIONS,
  MOM_MEMORY_DIMENSIONS,
  type BabyDimension,
  type DatedLabel,
  type MemoryField,
  type MemoryFieldValues,
  type MemoryProfile,
  type MemoryProfileSubject,
  type MemorySection,
  type MemorySource,
  type MomDimension,
  type SavedProfileMemory,
} from './memory-profile';

export type FieldName = keyof MemoryFieldValues;
export type AnyField = MemoryField<FieldName>;
export type AnyEntry = AnyField | SavedProfileMemory;
export type AnySection = MemorySection<FieldName>;
export type Dimension = MomDimension | BabyDimension;

/** A person on the orbit, flattened for display. */
export interface MemoryPerson {
  key: string; // 'mom' | babyId
  subject: MemoryProfileSubject;
  name: string;
  portraitUrl?: string;
  ageLabel?: string; // babies only
  sections: Array<{ dim: Dimension; section: AnySection }>;
}

// ---------- Labels ----------

export const DIMENSION_LABELS: Record<Dimension, string> = {
  about: 'Work & interests',
  recentConcerns: 'Recently on your mind',
  importantDates: 'Important dates',
  health: 'Health',
  basics: 'Basics',
  feeding: 'Feeding',
  sleep: 'Sleep',
};

export const FIELD_LABELS: Record<FieldName, string> = {
  occupation: 'Work',
  hobby: 'Interests',
  importantDate: 'Date',
  medicalHistory: 'Medical history',
  recentConcern: 'On your mind',
  nickname: 'Nickname',
  birthDate: 'Birthday',
  ageText: 'Age',
};

/** "Update in chat" draft, naming the person and (when known) the dimension. */
export function updateDraft(person: MemoryPerson, dim: Dimension | null): string {
  const lead = 'I’d like to update what you remember about';
  if (person.subject.kind === 'mom') {
    const mine: Partial<Record<Dimension, string>> = {
      about: 'my work and interests',
      recentConcerns: 'what’s been on my mind',
      importantDates: 'my important dates',
      health: 'my health',
    };
    return `${lead} ${(dim && mine[dim]) || 'me'}.`;
  }
  const theirs: Partial<Record<Dimension, string>> = {
    basics: 'details',
    feeding: 'feeding',
    sleep: 'sleep',
  };
  const part = dim && theirs[dim];
  return part ? `${lead} ${person.name}’s ${part}.` : `${lead} ${person.name}.`;
}

// ---------- Formatting ----------

export function formatShortDate(iso: string): string {
  const d = parseDate(iso);
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', opts);
}

/** "6 weeks old" style label from a YYYY-MM-DD birth date. */
export function ageFromBirthDate(birthDate: string, now = new Date()): string {
  const born = parseDate(birthDate);
  const days = Math.floor((startOfDay(now).getTime() - born.getTime()) / 86_400_000);
  if (days < 0) return '';
  if (days < 14) return plural(days, 'day');
  if (days < 91) return plural(Math.floor(days / 7), 'week');
  let months = (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth();
  if (now.getDate() < born.getDate()) months -= 1;
  if (months < 24) return plural(months, 'month');
  return plural(Math.floor(months / 12), 'year');
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? '' : 's'} old`;
}

/** Display text for a field value. */
export function fieldText(entry: AnyField): string {
  switch (entry.field) {
    case 'importantDate':
    case 'recentConcern': {
      const v = entry.value as DatedLabel;
      return v.label;
    }
    case 'birthDate':
      return formatShortDate(entry.value as string);
    default:
      return entry.value as string;
  }
}

export function sourceLabel(source: MemorySource): string {
  switch (source.kind) {
    case 'momcozyProfile':
      return 'Momcozy profile';
    case 'chat':
      return 'From chat';
    case 'manual':
      return 'Added by you';
  }
}

/** Momcozy profile fields are shown with their source and edited there. */
export function isEditable(entry: AnyEntry): boolean {
  return entry.source.kind !== 'momcozyProfile';
}

// ---------- People ----------

export function peopleOf(profile: MemoryProfile, now = new Date()): MemoryPerson[] {
  const momSections = profile.mom.sections as Partial<Record<Dimension, AnySection>>;
  const people: MemoryPerson[] = [
    {
      key: 'mom',
      subject: { kind: 'mom' },
      name: profile.mom.displayName,
      portraitUrl: profile.mom.portraitUrl,
      sections: orderedSections(momSections, MOM_MEMORY_DIMENSIONS),
    },
  ];
  for (const baby of profile.babies) {
    const sections = baby.sections as Partial<Record<Dimension, AnySection>>;
    const fields = (sections.basics?.entries ?? []).filter((e): e is AnyField => e.kind === 'field');
    const birth = fields.find((e) => e.field === 'birthDate');
    const ageText = fields.find((e) => e.field === 'ageText');
    people.push({
      key: baby.babyId,
      subject: { kind: 'baby', babyId: baby.babyId },
      name: baby.displayName,
      portraitUrl: baby.portraitUrl,
      ageLabel: birth
        ? ageFromBirthDate(birth.value as string, now)
        : (ageText?.value as string | undefined),
      sections: orderedSections(sections, BABY_MEMORY_DIMENSIONS),
    });
  }
  return people;
}

function orderedSections(
  sections: Partial<Record<Dimension, AnySection>>,
  order: readonly Dimension[]
): MemoryPerson['sections'] {
  return order.flatMap((dim) => {
    const section = sections[dim];
    return section && section.entries.length ? [{ dim, section }] : [];
  });
}

/** The summary is only shown while every entry it cites is unchanged. */
export function validSummary(section: AnySection): AnySection['summary'] {
  const s = section.summary;
  if (!s || !s.entryIds.length) return undefined;
  const ids = new Set(section.entries.map((e) => e.id));
  return s.entryIds.every((id) => ids.has(id)) ? s : undefined;
}

// ---------- Local edits ----------

export interface EntryEdit {
  content?: string; // memories
  value?: MemoryFieldValues[FieldName]; // fields
  updatedAt: string;
}

export interface MemoryOverrides {
  edits: Record<string, EntryEdit>;
  forgotten: string[];
}

export const EMPTY_OVERRIDES: MemoryOverrides = { edits: {}, forgotten: [] };

/** Apply the demo's local edits to the seed. A summary that cites an edited or
 *  forgotten entry is dropped, so the section falls back to its entries. */
export function applyOverrides(profile: MemoryProfile, o: MemoryOverrides): MemoryProfile {
  if (!o.forgotten.length && !Object.keys(o.edits).length) return profile;
  const forgotten = new Set(o.forgotten);
  const fixSection = (section: AnySection | undefined): AnySection | undefined => {
    if (!section) return section;
    const entries = section.entries
      .filter((e) => !forgotten.has(e.id))
      .map((e): AnyEntry => {
        const edit = o.edits[e.id];
        if (!edit) return e;
        if (e.kind === 'memory') {
          return { ...e, content: edit.content ?? e.content, updatedAt: edit.updatedAt };
        }
        return { ...e, value: edit.value ?? e.value, updatedAt: edit.updatedAt } as AnyField;
      });
    const touched = section.summary?.entryIds.some((id) => forgotten.has(id) || id in o.edits);
    return { entries, summary: touched ? undefined : section.summary };
  };
  const fixAll = <T extends object>(sections: T): T => {
    const out: Record<string, AnySection | undefined> = {};
    for (const [k, v] of Object.entries(sections)) out[k] = fixSection(v as AnySection);
    return out as T;
  };
  return {
    ...profile,
    mom: { ...profile.mom, sections: fixAll(profile.mom.sections) },
    babies: profile.babies.map((b) => ({ ...b, sections: fixAll(b.sections) })),
  };
}

// ---------- Seed ----------

// Painted portraits, 512px square. Emma has none yet and keeps the placeholder.
const PORTRAITS = '/cozie/memory';

/** Fictional demo profile. Dates are relative to `now` so ages stay right. */
export function buildDemoMemoryProfile(now = new Date()): MemoryProfile {
  const daysAgo = (n: number, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayOffset = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return ymd(d);
  };
  const monthsAgo = (m: number, extraDays = 0) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - m);
    d.setDate(d.getDate() - extraDays);
    return ymd(d);
  };

  const chat: MemorySource = { kind: 'chat' };
  const momcozy: MemorySource = { kind: 'momcozyProfile', syncedAt: daysAgo(30) };

  const mem = (
    id: string,
    memoryType: SavedProfileMemory['memoryType'],
    content: string,
    ago: number
  ): SavedProfileMemory => ({
    id,
    kind: 'memory',
    memoryType,
    content,
    source: chat,
    createdAt: daysAgo(ago),
  });

  return {
    userId: 'demo-clara',
    mom: {
      displayName: 'Clara',
      portraitUrl: `${PORTRAITS}/clara.webp`,
      sections: {
        about: {
          entries: [
            { id: 'clara-occupation', kind: 'field', field: 'occupation', value: 'Product designer', source: chat, updatedAt: daysAgo(12) },
            { id: 'clara-hobby', kind: 'field', field: 'hobby', value: 'Weekend hikes', source: chat, updatedAt: daysAgo(5) },
            mem('clara-about-1', 'event', 'You said you’re getting ready to go back to work in January.', 9),
            mem('clara-about-2', 'preference', 'You said you like short, practical answers you can read one-handed.', 20),
          ],
          summary: {
            text: 'You’re getting ready to go back to work, and you like short, practical answers you can read one-handed.',
            entryIds: ['clara-about-1', 'clara-about-2'],
          },
        },
        recentConcerns: {
          entries: [
            mem('clara-rc-1', 'event', 'You asked how to keep up your milk supply once you’re back at work.', 2),
            mem('clara-rc-2', 'event', 'You asked whether waking every three hours at night is typical at 6 weeks.', 4),
            mem('clara-rc-3', 'emotion', 'You said evenings feel overwhelming when Noah cluster-feeds.', 6),
          ],
          summary: {
            text: 'You’ve asked about pumping once you’re back at work and about night wakes at 6 weeks. You said evenings feel hard during cluster feeds.',
            entryIds: ['clara-rc-1', 'clara-rc-2', 'clara-rc-3'],
          },
        },
        importantDates: {
          entries: [
            { id: 'clara-date-work', kind: 'field', field: 'importantDate', value: { label: 'Back to work', date: dayOffset(54) }, source: chat, updatedAt: daysAgo(9) },
            { id: 'clara-date-checkup', kind: 'field', field: 'importantDate', value: { label: 'Noah’s 2-month check-up', date: dayOffset(17) }, source: chat, updatedAt: daysAgo(3) },
          ],
        },
        health: {
          entries: [
            { id: 'clara-history', kind: 'field', field: 'medicalHistory', value: 'C-section delivery', source: momcozy, updatedAt: daysAgo(30) },
            mem('clara-health-1', 'fact', 'You said your incision still feels sore when you lift the car seat.', 7),
          ],
        },
      },
    },
    babies: [
      {
        babyId: 'noah',
        displayName: 'Noah',
        portraitUrl: `${PORTRAITS}/noah.webp`,
        sections: {
          basics: {
            entries: [
              { id: 'noah-nickname', kind: 'field', field: 'nickname', value: 'Little bear', source: chat, updatedAt: daysAgo(15) },
              { id: 'noah-birth', kind: 'field', field: 'birthDate', value: dayOffset(-42), source: momcozy, updatedAt: daysAgo(30) },
            ],
          },
          feeding: {
            entries: [
              mem('noah-feed-1', 'fact', 'You said Noah usually has a bottle before bed.', 3),
              mem('noah-feed-2', 'fact', 'You said Noah feeds about every 3 hours during the day.', 8),
              mem('noah-feed-3', 'event', 'You asked how many ounces to put in each of Noah’s bottles.', 11),
            ],
            summary: {
              text: 'You said Noah usually has a bottle before bed and feeds about every 3 hours. You’ve also asked how much to put in each bottle.',
              entryIds: ['noah-feed-1', 'noah-feed-2', 'noah-feed-3'],
            },
          },
          sleep: {
            entries: [
              mem('noah-sleep-1', 'event', 'You asked how to handle Noah’s night wakes around 2 a.m.', 1),
              mem('noah-sleep-2', 'fact', 'You said gentle rocking usually settles Noah back to sleep.', 4),
              mem('noah-sleep-3', 'event', 'You asked whether Noah’s short daytime naps are normal.', 10),
            ],
            summary: {
              text: 'You’ve asked about Noah’s night wakes and short daytime naps. You said gentle rocking usually settles Noah back to sleep.',
              entryIds: ['noah-sleep-1', 'noah-sleep-2', 'noah-sleep-3'],
            },
          },
        },
      },
      {
        babyId: 'mia',
        displayName: 'Mia',
        portraitUrl: `${PORTRAITS}/mia.webp`,
        sections: {
          basics: {
            entries: [
              { id: 'mia-nickname', kind: 'field', field: 'nickname', value: 'Mimi', source: chat, updatedAt: daysAgo(18) },
              { id: 'mia-birth', kind: 'field', field: 'birthDate', value: monthsAgo(22, 5), source: momcozy, updatedAt: daysAgo(30) },
            ],
          },
          feeding: {
            entries: [mem('mia-feed-1', 'preference', 'You said Mia is a picky eater but always finishes a banana.', 13)],
          },
          sleep: {
            entries: [
              mem('mia-sleep-1', 'fact', 'You said Mia naps once a day, from about 1 to 3 p.m.', 6),
              mem('mia-sleep-2', 'event', 'You asked how to keep Mia’s bedtime steady now that Noah is home.', 2),
            ],
            summary: {
              text: 'You said Mia naps once a day after lunch. You’ve asked how to keep Mia’s bedtime steady now that Noah is home.',
              entryIds: ['mia-sleep-1', 'mia-sleep-2'],
            },
          },
        },
      },
      {
        babyId: 'emma',
        displayName: 'Emma',
        sections: {
          basics: {
            entries: [
              { id: 'emma-nickname', kind: 'field', field: 'nickname', value: 'Em', source: chat, updatedAt: daysAgo(25) },
              { id: 'emma-birth', kind: 'field', field: 'birthDate', value: monthsAgo(51, 12), source: momcozy, updatedAt: daysAgo(30) },
            ],
          },
          sleep: {
            entries: [mem('emma-sleep-1', 'fact', 'You said Emma sometimes wakes from bad dreams and comes to your room.', 5)],
          },
        },
      },
    ],
  };
}

function parseDate(iso: string) {
  // Bare dates are local calendar days, not UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
