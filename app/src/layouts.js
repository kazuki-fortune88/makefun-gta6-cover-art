// Cover geometry for Sundown Racket Cover Studio: every layout is a function
// of the canvas size, so the same cover reflows across square, portrait,
// landscape and story post sizes. Each layout returns panel rects plus the
// title-block rect and the style the title block should be drawn in.
//
// The default layout is `hero`: one big close-up panel in the middle, ringed
// by six smaller panels of deliberately different sizes — the magazine-cover
// look of a GTA poster, where no two surrounding panels share a height.

/** The six layouts, in the order the picker shows them (hero first). */
export const LAYOUTS = {
  hero: { label: 'Hero + Cast', panels: 7 },
  grid4: { label: 'Four-Panel Grid', panels: 4 },
  hero3: { label: 'Hero + Three', panels: 4 },
  bleed: { label: 'Full-Bleed', panels: 1 },
  grid9: { label: 'Nine-Panel Grid', panels: 9 },
  tilt: { label: 'Tilted Snapshots', panels: 4 },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

function gridPanels(w, h, cols, rows, area) {
  const panels = [];
  const gw = (area.w - (cols - 1) * area.gutter) / cols;
  const gh = (area.h - (rows - 1) * area.gutter) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panels.push({
        x: area.x + c * (gw + area.gutter),
        y: area.y + r * (gh + area.gutter),
        w: gw,
        h: gh,
        rot: 0,
      });
    }
  }
  return panels;
}

function photoArea(w, h, titleH, topH = 0) {
  const m = Math.round(w * 0.018);
  const gutter = Math.round(w * 0.012);
  return { x: m, y: topH + m, w: w - m * 2, h: h - titleH - topH - m * 2, gutter };
}

/**
 * Hero + cast: the review strip sits at the very top, the title band at the
 * foot, and between them a big centre hero panel flanked by two columns of
 * three panels each. The two columns use different row-height splits, so the
 * surrounding panels are visibly varied in size instead of a uniform grid.
 * Panel order: 0 hero, 1-3 left column top to bottom, 4-6 right column.
 */
export function layoutHeroCast(w, h) {
  const titleH = Math.round(h * 0.27);
  const reviewH = Math.round(h * 0.055);
  const area = photoArea(w, h, titleH, reviewH);
  const g = area.gutter;
  const heroW = area.w * 0.36;
  const sideW = (area.w - heroW - g * 2) / 2;
  const leftX = area.x;
  const heroX = area.x + sideW + g;
  const rightX = heroX + heroW + g;
  // Uneven row splits: left column tall-short-medium, right short-medium-tall.
  const leftSplit = [0.36, 0.28, 0.36];
  const rightSplit = [0.3, 0.34, 0.36];
  const panels = [{ x: heroX, y: area.y, w: heroW, h: area.h, rot: 0, hero: true }];
  let y = area.y;
  for (let i = 0; i < 3; i++) {
    const ph = (area.h - g * 2) * leftSplit[i];
    panels.push({ x: leftX, y, w: sideW, h: ph, rot: 0 });
    y += ph + g;
  }
  y = area.y;
  for (let i = 0; i < 3; i++) {
    const ph = (area.h - g * 2) * rightSplit[i];
    panels.push({ x: rightX, y, w: sideW, h: ph, rot: 0 });
    y += ph + g;
  }
  return {
    panels,
    title: { x: 0, y: h - titleH, w, h: titleH, align: 'center' },
    titleStyle: 'hero',
    review: { x: 0, y: 0, w, h: reviewH },
  };
}

/** Four-panel grid: a 2x2 photo wall over a halftone title band. */
export function layoutGridFour(w, h) {
  const titleH = Math.round(h * 0.24);
  const area = photoArea(w, h, titleH);
  return {
    panels: gridPanels(w, h, 2, 2, area),
    title: { x: 0, y: h - titleH, w, h: titleH, align: 'center' },
    titleStyle: 'band',
  };
}

/** Hero and three: one big panel on the left, three stacked on the right. */
export function layoutHeroThree(w, h) {
  const titleH = Math.round(h * 0.24);
  const area = photoArea(w, h, titleH);
  const heroW = (area.w - area.gutter) * 0.6;
  const colW = area.w - heroW - area.gutter;
  const smallH = (area.h - area.gutter * 2) / 3;
  const panels = [{ x: area.x, y: area.y, w: heroW, h: area.h, rot: 0 }];
  for (let i = 0; i < 3; i++) {
    panels.push({
      x: area.x + heroW + area.gutter,
      y: area.y + i * (smallH + area.gutter),
      w: colW,
      h: smallH,
      rot: 0,
    });
  }
  return {
    panels,
    title: { x: 0, y: h - titleH, w, h: titleH, align: 'center' },
    titleStyle: 'band',
  };
}

/** Full-bleed: one photo edge to edge, the title over a scrim at the foot. */
export function layoutFullBleed(w, h) {
  const titleH = Math.round(h * 0.26);
  return {
    panels: [{ x: 0, y: 0, w, h, rot: 0 }],
    title: { x: 0, y: h - titleH, w, h: titleH, align: 'left' },
    titleStyle: 'scrim',
  };
}

/** Nine-panel grid: a 3x3 photo wall over a halftone title band. */
export function layoutGridNine(w, h) {
  const titleH = Math.round(h * 0.22);
  const area = photoArea(w, h, titleH);
  return {
    panels: gridPanels(w, h, 3, 3, area),
    title: { x: 0, y: h - titleH, w, h: titleH, align: 'center' },
    titleStyle: 'band',
  };
}

/** Tilted snapshots: a dark graded backdrop with three rotated photo cards. */
export function layoutTiltedSnapshot(w, h) {
  const titleH = Math.round(h * 0.2);
  const cardW = w * 0.36;
  const cardH = cardW * 1.18;
  const panels = [
    { x: 0, y: 0, w, h, rot: 0, backdrop: true },
    { x: w * 0.06, y: h * 0.26, w: cardW, h: cardH, rot: -5, frame: 'snapshot' },
    { x: w * 0.56, y: h * 0.22, w: cardW, h: cardH, rot: 4, frame: 'snapshot' },
    { x: w * 0.3, y: h * 0.56, w: cardW, h: cardH, rot: -2, frame: 'snapshot' },
  ];
  return {
    panels,
    title: { x: w * 0.05, y: h * 0.03, w: w * 0.9, h: titleH, align: 'left' },
    titleStyle: 'float',
  };
}

const LAYOUT_FNS = {
  hero: layoutHeroCast,
  grid4: layoutGridFour,
  hero3: layoutHeroThree,
  bleed: layoutFullBleed,
  grid9: layoutGridNine,
  tilt: layoutTiltedSnapshot,
};

/** Returns the geometry for `layoutId` at canvas size w x h. */
export function layoutCover(layoutId, w, h) {
  const fn = LAYOUT_FNS[layoutId] ?? layoutHeroCast;
  return fn(w, h);
}
