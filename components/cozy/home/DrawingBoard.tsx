'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Eraser, RotateCcw, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FACES } from '@/lib/cozy/home/scene';

// Full-screen drawing board for the prenatal device's 作画. Strokes are kept
// as data (normalised 0–1 coordinates) so undo and resizing simply redraw.
// On save Cozie signs a little bunny in the corner, then the picture is
// exported as a ~600px JPEG.

const PAPER = '#fffaf2';
const COLORS = [
  { name: '豆沙粉', value: '#d98e98' },
  { name: '鼠尾草绿', value: '#8fa77c' },
  { name: '蜂蜜黄', value: '#e6b85c' },
  { name: '天空蓝', value: '#86a9c9' },
  { name: '薰衣草紫', value: '#a48bb8' },
  { name: '可可棕', value: '#7a5a48' },
];
const SIZES = [4, 9, 16]; // on a 360px-wide board; scaled with it

const CHEERS = ['这个颜色好温柔', '宝宝一定会喜欢', '画得真好看', '慢慢画，不着急', '我也想画一个～'];

interface Stroke {
  color: string;
  size: number; // relative to a 360px-wide board
  erase: boolean;
  points: Array<[number, number]>;
}

interface Props {
  defaultTitle: string;
  onClose: () => void;
  onSave: (drawing: { title: string; src: string }) => void;
}

export function DrawingBoard({ defaultTitle, onClose, onSave }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const [count, setCount] = useState(0); // strokes, for re-render
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(SIZES[1]);
  const [erase, setErase] = useState(false);
  const [cheer, setCheer] = useState<string | null>('来画点什么吧～');
  const [signing, setSigning] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Latest tool, read when a stroke starts (state may lag a click by a frame).
  const toolRef = useRef({ color, size, erase });
  toolRef.current = { color, size, erase };

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, s: Stroke) => {
    const k = w / 360;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.erase ? PAPER : s.color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = s.size * k * (s.erase ? 2.2 : 1);
    const pts = s.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0] * w, pts[0][1] * h, (ctx.lineWidth as number) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
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
  }, []);

  const redraw = useCallback(
    (withSignature = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w, h);
      for (const s of strokesRef.current) draw(ctx, w, h, s);
      if (withSignature) drawSignature(ctx, w, h);
    },
    [draw]
  );

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
      redraw(signing);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw, signing]);

  // Cozie cheers you on now and then while you draw.
  useEffect(() => {
    if (count === 0 || count % 6 !== 0) return;
    setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
  }, [count]);
  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);

  function point(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (signing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    currentRef.current = { ...toolRef.current, points: [point(e)] };
    redrawLive();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = currentRef.current;
    if (!s) return;
    s.points.push(point(e));
    redrawLive();
  }

  function up() {
    const s = currentRef.current;
    if (!s) return;
    strokesRef.current = [...strokesRef.current, s];
    currentRef.current = null;
    setCount(strokesRef.current.length);
  }

  // Finished strokes plus the one in progress.
  function redrawLive() {
    redraw();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const s = currentRef.current;
    if (!canvas || !ctx || !s) return;
    const dpr = window.devicePixelRatio || 1;
    draw(ctx, canvas.width / dpr, canvas.height / dpr, s);
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

  function save() {
    if (count === 0 || signing) return;
    // Cozie adds her little signature, then the picture goes up on the board.
    setSigning(true);
    setCheer('我也签个名～');
    redraw(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const out = document.createElement('canvas');
      const W = 600;
      const ratio = canvas.height / canvas.width;
      out.width = W;
      out.height = Math.round(W * ratio);
      const ctx = out.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, out.width, out.height);
      for (const s of strokesRef.current) draw(ctx, out.width, out.height, s);
      drawSignature(ctx, out.width, out.height);
      onSave({ title: defaultTitle, src: out.toDataURL('image/jpeg', 0.86) });
    }, 1100);
  }

  return (
    <div className="ch-draw" role="dialog" aria-label="作画">
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
        <div ref={wrapRef} className="ch-draw__canvas">
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-label="画布"
          />
        </div>
        <div className="ch-draw__cozie" aria-live="polite">
          <img src={FACES.cozie} alt="" />
          {cheer && <span key={cheer}>{cheer}</span>}
        </div>
      </div>

      <footer className="ch-draw__tools">
        <div className="ch-draw__colors">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={cn(!erase && color === c.value && 'is-on')}
              style={{ background: c.value }}
              onClick={() => {
                setColor(c.value);
                setErase(false);
              }}
              aria-label={c.name}
            />
          ))}
          <button
            type="button"
            className={cn('ch-draw__eraser', erase && 'is-on')}
            onClick={() => setErase((v) => !v)}
            aria-label="橡皮擦"
          >
            <Eraser size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="ch-draw__row">
          <div className="ch-draw__sizes">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(size === s && 'is-on')}
                onClick={() => setSize(s)}
                aria-label={s === SIZES[0] ? '细' : s === SIZES[1] ? '中' : '粗'}
              >
                <i style={{ width: s + 2, height: s + 2 }} />
              </button>
            ))}
          </div>
          <div className="ch-draw__actions">
            <button type="button" onClick={undo} disabled={count === 0} aria-label="撤销">
              <RotateCcw size={18} strokeWidth={1.8} />
            </button>
            <button type="button" onClick={clear} disabled={count === 0} aria-label="清空">
              <Trash2 size={18} strokeWidth={1.8} />
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

/** Cozie's little bunny signature, bottom right. */
function drawSignature(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const k = w / 360;
  const x = w - 46 * k;
  const y = h - 40 * k;
  ctx.save();
  ctx.lineWidth = 1.6 * k;
  ctx.strokeStyle = '#c98f97';
  // ears
  ctx.fillStyle = '#f6d3d8';
  for (const dx of [-6, 6]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * k, y - 16 * k, 4 * k, 9 * k, (dx / 6) * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // head
  ctx.fillStyle = '#fff5f2';
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * k, 11 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // face
  ctx.fillStyle = '#5a3d36';
  for (const dx of [-4.5, 4.5]) {
    ctx.beginPath();
    ctx.arc(x + dx * k, y - 1 * k, 1.4 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(232, 150, 160, 0.6)';
  for (const dx of [-8, 8]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * k, y + 3 * k, 2.6 * k, 1.6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#b98088';
  ctx.font = `italic ${10 * k}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Cozie', x, y + 22 * k);
  ctx.restore();
}
