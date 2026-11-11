'use client';

import { useEffect, useState } from 'react';
import type { DatedLabel } from '@/lib/cozy/memory-profile';
import { FIELD_LABELS, type AnyEntry, type EntryEdit } from '@/lib/cozy/memory-profile-demo';
import { BottomSheet } from '../ui';

interface Props {
  open: boolean;
  /** Kept after close so the sheet's content doesn't vanish mid-slide. */
  entry: AnyEntry | null;
  onClose: () => void;
  onSave: (patch: Omit<EntryEdit, 'updatedAt'>) => void;
  onForget: () => void;
}

/** Edit one memory or field in place, or hand it to Forget. */
export function MemoryEditSheet({ open, entry, onClose, onSave, onForget }: Props) {
  const [text, setText] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!open || !entry) return;
    if (entry.kind === 'memory') {
      setText(entry.content);
      setDate('');
    } else if (entry.field === 'importantDate' || entry.field === 'recentConcern') {
      const v = entry.value as DatedLabel;
      setText(v.label);
      setDate(v.date);
    } else if (entry.field === 'birthDate') {
      setText('');
      setDate(entry.value as string);
    } else {
      setText(entry.value as string);
      setDate('');
    }
  }, [open, entry]);

  if (!entry) return <BottomSheet open={false} onClose={onClose} label="Edit memory">{null}</BottomSheet>;

  const isMemory = entry.kind === 'memory';
  const dated = !isMemory && (entry.field === 'importantDate' || entry.field === 'recentConcern');
  const dateOnly = !isMemory && entry.field === 'birthDate';
  const label = isMemory ? 'What Cozie remembers' : dated ? 'Label' : FIELD_LABELS[entry.field];
  const canSave = dateOnly ? !!date : text.trim().length > 0 && (!dated || !!date);

  function save() {
    if (!canSave || !entry) return;
    if (entry.kind === 'memory') onSave({ content: text.trim() });
    else if (dated) onSave({ value: { label: text.trim(), date } });
    else if (dateOnly) onSave({ value: date });
    else onSave({ value: text.trim() });
  }

  return (
    <BottomSheet open={open} onClose={onClose} label="Edit memory" className="mp-edit">
      <div className="cz-sheet__grabber" />
      <form
        className="mp-edit__body"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h2 className="mp-edit__title">{isMemory ? 'Edit memory' : `Edit ${FIELD_LABELS[entry.field].toLowerCase()}`}</h2>

        {!dateOnly && (
          <label className="mp-edit__field">
            <span>{label}</span>
            {isMemory ? (
              <textarea value={text} rows={4} maxLength={300} onChange={(e) => setText(e.target.value)} />
            ) : (
              <input value={text} maxLength={80} onChange={(e) => setText(e.target.value)} />
            )}
          </label>
        )}
        {(dated || dateOnly) && (
          <label className="mp-edit__field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        )}

        <p className="mp-edit__hint">Cozie will use your wording from now on. Summaries that relied on the old version are set aside.</p>

        <button type="submit" className="cz-primary-btn" disabled={!canSave}>
          Save
        </button>
        <div className="mp-edit__secondary">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="is-destructive" onClick={onForget}>
            Forget
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
