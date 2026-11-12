'use client';

import { useState } from 'react';
import type { useMemoryProfile } from '@/hooks/useMemoryProfile';
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
} from '@/lib/cozy/memory-profile-demo';
import { ConfirmDialog, showToast } from '../ui';
import { MemoryEditSheet } from './MemoryEditSheet';
import { MemoryOrbit } from './MemoryOrbit';

type Memory = ReturnType<typeof useMemoryProfile>;

interface Props {
  memory: Memory;
  onBack: () => void;
}

/** Memory profile: switch between mom and each baby on the orbit, then read,
 *  edit or forget what Cozie remembers about them, by dimension. */
export function MemoryProfilePage({ memory, onBack }: Props) {
  const { people, editEntry, forgetEntry } = memory;
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

        <div key={person.key} className="mp-body">
          {person.sections.length === 0 ? (
            <p className="mp-empty">
              Cozie doesn’t remember anything about {person.subject.kind === 'mom' ? 'you' : person.name} yet.
            </p>
          ) : (
            person.sections.map(({ dim, section }) => (
              <SectionView
                key={dim}
                dim={dim}
                section={section}
                expanded={expanded.has(`${person.key}:${dim}`)}
                onToggle={() => toggle(dim)}
                onEdit={openEdit}
                onForget={setForgetting}
              />
            ))
          )}
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

function SectionView({
  dim,
  section,
  expanded,
  onToggle,
  onEdit,
  onForget,
}: {
  dim: Dimension;
  section: AnySection;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (entry: AnyEntry) => void;
  onForget: (entry: AnyEntry) => void;
}) {
  const label = DIMENSION_LABELS[dim];
  const fields = section.entries.filter((e): e is AnyField => e.kind === 'field');
  const memories = section.entries.filter((e): e is SavedProfileMemory => e.kind === 'memory');
  const summary = validSummary(section);
  const hidden = dim === 'health';
  const [showHealth, setShowHealth] = useState(false);
  const listId = `mp-list-${dim}`;

  if (dim === 'basics' || hidden) {
    const open = hidden ? showHealth : expanded;
    return (
      <section className="mp-section">
        <button type="button" className="mp-reveal mp-section-toggle" aria-expanded={open} onClick={hidden ? () => setShowHealth(!showHealth) : onToggle}>
          <span className="mp-section__title">{label}</span>
          <Chevron dir={open ? 'up' : 'right'} small />
        </button>
        {open && (
          <SectionEntries fields={fields} memories={memories} listId={listId} onEdit={onEdit} onForget={onForget} />
        )}
      </section>
    );
  }

  // Several memories with a still-valid summary read as the summary first.
  const summarised = memories.length > 1 && summary;
  const showList = memories.length > 0 && (!summarised || expanded);

  return (
    <section className="mp-section">
      <h3 className="mp-section__title">{label}</h3>

      {summarised && <p className="mp-summary">{summary.text}</p>}
      {summarised && (
        <button
          type="button"
          className="mp-more"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          onClick={onToggle}
        >
          {expanded ? 'Hide memories' : `View ${memories.length} memories`}
          <Chevron dir={expanded ? 'up' : 'down'} small />
        </button>
      )}
      <SectionEntries fields={fields} memories={showList ? memories : []} listId={listId} onEdit={onEdit} onForget={onForget} />
    </section>
  );
}

function SectionEntries({ fields, memories, listId, onEdit, onForget }: {
  fields: AnyField[];
  memories: SavedProfileMemory[];
  listId: string;
  onEdit: (entry: AnyEntry) => void;
  onForget: (entry: AnyEntry) => void;
}) {
  return (
    <>
      {fields.length > 0 && (
        <dl className="mp-fields">
          {fields.map((f) => (
            <FieldRow key={f.id} entry={f} onEdit={() => onEdit(f)} />
          ))}
        </dl>
      )}
      {memories.length > 0 && (
        <ul className="mp-memories" id={listId}>
          {memories.map((m) => (
            <li key={m.id} className="mp-memory">
              <p className="mp-memory__text">{m.content}</p>
              <div className="mp-memory__foot">
                <span className="mp-memory__meta">
                  {sourceLabel(m.source)} · {m.updatedAt ? `Edited ${formatShortDate(m.updatedAt)}` : formatShortDate(m.createdAt)}
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

    </>
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
