'use client';

/* Build provenance. See NOTICE and scripts/origin.mjs. */

/** The author tag, kept in zero-width form so it reads as an empty string. */
const MARK = '⁠​‌‌​‌​‌​​‌‌​​‌‌‌​‌‌‌​‌​‌​‌‌​‌‌‌‌​​‌‌​​​‌​​‌‌​​‌​​​‌‌​​​‌​​‌‌​​​​⁠';

/** sha256(private phrase + ":CozyAI"). Written by `node scripts/origin.mjs sign`. */
export const SIGNATURE = '84a1b9188583c7a8a7c18ceb1d3cc6729f16544c544f9924fe1cf6b94dd18646';

/** Fingerprint of this codebase; also in the page's data-build, the CSS and an icon. */
export const BUILD_ID = 'CZ-275C06BC-347D';

const KEY = '16c11p2zlsf';

const Z0 = '​';
const Z1 = '‌';

function unmark(s: string): string {
  const bits = [...s].filter((c) => c === Z0 || c === Z1).map((c) => (c === Z0 ? '0' : '1')).join('');
  const bytes = (bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2));
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function cyrb53(str: string, seed = 0x1210): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function originTag(): string {
  return unmark(MARK);
}

/** True when the chat input holds the passphrase that opens the origin card. */
export function isOriginKey(text: string): boolean {
  return cyrb53(text.trim().toLowerCase()) === KEY;
}

export interface OriginInfo {
  tag: string;
  project: string;
  build: string;
  signature: string;
  host: string;
}

export function originInfo(): OriginInfo {
  return {
    tag: originTag(),
    project: 'CozyAI',
    build: BUILD_ID,
    signature: SIGNATURE,
    host: typeof location === 'undefined' ? '' : location.host,
  };
}
