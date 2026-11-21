// Sundown Racket Cover Studio's render engine: draws the whole cover — graded
// panels with a cast name tag each, a big chrome title over a sunset gradient
// bar, a neon script subtitle, a tagline, a five-star review strip, a billing
// block, a barcode and a gold seal, plus grain and vignette — onto any canvas,
// at any post size. The same code draws the live preview and the exported PNG,
// so what you see is what you share.

import { gradedPhoto, GRADES } from './grades.js';
import { layoutCover } from './layouts.js';

const INK = '#14041f';
const PAPER = '#fff8ee';
const GOLD = '#ffd166';

/** The cast names a fresh cover starts with, one per hero-layout panel. */
export const CHARACTER_TAGS = [
  'THE DRIVER',
  'THE MECHANIC',
  'THE CAPTAIN',
  'THE RIDER',
  'THE FIXER',
  'THE LOOKOUT',
  'THE BOSS',
];

/**
 * Default panel slots for the hero layout, face-aware by design: every slot
 * gets its own photo and its own crop, so the four sample photos read as
 * seven different shots. The hero (slot 0) is a tight face close-up; the
 * side panels alternate wide shots and punched-in crops, and where a photo
 * repeats it is framed from the opposite side at a different zoom, so no
 * repetition is visible. `oy` pans toward the top where faces sit.
 */
const HERO_SLOTS = [
  { photo: 0, zoom: 2.1, ox: 0.1, oy: 0.9 },
  { photo: 2, zoom: 1.45, ox: -0.45, oy: 0.2 },
  { photo: 3, zoom: 1.25, ox: 0, oy: 0.1 },
  { photo: 1, zoom: 1.85, ox: -0.2, oy: 0.9 },
  { photo: 3, zoom: 2.0, ox: 0.45, oy: -0.4 },
  { photo: 2, zoom: 2.2, ox: 0.4, oy: -0.8 },
  { photo: 1, zoom: 1.15, ox: 0.5, oy: 0 },
];

/** The seven panel slots a fresh cover starts with (hero layout). */
export function defaultPanels() {
  return HERO_SLOTS.map((slot) => ({ ...slot, tag: '' }));
}

/** The name tags a fresh cover starts with (editable per panel). */
export function defaultNameTags() {
  return [...CHARACTER_TAGS];
}

/** Loads the cover fonts (Anton, Pacifico, Bebas Neue) before first paint. */
export async function ensureCoverFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fallback fonts still draw; the cover keeps its layout.
  }
}

let grainTile = null;
function makeGrainTile() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 160;
  t.height = 160;
  const c = t.getContext('2d');
  const data = c.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 20);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  c.putImageData(data, 0, 0);
  grainTile = t;
  return t;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan.
 *  The pan is clamped so the photo always covers the panel: no empty edges. */
function drawPanelPhoto(ctx, panel, graded, zoom, ox, oy) {
  const { x, y, w, h } = panel;
  const base = Math.max(w / graded.width, h / graded.height) * zoom;
  const dw = graded.width * base;
  const dh = graded.height * base;
  let dx = x + (w - dw) / 2 + ox * w;
  let dy = y + (h - dh) / 2 + oy * h;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.drawImage(graded, dx, dy, dw, dh);
}

