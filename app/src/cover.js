// Neon Coast Cover Studio's render engine: draws the whole cover — graded
// panels inked and banded as poster art, a halftone title block with sunset
// gradient lettering and a neon script subtitle, a heat meter, a badge ribbon,
// grain and vignette — onto any canvas, at any post size. The same code draws
// the live preview and the exported PNG, so what you see is what you share.

import { gradedPhoto, GRADES } from './grades.js';
import { layoutCover } from './layouts.js';

const INK = '#14041f';
const PAPER = '#fff8ee';

/** Default crop per sample photo (boulevard, pier, convertible, neon): each
 *  photo's faces sit in its upper third, so the default pan favours the top.
 *  The render clamps the pan to the photo's edges, so a large value just pins
 *  the window to the top in wide panels and does nothing in tall ones. */
const PHOTO_CROPS = [
  { zoom: 1.05, ox: 0, oy: 0.9 },
  { zoom: 1.05, ox: -0.05, oy: 0.8 },
  { zoom: 1.05, ox: 0, oy: 0.3 },
  { zoom: 1.1, ox: 0, oy: 0.05 },
];

/** The nine panel slots a fresh cover starts with, photos cycled with a
 *  slight zoom step so repeated photos never show the same crop twice. */
export function defaultPanels() {
  return Array.from({ length: 9 }, (_, i) => {
    const crop = PHOTO_CROPS[i % PHOTO_CROPS.length];
    return {
      photo: i % PHOTO_CROPS.length,
      zoom: crop.zoom + (i % 3) * 0.03,
      ox: crop.ox,
      oy: crop.oy,
    };
  });
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

/** Draws a panel: its graded photo, an ink border and a light inner band. */
function drawPanel(ctx, panel, graded, slot, highlight) {
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
  // Ink border plus a light inner band: the poster-art outline.
  ctx.lineWidth = Math.max(3, panel.w * 0.012);
  ctx.strokeStyle = INK;
  ctx.strokeRect(0, 0, panel.w, panel.h);
  ctx.lineWidth = Math.max(1.5, panel.w * 0.004);
  ctx.strokeStyle = 'rgba(255, 248, 238, 0.85)';
  ctx.strokeRect(ctx.lineWidth * 2, ctx.lineWidth * 2, panel.w - ctx.lineWidth * 4, panel.h - ctx.lineWidth * 4);
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
function drawSnapshotCard(ctx, panel, graded, slot, highlight) {
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
  ctx.fillStyle = lit ? '#ffd166' : 'rgba(255, 248, 238, 0.18)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = lit ? '#14041f' : 'rgba(255, 248, 238, 0.5)';
  ctx.stroke();
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

/** The title block: halftone band or scrim, gradient Anton title, neon script. */
function drawTitleBlock(ctx, titleRect, style, state, w) {
  const { x, y, h: th } = titleRect;
  const tw = titleRect.w;
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
  const title = state.title.trim().toUpperCase() || 'NEON COAST';
  let size = th * 0.44;
  ctx.textAlign = titleRect.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';
  const textX = titleRect.align === 'left' ? x + tw * 0.04 : x + tw / 2;
  const maxW = tw * (titleRect.align === 'left' ? 0.92 : 0.94);
  do {
    ctx.font = `${size}px Anton, sans-serif`;
    if (ctx.measureText(title).width <= maxW || size <= 12) break;
    size -= 2;
  } while (size > 12);
  const titleY = y + th * 0.52;
  const grad = ctx.createLinearGradient(0, titleY - size, 0, titleY + size * 0.15);
  grad.addColorStop(0, '#ffe9a3');
  grad.addColorStop(0.45, '#ffb347');
  grad.addColorStop(0.75, '#ff5e3a');
  grad.addColorStop(1, '#ff2e88');
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.strokeText(title, textX, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, textX, titleY);
  const sub = state.subtitle.trim();
  if (sub) {
    const subSize = Math.max(14, th * 0.17);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ff7ad9';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillText(sub, textX, y + th * 0.82);
    ctx.shadowBlur = 0;
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
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(0, 0, w, h);
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
    if (panel.frame === 'snapshot') drawSnapshotCard(ctx, panel, graded, slot, highlight);
    else drawPanel(ctx, panel, graded, slot, highlight);
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
