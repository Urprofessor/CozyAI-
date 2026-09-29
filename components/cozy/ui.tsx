'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** App asset root — icons/IP art copied from the iOS App's Asset Catalog. */
export const CZ = '/cozie';

/** Single-colour SVG icon tinted via CSS mask, so it follows `color` like the
 *  App's `.alwaysTemplate` images. */
export function MaskIcon({
  src,
  size = 20,
  className,
  style,
}: {
  src: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('cz-mask-icon', className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        ...style,
      }}
    />
  );
}

// ---------- Glass toast (App: GlassToast) ----------

const TOAST_EVENT = 'cozie:toast';

export function showToast(text: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: text }));
}

export function ToastHost() {
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onToast(e: Event) {
      const text = (e as CustomEvent<string>).detail;
      setToast({ text, key: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 2000);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;
  return (
    <div key={toast.key} className="cz-toast" role="status">
      <img src={`${CZ}/icons/toast_magic.svg`} alt="" />
      <span>{toast.text}</span>
    </div>
  );
}

// ---------- Confirmation alert (App: AgentChatConfirmationAlert) ----------

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="cz-alert-scrim" onClick={onCancel}>
      <div
        className="cz-alert"
        role="alertdialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <strong>{title}</strong>
        <p>{message}</p>
        <div className="cz-alert__actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="is-destructive" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Bottom sheet (App: AgentChatSheetContentHost) ----------

export function BottomSheet({
  open,
  onClose,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className={cn('cz-sheet-scrim', open && 'is-open')} onClick={onClose} aria-hidden />
      <section
        className={cn('cz-sheet', open && 'is-open', className)}
        role="dialog"
        aria-label={label}
        aria-hidden={!open}
      >
        {children}
      </section>
    </>
  );
}