/** A cast name tag: a black tab with gold type at a panel's bottom-left. */
function drawNameTag(ctx, panel, tag) {
  if (!tag || !tag.trim()) return;
  const text = tag.trim().toUpperCase();
  const fs = Math.max(11, Math.min(panel.w * 0.085, panel.h * 0.085));
  ctx.save();
  ctx.font = `${Math.round(fs)}px "Bebas Neue", sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = fs * 0.55;
  const tagW = Math.min(tw + pad * 2, panel.w - 6);
  const tagH = fs * 1.75;
  const x = 4;
  const y = panel.h - tagH - 4;
  ctx.fillStyle = 'rgba(12, 2, 20, 0.92)';
  ctx.fillRect(x, y, tagW, tagH);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x, y + tagH - 3, tagW, 3);
  ctx.fillStyle = PAPER;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad, y + tagH / 2 - 1);
  ctx.restore();
}

/** Draws a panel: its graded photo, name tag, ink border and light inner band. */
function drawPanel(ctx, panel, graded, slot, tag, highlight) {
  ctx.save();
  if (panel.rot) {
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate((panel.rot * Math.PI) / 180);
    ctx.translate(-panel.w / 2, -panel.h / 2);
  } else {
    ctx.translate(panel.x, panel.y);
  }
  // Drop shadow under the panel.
  ctx.fillStyle = 'rgba(10, 2, 18, 0.45)';
  ctx.fillRect(4, 6, panel.w, panel.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, panel.w, panel.h);
  ctx.clip();
  if (graded) {
    drawPanelPhoto(ctx, { x: 0, y: 0, w: panel.w, h: panel.h }, graded, slot.zoom, slot.ox, slot.oy);
  } else {
    const g = ctx.createLinearGradient(0, 0, panel.w, panel.h);
    g.addColorStop(0, '#3d1150');
    g.addColorStop(1, '#160a2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, panel.w, panel.h);
    ctx.fillStyle = 'rgba(255, 248, 238, 0.75)';
    ctx.font = `${Math.round(panel.h * 0.09)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', panel.w / 2, panel.h / 2);
  }
  ctx.restore();
  // The hero panel gets a heavier frame so the eye lands there first.
  ctx.lineWidth = Math.max(3, panel.w * (panel.hero ? 0.02 : 0.012));
  ctx.strokeStyle = panel.hero ? GOLD : INK;
  ctx.strokeRect(0, 0, panel.w, panel.h);
  ctx.lineWidth = Math.max(1.5, panel.w * 0.004);
  ctx.strokeStyle = 'rgba(255, 248, 238, 0.85)';
  ctx.strokeRect(ctx.lineWidth * 2, ctx.lineWidth * 2, panel.w - ctx.lineWidth * 4, panel.h - ctx.lineWidth * 4);
  drawNameTag(ctx, panel, tag);
  if (highlight) {
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff2e88';
    ctx.strokeRect(-6, -6, panel.w + 12, panel.h + 12);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Draws a tilted snapshot card: white frame, photo, a blank caption strip. */
function drawSnapshotCard(ctx, panel, graded, slot, tag, highlight) {
  const frame = Math.max(8, panel.w * 0.045);
  const strip = Math.max(18, panel.w * 0.16);
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  ctx.rotate((panel.rot * Math.PI) / 180);
  ctx.fillStyle = 'rgba(10, 2, 18, 0.5)';
  ctx.fillRect(-panel.w / 2 + 6, -panel.h / 2 + 10, panel.w, panel.h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-panel.w / 2 + frame, -panel.h / 2 + frame, panel.w - frame * 2, panel.h - frame - strip);
  ctx.clip();
  if (graded) {
    drawPanelPhoto(
      ctx,
      { x: -panel.w / 2 + frame, y: -panel.h / 2 + frame, w: panel.w - frame * 2, h: panel.h - frame - strip },
      graded,
      slot.zoom,
      slot.ox,
      slot.oy,
    );
  }
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.strokeRect(-panel.w / 2 + frame, -panel.h / 2 + frame, panel.w - frame * 2, panel.h - frame - strip);
  if (tag && tag.trim()) {
    ctx.fillStyle = INK;
    ctx.font = `${Math.round(strip * 0.42)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag.trim().toUpperCase(), 0, panel.h / 2 - strip / 2);
  }
  if (highlight) {
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff2e88';
    ctx.strokeRect(-panel.w / 2 - 8, -panel.h / 2 - 8, panel.w + 16, panel.h + 16);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Halftone dots across a rect: the title block's print texture. */
function drawHalftone(ctx, rect, spacing, colorA, colorB) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  let row = 0;
  for (let y = rect.y + spacing / 2; y < rect.y + rect.h; y += spacing) {
    for (let x = rect.x + spacing / 2 + (row % 2 ? spacing / 2 : 0); x < rect.x + rect.w; x += spacing) {
      ctx.fillStyle = (row + Math.round(x / spacing)) % 2 ? colorA : colorB;
      ctx.beginPath();
      ctx.arc(x, y, spacing * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    row++;
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, lit) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = lit ? GOLD : 'rgba(255, 248, 238, 0.18)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = lit ? INK : 'rgba(255, 248, 238, 0.5)';
  ctx.stroke();
}

/** The heat meter: five stars, `filled` of them lit, with a HEAT label. */
function drawHeatMeter(ctx, x, y, starSize, filled) {
  ctx.font = `${Math.round(starSize * 0.9)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 248, 238, 0.8)';
  ctx.fillText('HEAT', x, y + starSize * 0.75);
  const labelW = ctx.measureText('HEAT').width;
  for (let i = 0; i < 5; i++) {
    const cx = x + labelW + 14 + i * (starSize + 6);
    drawStar(ctx, cx, y + starSize / 2, starSize / 2, filled > i);
  }
}

/** The badge ribbon: a diagonal ribbon across the canvas's top-right corner. */
function drawBadgeRibbon(ctx, w, text) {
  if (!text.trim()) return;
  ctx.save();
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 4);
  const bandH = Math.max(26, w * 0.028);
  const inset = w * 0.055;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(-w * 0.35, inset - bandH / 2, w * 0.7, bandH);
  ctx.fillStyle = PAPER;
  ctx.font = `${Math.round(bandH * 0.52)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.trim().toUpperCase(), 0, inset + 1);
  ctx.restore();
}

/**
 * Chrome lettering: Anton text filled with a vertical sunset gradient, then
 * thin bright stripes clipped to the glyphs and a dark outline, so the title
 * reads like polished metal catching the sunset.
 */
function drawChromeTitle(ctx, text, x, y, size, maxW, align) {
  let s = size;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  do {
    ctx.font = `${s}px Anton, sans-serif`;
    if (ctx.measureText(text).width <= maxW || s <= 12) break;
    s -= 2;
  } while (s > 12);
  const wText = ctx.measureText(text).width;
  const x0 = align === 'left' ? x : align === 'right' ? x - wText : x - wText / 2;
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.ceil(wText) + 8);
  off.height = Math.ceil(s * 1.5);
  const c = off.getContext('2d');
  const grad = c.createLinearGradient(0, 0, 0, off.height);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.35, '#ffe9a3');
  grad.addColorStop(0.55, '#ffb347');
  grad.addColorStop(0.72, '#ff5e3a');
  grad.addColorStop(1, '#ff2e88');
  c.font = `${s}px Anton, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.lineWidth = Math.max(2, s * 0.07);
  c.lineJoin = 'round';
  c.strokeStyle = INK;
  const baseY = s * 1.08;
  c.strokeText(text, 4, baseY);
  c.fillStyle = grad;
  c.fillText(text, 4, baseY);
  // Chrome stripes: bright bands clipped inside the glyphs.
  c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 4; i++) {
    const sy = off.height * (0.18 + i * 0.2);
    c.fillStyle = i % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(255,233,163,0.5)';
    c.fillRect(0, sy, off.width, Math.max(2, s * 0.045));
  }
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, x0 - 4, y - s * 1.08);
  return s;
}

