'use client';

import { useState, type ReactNode } from 'react';
import { sectionEntries, type useMemoryProfile } from '@/hooks/useMemoryProfile';
import type { DatedLabel, SavedProfileMemory } from '@/lib/cozy/memory-profile';
import {
  DIMENSION_LABELS,
  FIELD_LABELS,
  fieldText,
  formatShortDate,
  isEditable,
  sourceLabel,
  validSummary,
  type AnyEntry,
  type AnyField,
  type AnySection,
  type Dimension,
  type PersonSection,
} from '@/lib/cozy/memory-profile-demo';
import { ConfirmDialog, showToast } from '../ui';
import { StoryCard } from '../cards/StoryCard';
import type { CardTone } from '@/lib/cozy/story-card';
import type { IllustrationTopic } from '@/lib/cozy/illustrations';
import { MemoryEditSheet } from './MemoryEditSheet';
import { MemoryOrbit } from './MemoryOrbit';
import { openDataSources } from '@/lib/cozy/sources';

type Memory = ReturnType<typeof useMemoryProfile>;

interface Props {
  memory: Memory;
  onBack: () => void;
}

/** Memory profile: switch between mom and each baby on the orbit, then read,
 *  edit or forget what Cozie remembers about them, by dimension. */
export function MemoryProfilePage({ memory, onBack }: Props) {
  const { people, editEntry, forgetEntry, blockSection, unblockSection } = memory;
  // The topic waiting on "Stop remembering?", with what it would forget.
  const [blocking, setBlocking] = useState<{ dim: Dimension; forget: number; kept: boolean } | null>(null);
  // The demo Home does not expose a selected baby. Start with the first baby.
  const [index, setIndex] = useState(() => people.length > 1 ? 1 : 0);
  const [showPeople, setShowPeople] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<AnyEntry | null>(null);
  const [sheetEntry, setSheetEntry] = useState<AnyEntry | null>(null);
  const [forgetting, setForgetting] = useState<AnyEntry | null>(null);

  const safeIndex = Math.min(index, people.length - 1);
  const person = people[safeIndex];

  function select(i: number) {
    setIndex(i);
    setShowPeople(false);
  }

  function toggle(dim: Dimension) {
    const key = `${person.key}:${dim}`;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openEdit(entry: AnyEntry) {
    setSheetEntry(entry);
    setEditing(entry);
  }

  return (
    <div className="mp-page">
      <header className="mp-topbar">
        <button type="button" className="mp-topbar__back" onClick={onBack} aria-label="Back to chat history">
          <Chevron dir="left" />
        </button>
        <h1 className="mp-topbar__title">Memory profile</h1>
        {people.length > 1 && (
          <button type="button" className="mp-people-toggle" aria-expanded={showPeople} onClick={() => setShowPeople(!showPeople)}>
            {showPeople ? 'Hide list' : 'View all'}
          </button>
        )}
      </header>

      <div className="mp-scroll">
        {showPeople && (
          <ul className="mp-people" aria-label="Family profiles">
            {people.map((member, i) => (
              <li key={member.key}>
                <button type="button" aria-current={i === safeIndex ? 'true' : undefined} onClick={() => select(i)}>
                  {member.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <MemoryOrbit people={people} index={safeIndex} onSelect={select} />

        <div className="mp-identity" aria-live="polite">
          <h2 className="mp-identity__name">{person.name}</h2>
          {person.ageLabel && <p className="mp-identity__age">{person.ageLabel}</p>}
        </div>

        {/* Said up front, before any memory: what this is for and that she's in control. */}
        <aside className="mp-privacy" aria-label="How Cozie protects your family’s data">
          <span className="mp-privacy__icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <div className="mp-privacy__body">
            <p className="mp-privacy__title">Private to your family</p>
            <p className="mp-privacy__text">
              Cozie uses these memories only to tailor its help for you and your baby — never for ads, and never shared
              without your permission. You can edit or forget anything here, or tell Cozie to stop remembering a topic.
            </p>
            <button type="button" className="mp-privacy__link" onClick={openDataSources}>
              Choose what Cozie can see ›
            </button>
          </div>
        </aside>

        <div key={person.key} className="mp-body">
          {person.sections.length === 0 ? (
            <p className="mp-empty">
              Cozie doesn’t remember anything about {person.subject.kind === 'mom' ? 'you' : person.name} yet.
            </p>
          ) : (
            person.sections.map(({ dim, section, hidden, blocked }) =>
              blocked ? (
                <BlockedView
                  key={dim}
                  dim={dim}
                  who={person.subject.kind === 'mom' ? 'you' : person.name}
                  onUnblock={() => {
                    unblockSection(person.key, dim);
                    showToast(`Cozie can remember ${DIMENSION_LABELS[dim].toLowerCase()} again.`);
                  }}
                />
              ) : (
                <SectionView
                  key={dim}
                  dim={dim}
                  section={section}
                  hidden={hidden}
                  expanded={expanded.has(`${person.key}:${dim}`)}
                  onToggle={() => toggle(dim)}
                  onEdit={openEdit}
                  onForget={setForgetting}
                  onBlock={() => {
                    const all = sectionEntries(memory.profile, person.key, dim);
                    setBlocking({
                      dim,
                      forget: all.filter((e) => e.source.kind !== 'momcozyProfile').length,
                      kept: all.some((e) => e.source.kind === 'momcozyProfile'),
                    });
                  }}
                />
              )
            )
          )}
          {/* What Cozie remembers lives here; where it comes from lives in Settings. */}
          <button type="button" className="mp-sources-link" onClick={openDataSources}>
            Where Cozie’s information comes from
            <span>Manage data sources in Settings ›</span>
          </button>
        </div>
      </div>

      <MemoryEditSheet
        open={editing !== null}
        entry={sheetEntry}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (!editing) return;
          editEntry(editing.id, patch);
          setEditing(null);
          showToast('Memory updated.');
        }}
        onForget={() => {
          const entry = editing;
          setEditing(null);
          if (entry) setForgetting(entry);
        }}
      />

      {blocking && (
        <ConfirmDialog
          title={`Stop remembering ${DIMENSION_LABELS[blocking.dim].toLowerCase()}?`}
          message={[
            blocking.forget
              ? `Cozie will forget the ${blocking.forget === 1 ? 'thing' : `${blocking.forget} things`} it remembers here and won’t save anything new about it.`
              : 'Cozie won’t save anything new about it.',
            blocking.kept ? 'Details from your Momcozy profile are only hidden.' : '',
            'You can turn it back on anytime.',
          ]
            .filter(Boolean)
            .join(' ')}
          confirmLabel="Stop"
          onCancel={() => setBlocking(null)}
          onConfirm={() => {
            blockSection(person.key, blocking.dim);
            setBlocking(null);
            showToast('Cozie won’t remember this.');
          }}
        />
      )}

      {forgetting && (
        <ConfirmDialog
          title="Forget this?"
          message="This removes the item from the memory profile. You can’t undo this."
          confirmLabel="Forget"
          onCancel={() => setForgetting(null)}
          onConfirm={() => {
            forgetEntry(forgetting.id);
            setForgetting(null);
            showToast('Cozie has forgotten it.');
          }}
        />
      )}
    </div>
  );
}


// ---------- Sections ----------

/* Each dimension is a story card, in the same colours as the chat's cards and
 * the letter's directions (components/cozy/cards/StoryCard.tsx): feeding is
 * pink like lactation, sleep lavender, health and dates green like growth,
 * her own things yellow like mood; the rest cream. */
const DIM_TONE: Record<Dimension, CardTone> = {
  feeding: 'pink',
  sleep: 'lavender',
  health: 'green',
  importantDates: 'green',
  about: 'yellow',
  carePreferences: 'yellow',
  recentConcerns: 'cream',
  basics: 'cream',
};
const DIM_ART: Partial<Record<Dimension, IllustrationTopic>> = {
  feeding: 'lactation',
  sleep: 'sleep',
  health: 'growth',
  importantDates: 'growth',
  about: 'mood',
  carePreferences: 'mood',
};
/** Memories shown before "View all", so a card stays about as long as a chat card. */
const PREVIEW_COUNT = 2;

const newestFirst = (a: SavedProfileMemory, b: SavedProfileMemory) =>
  Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt);

function SectionView({
  dim,
  section,
  hidden,
  expanded,
  onToggle,
  onEdit,
  onForget,
  onBlock,
}: {
  dim: Dimension;
  section: AnySection;
  hidden?: PersonSection['hidden'];
  expanded: boolean;
  onToggle: () => void;
  onEdit: (entry: AnyEntry) => void;
  onForget: (entry: AnyEntry) => void;
  onBlock: () => void;
}) {
  const label = DIMENSION_LABELS[dim];
  const fields = section.entries.filter((e): e is AnyField => e.kind === 'field');
  const memories = section.entries.filter((e): e is SavedProfileMemory => e.kind === 'memory').sort(newestFirst);
  const summary = validSummary(section);
  // Health stays folded until she opens it, for privacy. (Basics lead the
  // page, open.)
  const foldable = dim === 'health';
  const listId = `mp-list-${dim}`;
  const sources = Array.from(new Set(section.entries.map((e) => sourceLabel(e.source))));

  const card = (children: ReactNode, withSource = true) => (
    <StoryCard
      tone={DIM_TONE[dim]}
      eyebrow="Cozie remembers"
      title={label}
      art={DIM_ART[dim]}
      source={withSource && sources.length ? sources.join(' · ') : undefined}
      className="sc--chat mp-card"
    >
      {children}
      {hidden && (
        // Kept out because its source is off: nothing is deleted.
        <button type="button" className="mp-card__hidden" onClick={openDataSources}>
          {hidden.count === 1 ? '1 item hidden' : `${hidden.count} items hidden`} · {hidden.sources.join(', ')}{' '}
          {hidden.sources.length === 1 ? 'is' : 'are'} off in Data sources ›
        </button>
      )}
      <button type="button" className="mp-card__block" onClick={onBlock}>
        <EyeOffIcon />
        Stop remembering this
      </button>
    </StoryCard>
  );

  // A fresh card (turned back on after being stopped): its starting state.
  if (!section.entries.length && !hidden) {
    return card(
      <p className="sc__note mp-card__empty">Nothing here yet. As you chat, Cozie will remember new things here.</p>,
      false,
    );
  }

  if (foldable) {
    return card(
      <>
        <button
          type="button"
          className="mp-card__more"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          onClick={onToggle}
        >
          {expanded ? 'Hide' : dim === 'health' ? 'Show health information' : 'Show'}
          <Chevron dir={expanded ? 'up' : 'down'} small />
        </button>
        {expanded && (
          <SectionEntries fields={fields} memories={memories} listId={listId} onEdit={onEdit} onForget={onForget} />
        )}
      </>,
      expanded,
    );
  }

  const shown = expanded ? memories : memories.slice(0, PREVIEW_COUNT);
  return card(
    <>
      {summary && memories.length > 1 && <p className="sc__note mp-card__summary">{summary.text}</p>}
      <SectionEntries fields={fields} memories={shown} listId={listId} onEdit={onEdit} onForget={onForget} />
      {memories.length > PREVIEW_COUNT && (
        <button
          type="button"
          className="mp-card__more"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={onToggle}
        >
          {expanded ? 'Show fewer' : `View all ${memories.length}`}
          <Chevron dir={expanded ? 'up' : 'down'} small />
        </button>
      )}
    </>,
  );
}

/** A topic she asked Cozie not to remember: the same card, still in its
 *  place, frozen — with the way back. */
function BlockedView({ dim, who, onUnblock }: { dim: Dimension; who: string; onUnblock: () => void }) {
  return (
    <StoryCard
      tone={DIM_TONE[dim]}
      eyebrow="Not remembering"
      title={DIMENSION_LABELS[dim]}
      art={DIM_ART[dim]}
      className="sc--chat mp-card is-blocked"
    >
      <p className="sc__note">
        You asked Cozie not to remember this. It won’t save or use anything here about {who}.
      </p>
      <button type="button" className="mp-card__more" onClick={onUnblock}>
        Remember again
      </button>
    </StoryCard>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.6M6.6 6.6C4.4 8 2.8 10.1 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.6 4.8-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function SectionEntries({ fields, memories, listId, onEdit, onForget }: {
  fields: AnyField[];
  memories: SavedProfileMemory[];
  listId: string;
  onEdit: (entry: AnyEntry) => void;
  onForget: (entry: AnyEntry) => void;
}) {
  if (!fields.length && !memories.length) return null;
  return (
    <div className="sc__panel mp-card__panel" id={listId}>
      {fields.length > 0 && (
        <dl className="mp-fields">
          {fields.map((f) => (
            <FieldRow key={f.id} entry={f} onEdit={() => onEdit(f)} />
          ))}
        </dl>
      )}
      {memories.length > 0 && (
        <ul className="mp-memories">
          {memories.map((m) => (
            <li key={m.id} className="mp-memory">
              <p className="mp-memory__text">{m.content}</p>
              <div className="mp-memory__foot">
                <span className="mp-memory__meta">
                  {m.updatedAt ? `Edited ${formatShortDate(m.updatedAt)}` : formatShortDate(m.createdAt)}
                </span>
                <span className="mp-memory__actions">
                  <button type="button" onClick={() => onEdit(m)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onForget(m)}>
                    Forget
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FieldRow({ entry, onEdit }: { entry: AnyField; onEdit: () => void }) {
  const dated = entry.field === 'importantDate' || entry.field === 'recentConcern';
  const term = dated ? (entry.value as DatedLabel).label : FIELD_LABELS[entry.field];
  const value = dated ? formatShortDate((entry.value as DatedLabel).date) : fieldText(entry);
  const editable = isEditable(entry);
  return (
    <div className="mp-field">
      <dt>{term}</dt>
      <dd>
        <span className="mp-field__value">{value}</span>
        {editable ? (
          <button type="button" className="mp-field__edit" onClick={onEdit} aria-label={`Edit ${term}`}>
            Edit
          </button>
        ) : (
          <span className="mp-field__source">{sourceLabel(entry.source)}</span>
        )}
      </dd>
    </div>
  );
}

function Chevron({ dir, small }: { dir: 'left' | 'right' | 'up' | 'down'; small?: boolean }) {
  const rotate = { left: 180, right: 0, up: -90, down: 90 }[dir];
  const size = small ? 14 : 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth={small ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
