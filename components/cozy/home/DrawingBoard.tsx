'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DRAW_ART } from '@/lib/cozy/home/scene';

// Full-screen drawing board for the prenatal device's 作画, skinned with the
// soft-clay art in public/cozie/home/drawing. Strokes are kept as data
// (normalised 0–1 coordinates) on a transparent canvas over the paper
// texture, so undo, the eraser and resizing all just redraw. On save Cozie
// stamps her signature and the picture is exported as a ~600px JPEG.

const PAPER = '#fffaf2';
const COLORS = [
  { id: 'rose', name: '豆沙粉', value: '#d98e98' },
  { id: 'sage', name: '鼠尾草绿', value: '#8fa77c' },
  { id: 'honey', name: '蜂蜜黄', value: '#e6b85c' },
  { id: 'sky', name: '天空蓝', value: '#86a9c9' },
  { id: 'lilac', name: '薰衣草紫', value: '#a48bb8' },
  { id: 'cocoa', name: '可可棕', value: '#7a5a48' },
] as const;
const SIZES = [
  { id: 's', label: '细', width: 4 },
  { id: 'm', label: '中', width: 9 },
  { id: 'l', label: '粗', width: 16 },
] as const; // widths on a 360px-wide board, scaled with it

const CHEERS = ['这个颜色好温柔', '宝宝一定会喜欢', '画得真好看', '慢慢画，不着急', '我也想画一个～'];

interface Stroke {
  color: string;
  size: number;
  erase: boolean;
  points: Array<[number, number]>;
}

