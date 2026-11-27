#!/usr/bin/env node
// Samples the springs in app/motion.css into CSS linear() curves.
//   node scripts/springs.mjs

function rdp(p,tol){if(p.length<3)return p;const a=p[0],b=p[p.length-1];let md=0,mi=0;for(let i=1;i<p.length-1;i++){const y=a[1]+(b[1]-a[1])*((p[i][0]-a[0])/(b[0]-a[0]));const d=Math.abs(y-p[i][1]);if(d>md){md=d;mi=i}}if(md<=tol)return[a,b];return rdp(p.slice(0,mi+1),tol).slice(0,-1).concat(rdp(p.slice(mi),tol))}
// Damped spring x(t) from 0 to 1, mass 1. Returns CSS linear() and settle time.
function spring(k, c, eps = 0.001) {
  const dt = 1 / 600;
  let x = 0, v = 0, t = 0, last = 0;
  const pts = [[0, 0]];
  while (t < 3) {
    const a = k * (1 - x) - c * v;
    v += a * dt; x += v * dt; t += dt;
    pts.push([t, x]);
    if (Math.abs(1 - x) > eps || Math.abs(v) > eps * 10) last = t;
  }
  const T = last;
  const raw = pts.filter(([tt]) => tt <= T).map(([tt, xx]) => [tt / T, xx]);
  raw.push([1, 1]);
  const keep = rdp(raw, 0.0035);
  const peak = Math.max(...raw.map((p) => p[1]));
  const body = keep.map(([tt, xx], i) => (i === 0 || i === keep.length - 1 ? `${+xx.toFixed(3)}` : `${+xx.toFixed(3)} ${+(tt * 100).toFixed(1)}%`)).join(', ');
  return { css: `linear(${body})`, ms: Math.round(T * 1000), points: keep.length, overshoot: +((peak - 1) * 100).toFixed(1) };
}
for (const [name, k, c] of [['smooth', 170, 26], ['snappy', 420, 38], ['soft', 220, 21], ['bouncy', 320, 16]]) {
  const s = spring(k, c);
  console.log(name, s.ms + 'ms', s.points + 'pts', 'overshoot ' + s.overshoot + '%');
  console.log('  ' + s.css);
}
