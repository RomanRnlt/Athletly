// Generates brand-colored PWA icons (no external deps; pure zlib PNG encoder).
//
// Draws a brand-gradient square with a white "A" glyph. Run with:
//   node web/scripts/gen-icons.mjs
// Outputs icon-192.png, icon-512.png, apple-touch-icon.png into web/public/.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

// Brand gradient endpoints (from @athletly/shared tokens).
const G_START = [0x25, 0x63, 0xeb]; // #2563EB
const G_END = [0x7c, 0x3a, 0xed]; // #7C3AED
const WHITE = [0xff, 0xff, 0xff];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// --- minimal vector glyph "A" ---------------------------------------------
// Returns true if pixel (x,y) in a [0..1] unit square is inside the letter A.
function inA(u, v) {
  // v: 0 top .. 1 bottom. Letter occupies u in [0.18..0.82], v in [0.20..0.82].
  if (v < 0.2 || v > 0.82) return false;
  const t = (v - 0.2) / 0.62; // 0 at apex, 1 at base
  const halfWidth = 0.06 + t * 0.18; // legs splay outward
  const center = 0.5;
  const stroke = 0.085;
  const leftOuter = center - halfWidth;
  const rightOuter = center + halfWidth;
  // Left + right diagonal strokes.
  const onLeft = u >= leftOuter && u <= leftOuter + stroke;
  const onRight = u <= rightOuter && u >= rightOuter - stroke;
  // Crossbar around the middle.
  const onBar = t > 0.55 && t < 0.7 && u > leftOuter && u < rightOuter;
  return onLeft || onRight || onBar;
}

function makePng(size) {
  const channels = 4; // RGBA
  const rowLen = size * channels;
  // raw image data with one filter byte (0) per row
  const raw = Buffer.alloc((rowLen + 1) * size);
  const radius = size * 0.22;

  function rounded(x, y) {
    // distance into nearest corner for rounded mask
    const dx = Math.min(x, size - 1 - x);
    const dy = Math.min(y, size - 1 - y);
    if (dx < radius && dy < radius) {
      const cx = dx - radius;
      const cy = dy - radius;
      return cx * cx + cy * cy <= radius * radius;
    }
    return true;
  }

  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowLen + 1);
    raw[rowStart] = 0; // filter type none
    const v = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const off = rowStart + 1 + x * channels;
      const inside = rounded(x, y);
      if (!inside) {
        raw[off] = 0;
        raw[off + 1] = 0;
        raw[off + 2] = 0;
        raw[off + 3] = 0;
        continue;
      }
      const u = x / (size - 1);
      const t = (u + v) / 2; // diagonal gradient
      let r = lerp(G_START[0], G_END[0], t);
      let g = lerp(G_START[1], G_END[1], t);
      let b = lerp(G_START[2], G_END[2], t);
      if (inA(u, v)) {
        r = WHITE[0];
        g = WHITE[1];
        b = WHITE[2];
      }
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = 255;
    }
  }

  return encodePng(size, size, raw);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function encodePng(width, height, raw) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(PUBLIC, { recursive: true });
writeFileSync(join(PUBLIC, 'icon-192.png'), makePng(192));
writeFileSync(join(PUBLIC, 'icon-512.png'), makePng(512));
writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), makePng(180));
console.log('Wrote icon-192.png, icon-512.png, apple-touch-icon.png to', PUBLIC);