interface Props {
  defaultTitle: string;
  onClose: () => void;
  onSave: (drawing: { title: string; src: string }) => void;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function DrawingBoard({ defaultTitle, onClose, onSave }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const [count, setCount] = useState(0);
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [size, setSize] = useState<number>(SIZES[1].width);
  const [erase, setErase] = useState(false);
  const [cheer, setCheer] = useState<string | null>('来画点什么吧～');
  const [signing, setSigning] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Latest tool, read when a stroke starts (state may lag a click by a frame).
  const toolRef = useRef({ color, size, erase });
  toolRef.current = { color, size, erase };

  // Strokes only; the paper shows through from behind the canvas.
  const paint = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, s: Stroke) => {
    const k = w / 360;
    ctx.save();
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size * k * (s.erase ? 2.2 : 1);
    const pts = s.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0] * w, pts[0][1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = ((pts[i][0] + pts[i + 1][0]) / 2) * w;
        const my = ((pts[i][1] + pts[i + 1][1]) / 2) * h;
        ctx.quadraticCurveTo(pts[i][0] * w, pts[i][1] * h, mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0] * w, last[1] * h);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of strokesRef.current) paint(ctx, w, h, s);
    if (currentRef.current) paint(ctx, w, h, currentRef.current);
  }, [paint]);

  // Size the canvas to its box (crisp on high-DPI screens).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  // Warm the export images.
  useEffect(() => {
    void loadImage(DRAW_ART.texture).catch(() => {});
    void loadImage(DRAW_ART.signature).catch(() => {});
  }, []);

  // Cozie cheers you on now and then while you draw.
  useEffect(() => {
    if (count === 0 || count % 6 !== 0) return;
    setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
  }, [count]);
  useEffect(() => {
    if (!cheer || signing) return;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer, signing]);

  function point(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (signing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    currentRef.current = { ...toolRef.current, points: [point(e)] };
    redraw();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = currentRef.current;
    if (!s) return;
    s.points.push(point(e));
    redraw();
  }

  function up() {
    const s = currentRef.current;
    if (!s) return;
    strokesRef.current = [...strokesRef.current, s];
    currentRef.current = null;
    setCount(strokesRef.current.length);
  }

  function undo() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setCount(strokesRef.current.length);
    redraw();
  }

  function clear() {
    strokesRef.current = [];
    setCount(0);
    redraw();
  }

  async function save() {
    if (count === 0 || signing) return;
    // Cozie stamps her signature, then the picture goes up on the board.
    setSigning(true);
    setCheer('我也签个名～');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const [texture, signature] = await Promise.all([
      loadImage(DRAW_ART.texture).catch(() => null),
      loadImage(DRAW_ART.signature).catch(() => null),
      new Promise((r) => setTimeout(r, 1100)),
    ]);
    const W = 600;
    const H = Math.round((W * canvas.height) / canvas.width);
    // Strokes on their own layer (so the eraser cuts back to the paper)...
    const ink = document.createElement('canvas');
    ink.width = W;
    ink.height = H;
    const inkCtx = ink.getContext('2d');
    // ...over the paper.
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');
    if (!ctx || !inkCtx) return;
    for (const s of strokesRef.current) paint(inkCtx, W, H, s);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    if (texture) {
      const pattern = ctx.createPattern(texture, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.drawImage(ink, 0, 0);
    if (signature) {
      const sw = W * 0.2;
      const sh = (sw * signature.height) / signature.width;
      ctx.drawImage(signature, W - sw - W * 0.04, H - sh - W * 0.04, sw, sh);
    }
    onSave({ title: defaultTitle, src: out.toDataURL('image/jpeg', 0.86) });
  }

  return (
    <div className="ch-draw" role="dialog" aria-label="作画" style={{ backgroundImage: `url(${DRAW_ART.bg})` }}>
      <header className="ch-draw__top">
        <button
          type="button"
          className="cz-glass-btn"
          onClick={() => (count > 0 ? setConfirmLeave(true) : onClose())}
          aria-label="关闭画板"
        >
          <X size={22} strokeWidth={1.8} />
        </button>
        <strong>给宝宝画一幅画</strong>
        <button type="button" className="ch-draw__save" onClick={save} disabled={count === 0 || signing}>
          保存
        </button>
      </header>

      <div className="ch-draw__paper">
        <div ref={wrapRef} className="ch-draw__canvas" style={{ backgroundImage: `url(${DRAW_ART.texture})` }}>
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-label="画布"
          />
          {signing && <img className="ch-draw__signature" src={DRAW_ART.signature} alt="Cozie 的签名" />}
        </div>
        <img className="ch-draw__frame" src={DRAW_ART.frame} alt="" aria-hidden />
        <div className="ch-draw__cozie" aria-live="polite">
          <img src={cheer ? DRAW_ART.peekHappy : DRAW_ART.peek} alt="" />
          {cheer && <span key={cheer}>{cheer}</span>}
        </div>
      </div>

      <footer className="ch-draw__tools" style={{ backgroundImage: `url(${DRAW_ART.tray})` }}>
        <div className="ch-draw__colors">
          {COLORS.map((c) => {
            const on = !erase && color === c.value;
            return (
              <button
                key={c.id}
                type="button"
                className={cn('ch-draw__swatch', on && 'is-on')}
                onClick={() => {
                  setColor(c.value);
                  setErase(false);
                }}
                aria-label={c.name}
                aria-pressed={on}
              >
                <img src={DRAW_ART.swatch(c.id, on)} alt="" />
              </button>
            );
          })}
          <button
            type="button"
            className={cn('ch-draw__swatch', erase && 'is-on')}
            onClick={() => setErase((v) => !v)}
            aria-label="橡皮擦"
            aria-pressed={erase}
          >
            <img src={erase ? DRAW_ART.tool('eraser_on') : DRAW_ART.tool('eraser')} alt="" />
          </button>
        </div>
        <div className="ch-draw__row">
          <div className="ch-draw__sizes">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cn('ch-draw__tool', size === s.width && 'is-on')}
                onClick={() => setSize(s.width)}
                aria-label={s.label}
                aria-pressed={size === s.width}
              >
                <img src={DRAW_ART.tool(`size_${s.id}`)} alt="" />
              </button>
            ))}
          </div>
          <div className="ch-draw__actions">
            <button type="button" className="ch-draw__tool" onClick={undo} disabled={count === 0} aria-label="撤销">
              <img src={DRAW_ART.tool(count === 0 ? 'undo_off' : 'undo')} alt="" />
            </button>
            <button type="button" className="ch-draw__tool" onClick={clear} disabled={count === 0} aria-label="清空">
              <img src={DRAW_ART.tool(count === 0 ? 'clear_off' : 'clear')} alt="" />
            </button>
          </div>
        </div>
      </footer>

      {confirmLeave && (
        <div className="cz-alert-scrim" onClick={() => setConfirmLeave(false)}>
          <div className="cz-alert" role="alertdialog" aria-label="不保存就离开吗？" onClick={(e) => e.stopPropagation()}>
            <strong>不保存就离开吗？</strong>
            <p>这幅画还没保存，离开后就没有了。</p>
            <div className="cz-alert__actions">
              <button type="button" onClick={() => setConfirmLeave(false)}>
                继续画
              </button>
              <button type="button" className="is-destructive" onClick={onClose}>
                离开
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FrameArt {
  src: string;
  aspect: number; // height / width
  window: number[]; // left, top, right, bottom (fractions)
}

/** A saved drawing inside one of the clay frames (pinned card, gallery card,
 *  wooden viewer frame). The frames have an opaque card centre, so the
 *  drawing is laid into the frame's window. */
export function Framed({
  frame,
  src,
  alt = '',
  pin,
  caption,
  className,
}: {
  frame: FrameArt;
  src: string;
  alt?: string;
  pin?: string;
  caption?: string;
  className?: string;
}) {
  const [l, t, r, b] = frame.window;
  return (
    <span className={cn('ch-framed', className)} style={{ aspectRatio: `1 / ${frame.aspect}` }}>
      <img className="ch-framed__frame" src={frame.src} alt="" draggable={false} />
      <img
        className="ch-framed__art"
        src={src}
        alt={alt}
        draggable={false}
        style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${(r - l) * 100}%`, height: `${(b - t) * 100}%` }}
      />
      {caption && (
        <span className="ch-framed__caption" style={{ top: `${b * 100}%` }}>
          {caption}
        </span>
      )}
      {pin && <img className="ch-framed__pin" src={pin} alt="" draggable={false} />}
    </span>
  );
}
