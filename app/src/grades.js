// Gradient-map colour grades for the cover engine: each grade maps a photo's
// luminance through a Vice City colour ramp, keeping some of the photo's own
// colour so faces stay faces. Graded panels are cached per photo, grade and
// width, so dragging a crop only re-samples the graded bitmap.
//
// Five grades ship with the studio: Sunset (the warm default), Neon (hot
// pink after dark), Vice Teal (turquoise mornings), Palm Gold (a honeyed
// afternoon) and Noir (a black-and-white crime still).

/** A grade: a luminance ramp (dark to light) plus a wash tint for the grade. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    ramp: ['#150826', '#3d1150', '#8a2360', '#d6336c', '#ff6a3d', '#ffb347', '#ffe9a3'],
    wash: 'rgba(255, 110, 60, 0.10)',
  },
  neon: {
    label: 'Neon',
    ramp: ['#03031a', '#160a4d', '#5b1a8a', '#c2187a', '#ff2e88', '#ff7ad9', '#8ef6ff'],
    wash: 'rgba(255, 46, 136, 0.10)',
  },
  vice: {
    label: 'Vice Teal',
    ramp: ['#02222b', '#07333d', '#0e5f6b', '#c2185b', '#ff5e8a', '#ffb347', '#ffe9a3'],
    wash: 'rgba(20, 180, 190, 0.08)',
  },
  palm: {
    label: 'Palm Gold',
    ramp: ['#0a1f14', '#123f27', '#2e8b57', '#7fb069', '#e9c46a', '#ffd166', '#fff3c4'],
    wash: 'rgba(255, 200, 80, 0.08)',
  },
  noir: {
    label: 'Noir',
    ramp: ['#040404', '#1a1a22', '#3d3d4d', '#6b6b7a', '#9a9aad', '#d5d5e0', '#f5f5ff'],
    wash: 'rgba(120, 120, 160, 0.06)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Turns a hex colour from a grade ramp into an [r, g, b] triple. */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Builds a 256-entry RGB lookup table from a grade's ramp (dark to light). */
export function buildGradientLut(gradeId) {
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  const stops = grade.ramp.map(hexToRgb);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const a = Math.min(stops.length - 2, Math.floor(t));
    const f = t - a;
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(stops[a][c] + (stops[a + 1][c] - stops[a][c]) * f);
    }
  }
  return lut;
}

/**
 * Applies a grade's lookup table to an image's pixels in place (ImageData):
 * 65% ramp colour, 35% the photo's own colour, so the grade lands but the
 * people in the photo still look like themselves.
 */
export function applyGradientMap(imageData, lut) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const k = lum * 3;
    d[i] = Math.round(lut[k] * 0.65 + d[i] * 0.35);
    d[i + 1] = Math.round(lut[k + 1] * 0.65 + d[i + 1] * 0.35);
    d[i + 2] = Math.round(lut[k + 2] * 0.65 + d[i + 2] * 0.35);
  }
  return imageData;
}

const gradedCache = new Map();

/** Returns a canvas of `photo` graded with `gradeId`, at most `maxWidth` wide.
 *  The result is cached per photo, grade and width, so a drag only re-samples it. */
export function gradedPhoto(photo, gradeId, maxWidth) {
  const key = `${photo.__coverId ?? (photo.__coverId = Math.random().toString(36).slice(2))}|${gradeId}|${maxWidth}`;
  const hit = gradedCache.get(key);
  if (hit) return hit;
  const scale = Math.min(1, maxWidth / photo.naturalWidth);
  const w = Math.max(2, Math.round(photo.naturalWidth * scale));
  const h = Math.max(2, Math.round(photo.naturalHeight * scale));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  ctx.drawImage(photo, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  applyGradientMap(data, buildGradientLut(gradeId));
  ctx.putImageData(data, 0, 0);
  if (gradedCache.size > 48) gradedCache.clear();
  gradedCache.set(key, off);
  return off;
}

/** Clears the graded-photo cache (after a grade's ramp changes, or on export). */
export function clearGradedCache() {
  gradedCache.clear();
}
