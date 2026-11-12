// Fixed display order for the dimensions supported by each profile.
export const MOM_MEMORY_DIMENSIONS = [
  'carePreferences',
  'recentConcerns',
  'about',
  'importantDates',
  'health',
] as const;

export const BABY_MEMORY_DIMENSIONS = ['feeding', 'sleep', 'recentConcerns', 'basics'] as const;

export type MomDimension = (typeof MOM_MEMORY_DIMENSIONS)[number];
export type BabyDimension = (typeof BABY_MEMORY_DIMENSIONS)[number];

export type MemorySource =
  | { kind: 'momcozyProfile'; syncedAt?: string }
  | { kind: 'chat'; sessionId?: string }
  | { kind: 'manual' };

export interface ProfileEntry {
  id: string;
  source: MemorySource;
  updatedAt?: string; // ISO timestamp
}

export interface DatedLabel {
  label: string;
  date: string; // YYYY-MM-DD
}

/** Structured values retain their types for display and field-level editing. */
export interface MemoryFieldValues {
  occupation: string;
  hobby: string;
  importantDate: DatedLabel;
  medicalHistory: string;
  recentConcern: DatedLabel; // date is the day this concern was recorded
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  ageText: string; // Approximate age when birthDate is unavailable
}

export type MemoryField<K extends keyof MemoryFieldValues> = {
  [Field in K]: ProfileEntry & {
    kind: 'field';
    field: Field;
    value: MemoryFieldValues[Field];
  };
}[K];

export interface SavedProfileMemory extends ProfileEntry {
  kind: 'memory';
  memoryType: 'fact' | 'preference' | 'event' | 'emotion';
  content: string;
  createdAt: string; // ISO timestamp
}

export interface MemorySection<Fields extends keyof MemoryFieldValues = never> {
  entries: Array<MemoryField<Fields> | SavedProfileMemory>;
  /** Derived text. IDs point to the entries in this section that support it. */
  summary?: { text: string; entryIds: string[] };
}

export interface MomMemorySections {
  carePreferences?: MemorySection;
  about?: MemorySection<'occupation' | 'hobby'>;
  recentConcerns?: MemorySection<'recentConcern'>;
  importantDates?: MemorySection<'importantDate'>;
  health?: MemorySection<'medicalHistory'>;
}

export interface BabyMemorySections {
  feeding?: MemorySection;
  sleep?: MemorySection;
  recentConcerns?: MemorySection<'recentConcern'>;
  basics?: MemorySection<'nickname' | 'birthDate' | 'ageText' | 'importantDate'>;
}

interface ProfilePortrait {
  displayName: string;
  portraitUrl?: string;
}

export interface MomMemoryProfile extends ProfilePortrait {
  sections: MomMemorySections;
}

export interface BabyMemoryProfile extends ProfilePortrait {
  babyId: string;
  sections: BabyMemorySections;
}

/** Stable selection for the orbit and the View all list. */
export type MemoryProfileSubject = { kind: 'mom' } | { kind: 'baby'; babyId: string };

/** Entries belong to the person that contains them. Unresolved references to a
 * baby stay in the memory system until they can be assigned to a babyId. */
export interface MemoryProfile {
  userId: string;
  mom: MomMemoryProfile;
  babies: BabyMemoryProfile[];
}
