'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { useMemoryProfile } from '@/hooks/useMemoryProfile';
import type { DatedLabel, SavedProfileMemory } from '@/lib/cozy/memory-profile';
import {
  DIMENSION_LABELS,
  FIELD_LABELS,
  fieldText,
  formatShortDate,
  isEditable,
  sourceLabel,
  updateDraft,
  validSummary,
  type AnyEntry,
  type AnyField,
  type AnySection,
  type Dimension,
  type MemoryPerson,
} from '@/lib/cozy/memory-profile-demo';
import { BottomSheet, ConfirmDialog, showToast } from '../ui';
import { MemoryEditSheet } from './MemoryEditSheet';
import { MemoryOrbit } from './MemoryOrbit';
import { Portrait } from './Portrait';

type Memory = ReturnType<typeof useMemoryProfile>;

interface Props {
  memory: Memory;
  onBack: () => void;
  onUpdateInChat: (draft: string) => void;
}

/** Memory profile: switch between mom and each baby on the orbit, then read,
 *  edit or forget what Cozie remembers about them, by dimension. */
export function MemoryProfilePage({ memory, onBack, onUpdateInChat }: Props) {
  const { people, editEntry, forgetEntry } = memory;
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [lastDim, setLastDim] = useState<Dimension | null>(null);
  const [viewAll, setViewAll] = useState(false);
  const [editing, setEditing] = useState<AnyEntry | null>(null);
  const [sheetEntry, setSheetEntry] = useState<AnyEntry | null>(null);
  const [forgetting, setForgetting] = useState<AnyEntry | null>(null);

  const safeIndex = Math.min(index, people.length - 1);
  const person = people[safeIndex];

  // The dimension "Update in chat" names belongs to the person on screen.
  useEffect(() => setLastDim(null), [person.key]);

  function select(i: number) {
    setIndex(i);
  }

  function toggle(dim: Dimension) {
    const key = `${person.key}:${dim}`;
    setLastDim(dim);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openEdit(entry: AnyEntry, dim: Dimension) {
    setLastDim(dim);
    setSheetEntry(entry);
    setEditing(entry);
  }

  function confirmForget(entry: AnyEntry, dim: Dimension) {
    setLastDim(dim);
    setForgetting(entry);
  }

  return (
    <div className="mp-page">
      <header className="mp-topbar">
        <button type="button" className="mp-topbar__back" onClick={onBack} aria-label="Back to chat history">
          <Chevron dir="left" />
        </button>
        <h1 className="mp-topbar__title">Memory profile</h1>
        {people.length > 1 && (
          <button type="button" className="mp-topbar__all" onClick={() => setViewAll(true)}>
            View all
            <Chevron dir="right" small />
          </button>
        )}
      </header>

      <div className="mp-scroll">
        <MemoryOrbit people={people} index={safeIndex} onSelect={select} />

        <div className="mp-identity" aria-live="polite">
          <h2 className="mp-identity__name">{person.name}</h2>
          {person.ageLabel && <p className="mp-identity__age">{person.ageLabel}</p>}
        </div>

        <div key={person.key} className="mp-body">
          <h3 className="mp-body__title">About {person.name}</h3>

          {person.sections.length === 0 ? (
            <p className="mp-empty">
              Cozie doesn’t remember anything about {person.subject.kind === 'mom' ? 'you' : person.name} yet.
              Share a little in chat and it will show up here.
            </p>
          ) : (
            person.sections.map(({ dim, section }) => (
              <SectionView
                key={dim}
                dim={dim}
                section={section}
                expanded={expanded.has(`${person.key}:${dim}`)}
                onToggle={() => toggle(dim)}
                onEdit={(e) => openEdit(e, dim)}
                onForget={(e) => confirmForget(e, dim)}
              />
            ))
          )}

          <div className="mp-update">
            <button
              type="button"
              className="mp-update__btn"
              onClick={() => onUpdateInChat(updateDraft(person, lastDim))}
            >
              Update in chat
            </button>
            <p>Cozie opens your chat with a draft. You send it when you’re ready.</p>
          </div>
        </div>
      </div>

      <BottomSheet open={viewAll} onClose={() => setViewAll(false)} label="Everyone Cozie remembers">
        <div className="cz-sheet__grabber" />
        <div className="mp-all">
          <h2 className="mp-all__title">Everyone</h2>
          <ul>
            {people.map((p, i) => (
              <li key={p.key}>
                <button
                  type="button"
                  className={cn('mp-all__row', i === safeIndex && 'is-selected')}
                  aria-current={i === safeIndex ? 'true' : undefined}
                  onClick={() => {
                    select(i);
                    setViewAll(false);
                  }}
                >
                  <span className="mp-all__thumb">
                    <Portrait name={p.name} personKey={p.key} src={p.portraitUrl} />
                  </span>
                  <span className="mp-all__text">
                    <strong>{p.name}</strong>
                    <span>{personSubtitle(p)}</span>
                  </span>
                  {i === safeIndex && <span className="mp-all__check" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>

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
          message="Cozie won’t use it in future answers. You can’t undo this."
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

function personSubtitle(p: MemoryPerson) {
  if (p.subject.kind === 'mom') return 'You';
  return p.ageLabel ? p.ageLabel.replace(/ old$/, '') : 'Baby';
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
  const [revealed, setRevealed] = useState(!hidden);
  const listId = `mp-list-${dim}`;

  if (hidden && !revealed) {
    return (
      <section className="mp-section">
        <h4 className="mp-section__title">{label}</h4>
        <button type="button" className="mp-reveal" aria-expanded={false} onClick={() => setRevealed(true)}>
          <span>
            {section.entries.length} {section.entries.length === 1 ? 'item' : 'items'} · hidden for privacy
          </span>
          <span className="mp-reveal__action">Show</span>
        </button>
      </section>
    );
  }

  // Several memories with a still-valid summary read as the summary first.
  const summarised = memories.length > 1 && summary;
  const showList = memories.length > 0 && (!summarised || expanded);

  return (
    <section className="mp-section">
      <div className="mp-section__head">
        <h4 className="mp-section__title">{label}</h4>
        {hidden && (
          <button type="button" className="mp-section__hide" aria-expanded onClick={() => setRevealed(false)}>
            Hide
          </button>
        )}
      </div>

      {fields.length > 0 && (
        <dl className="mp-fields">
          {fields.map((f) => (
            <FieldRow key={f.id} entry={f} onEdit={() => onEdit(f)} />
          ))}
        </dl>
      )}

      {summarised && <p className="mp-summary">{summary.text}</p>}

      {showList && (
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
    </section>
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
