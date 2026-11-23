// Tiny stack VM (ISA v1). Runs every program in MAKEFUN_INPUT_DIR, writes
// stdout + exit code to MAKEFUN_OUTPUT_DIR. Node 22, stdlib only.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(P, Q) {
  const S = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), u = new Uint8Array(65536);
  let s = 0, c = 0, p = 0, t = 0, i = 0, l = 0;
  const n = P.length;
  const d = (e) => ({ out: u.slice(0, l), code: e });
  for (;;) {
    if (t === 1000000) return d(10);
    if (p < 0 || p >= n) return d(9);
    const o = P[p];
    const k = o <= 0x07 || (o >= 0x10 && o <= 0x1e) || (o >= 0x20 && o <= 0x22) || (o >= 0x30 && o <= 0x34) || (o >= 0x40 && o <= 0x41) || (o >= 0x50 && o <= 0x53);
    if (!k) return d(5);
    const m = o === 0x01 ? 1 : o === 0x02 ? 4 : o >= 0x30 && o <= 0x33 ? 2 : 0;
    if (p + m >= n) return d(9);
    t++;
    const x = p + 1 + m;
    p = x;
    switch (o) {
      case 0x00: return d(0);
      case 0x01:
        if (s >= 256) return d(3);
        S[s++] = (P[x - 1] << 24) >> 24;
        break;
      case 0x02:
        if (s >= 256) return d(3);
        S[s++] = P[x - 4] | (P[x - 3] << 8) | (P[x - 2] << 16) | (P[x - 1] << 24);
        break;
      case 0x03:
        if (s < 1) return d(2);
        s--;
        break;
      case 0x04:
        if (s < 1) return d(2); if (s >= 256) return d(3);
        S[s] = S[s - 1]; s++;
        break;
      case 0x05: {
        if (s < 2) return d(2);
        const v = S[s - 1];
        S[s - 1] = S[s - 2];
        S[s - 2] = v;
        break;
      }
      case 0x06:
        if (s < 2) return d(2); if (s >= 256) return d(3);
        S[s] = S[s - 2]; s++;
        break;
      case 0x07: {
        if (s < 3) return d(2);
        const a = S[s - 3];
        S[s - 3] = S[s - 2];
        S[s - 2] = S[s - 1];
        S[s - 1] = a;
        break;
      }
      case 0x17:
        if (s < 1) return d(2);
        S[s - 1] = -S[s - 1] | 0;
        break;
      case 0x1b:
        if (s < 1) return d(2);
        S[s - 1] = ~S[s - 1];
        break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e: case 0x20: case 0x21: case 0x22: {
        if (s < 2) return d(2);
        const b = S[s - 1];
        const a = S[s - 2];
        let r;
        if (o === 0x10) r = (a + b) | 0;
        else if (o === 0x11) r = (a - b) | 0;
        else if (o === 0x12) r = Math.imul(a, b);
        else if (o === 0x13) { if (!b) return d(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
        else if (o === 0x14) { if (!b) return d(4); r = b === -1 ? 0 : (a % b) | 0; }
        else if (o === 0x15) { if (!b) return d(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (o === 0x16) { if (!b) return d(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (o === 0x18) r = a & b;
        else if (o === 0x19) r = a | b;
        else if (o === 0x1a) r = a ^ b;
        else if (o === 0x1c) r = a << (b & 31);
        else if (o === 0x1d) r = a >> (b & 31);
        else if (o === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (o === 0x20) r = a === b ? 1 : 0;
        else if (o === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        s -= 2;
        S[s++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((P[x - 2] | (P[x - 1] << 8)) << 16) >> 16;
        let take = true;
        if (o !== 0x30) {
          if (s < 1) return d(2);
          const v = S[--s];
          take = o === 0x31 ? v === 0 : v !== 0;
        }
        if (take) p = x + rel;
        break;
      }
      case 0x33:
        if (c === 64) return d(7);
        C[c++] = x;
        p = P[x - 2] | (P[x - 1] << 8);
        break;
      case 0x34:
        if (c === 0) return d(8);
        p = C[--c];
        break;
      case 0x40: {
        if (s < 1) return d(2);
        const addr = S[s - 1];
        if (addr < 0 || addr >= 256) return d(6);
        S[s - 1] = M[addr];
        break;
      }
      case 0x41: {
        if (s < 2) return d(2);
        const addr = S[s - 1];
        const v = S[s - 2];
        if (addr < 0 || addr >= 256) return d(6);
        s -= 2;
        M[addr] = v;
        break;
      }
      case 0x50: {
        if (s < 1) return d(2);
        const w = String(S[s - 1]);
        if (l + w.length > 65536) return d(11);
        s--;
        for (let j = 0; j < w.length; j++) u[l++] = w.charCodeAt(j);
        break;
      }
      case 0x51:
        if (s < 1) return d(2);
        if (l + 1 > 65536) return d(11);
        u[l++] = S[--s] & 255;
        break;
      case 0x52:
        if (s >= 256) return d(3);
        S[s++] = i < Q.length ? Q[i++] : -1;
        break;
      case 0x53:
        if (s < 1) return d(2);
        return d(S[--s] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), r.code + '\n');
}
