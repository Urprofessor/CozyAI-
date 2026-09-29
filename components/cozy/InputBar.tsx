'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { COZY_MAX_IMAGE_MB, COZY_MAX_IMAGES_PER_MSG } from '@/lib/cozy/constants';
import { CZ, MaskIcon, showToast } from './ui';

interface Props {
  streaming: boolean;
  pendingImages: string[];
  onAddImages: (files: File[]) => void;
  onRemoveImage: (idx: number) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Keyboard (touch focus) state, so the page can hide home/quick access. */
  onKeyboardChange?: (open: boolean) => void;
}

// Metrics from the App's InputBoxComponent.
const MAX_CHARS = 800;
const STORAGE_LIMIT = 1000;
const LINE = 22;
const EXPAND_THRESHOLD = 4; // lines before the expand affordance appears
const VISIBLE_LINES = 5; // lines before the field scrolls
const PILL_H = 52;
const MULTI_CHROME = 84; // 16 top + 16 gap + 52 action row

/** App InputBoxComponent: glass pill with mic + send/stop on the right, which
 *  grows into a multi-line card with an action row once text wraps. The "+"
 *  attach button is demo-only (image questions go to the vision model). */
export function InputBar({
  streaming,
  pendingImages,
  onAddImages,
  onRemoveImage,
  onSend,
  onStop,
  onKeyboardChange,
}: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pillWidth, setPillWidth] = useState(0);
  const pillRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    // Measure now too: ResizeObserver only reports on a rendered frame.
    setPillWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setPillWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('kb-open');
    };
  }, []);

  const hasText = text.trim().length > 0;
  const hasContent = hasText || pendingImages.length > 0;
  const tooLong = text.length > MAX_CHARS;
  const showVoice = !streaming;
  const showSend = streaming || hasContent || focused;
  const canSend = hasContent && !tooLong && !streaming;

  // Right inset of the compact field depends on which buttons are showing.
  const compactRight = showVoice && showSend ? 96 : showVoice || showSend ? 52 : 16;
  const LEFT = 48; // room for the "+" attach button

  const compactLines = countLines(measureRef.current, text, pillWidth - LEFT - compactRight);
  const multi = compactLines > 1;
  const naturalLines = multi ? countLines(measureRef.current, text, pillWidth - 32) : compactLines;
  const showExpand = multi && naturalLines > EXPAND_THRESHOLD;
  const multiRight = showExpand ? 52 : 16;
  const lines = multi ? countLines(measureRef.current, text, pillWidth - 16 - multiRight) : 1;
  const showValidation = tooLong && multi;
  const visibleLines = Math.min(Math.max(lines, 1), VISIBLE_LINES);
  const pillHeight = multi
    ? visibleLines * LINE + MULTI_CHROME + (showValidation ? 18 + 4 - 16 : 0)
    : PILL_H;

  function isTouch() {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  }
  function onFocus() {
    setFocused(true);
    if (isTouch()) {
      document.documentElement.classList.add('kb-open');
      onKeyboardChange?.(true);
    }
  }
  function onBlur() {
    setFocused(false);
    document.documentElement.classList.remove('kb-open');
    onKeyboardChange?.(false);
  }

  function submit() {
    if (!canSend) return;
    onSend(text);
    setText('');
  }

  function onPrimary() {
    if (streaming) onStop();
    else submit();
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop convenience: Enter sends, Shift+Enter breaks the line.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isTouch()) {
      e.preventDefault();
      submit();
    }
  }

  function onChange(value: string) {
    setText(value.length > STORAGE_LIMIT ? value.slice(0, STORAGE_LIMIT) : value);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const limit = COZY_MAX_IMAGE_MB * 1024 * 1024;
    if (files.some((f) => f.size > limit)) showToast(`Images over ${COZY_MAX_IMAGE_MB}MB are skipped.`);
    const ok = files.filter((f) => f.size <= limit);
    if (pendingImages.length + ok.length > COZY_MAX_IMAGES_PER_MSG) {
      showToast(`You can add up to ${COZY_MAX_IMAGES_PER_MSG} images.`);
    }
    onAddImages(ok);
    e.target.value = '';
  }

  return (
    <div className="cz-input">
      {/* Hidden mirror used to count wrapped lines at a given width. */}
      <div ref={measureRef} className="cz-input__measure" aria-hidden />

      {pendingImages.length > 0 && (
        <div className="cz-input__attachments">
          {pendingImages.map((url, i) => (
            <div key={i} className="cz-input__thumb">
              <img src={url} alt="" />
              <button type="button" onClick={() => onRemoveImage(i)} aria-label="Remove image">
                <MaskIcon src={`${CZ}/icons/voice_close.svg`} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFile} />

      <div
        ref={pillRef}
        className={cn('cz-input__pill', multi && 'is-multi')}
        style={{ height: pillHeight }}
      >
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Talk with Cozie"
          aria-label="Message Cozie"
          className="cz-input__field"
          style={
            multi
              ? {
                  paddingRight: multiRight,
                  height: visibleLines * LINE,
                  overflowY: lines > VISIBLE_LINES ? 'auto' : 'hidden',
                }
              : { paddingRight: compactRight, paddingLeft: LEFT }
          }
        />

        {showExpand && (
          <button
            type="button"
            className="cz-input__expand"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setFullscreen(true)}
            aria-label="Expand editor"
          >
            <img src={`${CZ}/icons/input_expand.svg`} alt="" />
          </button>
        )}

        {showValidation && (
          <div className="cz-input__validation">
            <span>Your message is too long. Shorten it and try again.</span>
            <span>
              <em>{text.length}</em>/{MAX_CHARS}
            </span>
          </div>
        )}

        <button
          type="button"
          className="cz-input__attach"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          aria-label="Add image"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <div className="cz-input__buttons">
          {showVoice && (
            <button
              type="button"
              className="cz-input__mic"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => showToast('Voice input is coming soon.')}
              aria-label="Voice input"
            >
              <MaskIcon src={`${CZ}/icons/mic.svg`} size={20} />
            </button>
          )}
          {showSend && (
            <SendButton streaming={streaming} enabled={canSend} onPress={onPrimary} />
          )}
        </div>
      </div>

      {fullscreen && (
        <FullScreenEditor
          text={text}
          streaming={streaming}
          canSend={canSend}
          tooLong={tooLong}
          onChange={onChange}
          onCollapse={() => {
            setFullscreen(false);
            requestAnimationFrame(() => taRef.current?.focus());
          }}
          onSend={() => {
            setFullscreen(false);
            submit();
          }}
          onStop={onStop}
        />
      )}
    </div>
  );
}

function SendButton({
  streaming,
  enabled,
  onPress,
}: {
  streaming: boolean;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className={cn('cz-send', (streaming || enabled) && 'is-enabled')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      aria-label={streaming ? 'Stop generating' : 'Send'}
      aria-disabled={!streaming && !enabled}
    >
      {streaming ? (
        <span className="cz-send__stop" />
      ) : (
        <img className="cz-send__arrow" src={`${CZ}/icons/send_arrow.svg`} alt="" />
      )}
    </button>
  );
}

/** App AgentChatFullScreenInputViewController: full-height editor with a
 *  collapse button and the same send/stop control. */
function FullScreenEditor({
  text,
  streaming,
  canSend,
  tooLong,
  onChange,
  onCollapse,
  onSend,
  onStop,
}: {
  text: string;
  streaming: boolean;
  canSend: boolean;
  tooLong: boolean;
  onChange: (v: string) => void;
  onCollapse: () => void;
  onSend: () => void;
  onStop: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  return (
    <div className="cz-fullinput" role="dialog" aria-label="Edit message">
      <div className="cz-fullinput__card">
        <button type="button" className="cz-input__expand" onClick={onCollapse} aria-label="Collapse editor">
          <img src={`${CZ}/icons/input_collapse.svg`} alt="" />
        </button>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="cz-fullinput__field"
          placeholder="Talk with Cozie"
        />
        <div className="cz-fullinput__foot">
          {tooLong ? (
            <span className="cz-fullinput__error">
              <em>{text.length}</em>/{MAX_CHARS}
            </span>
          ) : (
            <span />
          )}
          <SendButton streaming={streaming} enabled={canSend} onPress={streaming ? onStop : onSend} />
        </div>
      </div>
    </div>
  );
}

function countLines(mirror: HTMLDivElement | null, text: string, width: number): number {
  if (!mirror || !text || width <= 40) return 1;
  mirror.style.width = `${width}px`;
  // A trailing newline still occupies a line in the textarea.
  mirror.textContent = text.endsWith('\n') ? text + '​' : text;
  return Math.max(1, Math.round(mirror.scrollHeight / LINE));
}
