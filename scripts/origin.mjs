#!/usr/bin/env node
// Origin marks for this repo. Kept outside the app bundle.
//
//   node scripts/origin.mjs decode "<pasted text>"   find the hidden tag in copied text
//   node scripts/origin.mjs decode < page.txt         same, from a file / stdin
//   node scripts/origin.mjs encode <tag>              print the zero-width form of a tag
//   node scripts/origin.mjs key <passphrase>          print the passphrase check value
//   node scripts/origin.mjs sign                      ask for your private phrase, write its hash
//   node scripts/origin.mjs verify                    ask for the phrase, check it against the hash
//
// The private phrase is never stored: only sha256(phrase + ":CozyAI") goes in
// lib/origin.ts. Anyone can read the hash; only you can say what produced it.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ORIGIN_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'origin.ts');

// Same alphabet as lib/origin.ts: 0, 1, and a frame marker around each tag.
const Z0 = '​';
const Z1 = '‌';
const ZF = '⁠';

function encode(tag) {
  const bits = [...Buffer.from(tag, 'utf8')].map((b) => b.toString(2).padStart(8, '0')).join('');
  return ZF + [...bits].map((b) => (b === '0' ? Z0 : Z1)).join('') + ZF;
}

function decodeAll(text) {
  const out = [];
  const re = new RegExp(`${ZF}([${Z0}${Z1}]+)${ZF}`, 'g');
  for (const m of text.matchAll(re)) {
    const bits = [...m[1]].map((c) => (c === Z0 ? '0' : '1')).join('');
    const bytes = bits.match(/.{8}/g)?.map((b) => parseInt(b, 2)) ?? [];
    out.push(Buffer.from(bytes).toString('utf8'));
  }
  return out;
}

// cyrb53 — same as lib/origin.ts, so the passphrase itself isn't in the source.
function cyrb53(str, seed = 0x1210) {
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

const sign = (phrase) => createHash('sha256').update(`${phrase}:CozyAI`).digest('hex');

function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(prompt)) process.stdout.write(s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const readStdin = () => readFileSync(0, 'utf8');
const currentSignature = () => readFileSync(ORIGIN_FILE, 'utf8').match(/SIGNATURE = '([0-9a-f]*)'/)?.[1] ?? '';

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case 'decode': {
    const text = rest.length ? rest.join(' ') : readStdin();
    const tags = decodeAll(text);
    console.log(tags.length ? `Found ${tags.length}: ${[...new Set(tags)].join(', ')}` : 'No hidden tag in this text.');
    break;
  }
  case 'encode':
    console.log(JSON.stringify(encode(rest.join(' '))));
    break;
  case 'key':
    console.log(cyrb53(rest.join(' ').trim().toLowerCase()));
    break;
  case 'sign': {
    const phrase = await askHidden('Private phrase (not shown, not saved): ');
    if (!phrase) process.exit(1);
    const again = await askHidden('Once more: ');
    if (again !== phrase) {
      console.log('They did not match. Nothing written.');
      process.exit(1);
    }
    const src = readFileSync(ORIGIN_FILE, 'utf8');
    writeFileSync(ORIGIN_FILE, src.replace(/SIGNATURE = '[0-9a-f]*'/, `SIGNATURE = '${sign(phrase)}'`));
    console.log(`Signed. lib/origin.ts now holds ${sign(phrase).slice(0, 16)}…  Keep the phrase somewhere safe.`);
    break;
  }
  case 'verify': {
    const want = currentSignature();
    if (!want) {
      console.log('lib/origin.ts is not signed yet. Run: node scripts/origin.mjs sign');
      process.exit(1);
    }
    const phrase = await askHidden('Private phrase: ');
    console.log(sign(phrase) === want ? 'Match — this phrase produced the signature.' : 'No match.');
    break;
  }
  default:
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 10).join('\n'));
}