/** Review strip: five gold stars, a pull-quote, its source and VOL. 1. */
function drawReviewStrip(ctx, rect, state) {
  const { x, y, w, h } = rect;
  ctx.fillStyle = '#0d0218';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x, y + h - 2, w, 2);
  const starR = h * 0.32;
  let cx = x + w * 0.02 + starR;
  const cy = y + h / 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, cx, cy, starR, true);
    cx += starR * 2.4;
  }
  const quote = state.reviewQuote || '';
  const fs = Math.max(11, h * 0.42);
  ctx.font = `${Math.round(fs)}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = PAPER;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const qx = cx + w * 0.01;
  ctx.fillText(quote.toUpperCase(), qx, cy);
  const qw = ctx.measureText(quote.toUpperCase()).width;
  ctx.fillStyle = 'rgba(255, 248, 238, 0.65)';
  ctx.font = `${Math.round(fs * 0.8)}px "Bebas Neue", sans-serif`;
  ctx.fillText(`— ${state.reviewSource || ''}`, qx + qw + w * 0.015, cy);
  ctx.fillStyle = GOLD;
  ctx.font = `${Math.round(fs)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('VOL. 1', x + w * 0.88, cy);
}

/** Billing block: tiny credit lines along the foot of the title band. */
function drawBillingBlock(ctx, x, y, w, fs) {
  ctx.font = `${Math.round(fs)}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = 'rgba(255, 248, 238, 0.72)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SUNDOWN PICTURES  PRESENTS  A  COVER  BY  YOU  ·  STARRING  THE  DRIVER  THE  MECHANIC  THE  CAPTAIN', x, y);
  ctx.fillText('THE  RIDER  THE  FIXER  THE  LOOKOUT  THE  BOSS  ·  MUSIC  BY  THE  NEON  COAST  ·  IN  VICE  CITY', x, y + fs * 1.5);
}

/** A deterministic barcode (bars seeded by the title) at the foot corner. */
function drawBarcode(ctx, x, y, bw, bh, seedText) {
  let seed = 7;
  for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) % 997;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x - 4, y - 4, bw + 8, bh + 16);
  let bx = x;
  let s = seed;
  ctx.fillStyle = INK;
  while (bx < x + bw) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const barW = 1 + (s % 3);
    if (s % 5 < 3) ctx.fillRect(bx, y, barW, bh);
    bx += barW + 1 + (s % 2);
  }
  ctx.font = `${Math.round(bh * 0.22)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('0  7  7  7  7  7', x + bw / 2, y + bh + 11);
}

/** A gold seal: a starburst circle reading BEST CAST, overlapping the band. */
function drawGoldSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const rr = i % 2 ? r * 0.86 : r;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#e8a93d';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = '#8a5a12';
  ctx.stroke();
  ctx.fillStyle = '#5c3a05';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 0.34)}px "Bebas Neue", sans-serif`;
  ctx.fillText('BEST', 0, -r * 0.18);
  ctx.fillText('CAST', 0, r * 0.18);
  ctx.restore();
}

/** The title block: halftone band, scrim, floating title, or the hero treatment. */
function drawTitleBlock(ctx, titleRect, style, state, w) {
  const { x, y, h: th } = titleRect;
  const tw = titleRect.w;
  const title = state.title.trim().toUpperCase() || 'SUNDOWN RACKET';
  const align = titleRect.align === 'left' ? 'left' : 'center';
  const textX = titleRect.align === 'left' ? x + tw * 0.04 : x + tw / 2;
  const maxW = tw * (titleRect.align === 'left' ? 0.92 : 0.94);

  if (style === 'hero') {
    // Sunset gradient bar behind the whole title block.
    const bar = ctx.createLinearGradient(0, y, 0, y + th);
    bar.addColorStop(0, '#ff7a1a');
    bar.addColorStop(0.45, '#ff4d6d');
    bar.addColorStop(1, '#8a2360');
    ctx.fillStyle = bar;
    ctx.fillRect(x, y, tw, th);
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, tw, Math.max(3, th * 0.02));
    drawHalftone(ctx, { x, y, w: tw, h: th }, Math.max(10, w * 0.011), 'rgba(255, 46, 136, 0.16)', 'rgba(255, 179, 71, 0.14)');
    // The title is centred slightly left of middle so the gold seal has
    // clear space at the band's right end and never clips a letter.
    const titleSize = drawChromeTitle(ctx, title, x + tw * 0.46, y + th * 0.46, th * 0.4, tw * 0.68, 'center');
    const sub = state.subtitle.trim();
    if (sub) {
      const subSize = Math.max(14, th * 0.15);
      ctx.font = `${subSize}px Pacifico, cursive`;
      ctx.fillStyle = '#ffe9a3';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = subSize * 0.6;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(sub, x + tw * 0.46, y + th * 0.66);
      ctx.shadowBlur = 0;
    }
    const tagline = (state.tagline || '').trim();
    if (tagline) {
      const tgSize = Math.max(11, th * 0.085);
      ctx.font = `${tgSize}px "Bebas Neue", sans-serif`;
      ctx.fillStyle = PAPER;
      ctx.textAlign = align;
      ctx.fillText(tagline.toUpperCase(), x + tw * 0.46, y + th * 0.79);
    }
    drawBillingBlock(ctx, x + tw * 0.02, y + th * 0.92, tw * 0.62, Math.max(9, th * 0.055));
    drawBarcode(ctx, x + tw * 0.84, y + th * 0.74, tw * 0.09, th * 0.14, title);
    const sealR = th * 0.26;
    drawGoldSeal(ctx, x + tw * 0.9, y + th * 0.28, sealR);
    ctx.font = `${Math.round(th * 0.075)}px "Bebas Neue", sans-serif`;
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'left';
    ctx.fillText('COMING SOON', x + tw * 0.02, y + th * 0.62);
    return;
  }

  if (style === 'band') {
    ctx.fillStyle = '#1a0b2e';
    ctx.fillRect(x, y, tw, th);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(x, y, tw, Math.max(3, th * 0.02));
    drawHalftone(ctx, { x, y: y + th * 0.04, w: tw, h: th }, Math.max(10, w * 0.011), 'rgba(255, 46, 136, 0.28)', 'rgba(255, 179, 71, 0.22)');
  } else if (style === 'scrim') {
    const g = ctx.createLinearGradient(0, y - th * 0.4, 0, y + th);
    g.addColorStop(0, 'rgba(10, 4, 20, 0)');
    g.addColorStop(1, 'rgba(10, 4, 20, 0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y - th * 0.4, tw, th * 1.4);
  }
  drawChromeTitle(ctx, title, textX, y + th * 0.52, th * 0.44, maxW, align);
  const sub = state.subtitle.trim();
  if (sub) {
    const subSize = Math.max(14, th * 0.17);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ff7ad9';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subSize * 0.5;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(sub, textX, y + th * 0.82);
    ctx.shadowBlur = 0;
  }
  const tagline = (state.tagline || '').trim();
  if (tagline && style !== 'float') {
    const tgSize = Math.max(10, th * 0.09);
    ctx.font = `${tgSize}px "Bebas Neue", sans-serif`;
    ctx.fillStyle = 'rgba(255, 248, 238, 0.85)';
    ctx.textAlign = align;
    ctx.fillText(tagline.toUpperCase(), textX, y + th * 0.97);
  }
  const starSize = Math.max(12, th * 0.13);
  const meterW = 5 * (starSize + 6) + 60;
  drawHeatMeter(ctx, x + tw - meterW - tw * 0.03, y + th * 0.72, starSize, state.heat);
}

/** Grain and vignette over the whole cover, for the print-poster finish. */
function drawFinish(ctx, w, h) {
  const tile = makeGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(8, 2, 16, 0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the cover for `state` onto `canvas` at its own size.
 * `photos` is an array of loaded images; `opts.highlightPanel` outlines one
 * panel (the editor's selection) and is never set for an export.
 */
export function drawCover(canvas, state, photos, opts = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const geo = layoutCover(state.layout, w, h);
  const grade = GRADES[state.grade] ? state.grade : 'sunset';
  const tags = state.nameTags ?? CHARACTER_TAGS;
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(0, 0, w, h);
  if (geo.review) drawReviewStrip(ctx, geo.review, state);
  geo.panels.forEach((panel, i) => {
    const slot = state.panels[i] ?? { photo: i % Math.max(1, photos.length), zoom: 1, ox: 0, oy: 0 };
    const photo = photos[slot.photo] ?? null;
    if (panel.backdrop) {
      if (photo) {
        const graded = gradedPhoto(photo, grade, Math.ceil(w * 1.2));
        drawPanelPhoto(ctx, panel, graded, 1, 0, 0);
      }
      ctx.fillStyle = 'rgba(10, 5, 20, 0.55)';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    let graded = null;
    if (photo) {
      const maxW = Math.min(photo.naturalWidth, Math.ceil(panel.w * 2));
      graded = gradedPhoto(photo, grade, maxW);
    }
    const highlight = opts.highlightPanel === i;
    const tag = slot.tag !== undefined && slot.tag !== '' ? slot.tag : tags[i] ?? '';
    if (panel.frame === 'snapshot') drawSnapshotCard(ctx, panel, graded, slot, tag, highlight);
    else drawPanel(ctx, panel, graded, slot, tag, highlight);
  });
  drawTitleBlock(ctx, geo.title, geo.titleStyle, state, w);
  drawBadgeRibbon(ctx, w, state.badge);
  drawFinish(ctx, w, h);
}

/** Renders the cover at `width` x `height` into a fresh canvas (for export). */
export function renderCoverToSize(state, photos, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, photos);
  return canvas;
}
