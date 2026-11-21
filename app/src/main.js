// Sundown Racket Cover Studio's editor: photos in, a cover out. Wires the page —
// photo tray, layout and grade pickers, caption and poster-furniture editing,
// per-panel crop, position and name tag by drag and zoom, undo/redo, and
// one-click export in every post size.
import { drawCover, renderCoverToSize, ensureCoverFonts, defaultPanels, defaultNameTags } from './cover.js';
import { LAYOUTS, LAYOUT_IDS, layoutCover } from './layouts.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { runShot } from './shots.js';

window.__coverErrors = [];
window.addEventListener('error', (e) => window.__coverErrors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__coverErrors.push(String(e.reason)));

export const SIZES = {
  square: { label: 'Square', w: 1080, h: 1080 },
  portrait: { label: 'Portrait', w: 1080, h: 1350 },
  landscape: { label: 'Landscape', w: 1920, h: 1080 },
  story: { label: 'Story', w: 1080, h: 1920 },
};

const SAMPLE_PHOTOS = [
  { name: 'Boulevard', url: 'samples/boulevard.jpg' },
  { name: 'Pier', url: 'samples/pier.jpg' },
  { name: 'Red Car', url: 'samples/convertible.jpg' },
  { name: 'Neon Night', url: 'samples/neon.jpg' },
];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const panelInfo = document.getElementById('panel-info');

const photos = [];
let selectedPanel = 0;
let sizeId = 'square';
let undoStack = [];
let redoStack = [];

let state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'SUNDOWN RACKET',
  subtitle: 'Paid in Sunsets',
  tagline: 'Everyone wants a cut of the sunset',
  reviewQuote: '“The sunset never stood a chance.”',
  reviewSource: 'VICE CITY GAZETTE',
  badge: 'VICE CITY',
  heat: 5,
  panels: defaultPanels(),
  nameTags: defaultNameTags(),
};

function snapshot() {
  return JSON.stringify(state);
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function undoCover() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  state = JSON.parse(undoStack.pop());
  syncControls();
  redraw();
  updateUndoButtons();
}

function redoCover() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  state = JSON.parse(redoStack.pop());
  syncControls();
  redraw();
  updateUndoButtons();
}

function updateUndoButtons() {
  document.getElementById('undo').disabled = !undoStack.length;
  document.getElementById('redo').disabled = !redoStack.length;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(img, name) {
  photos.push({ img, name });
  renderPhotoTray();
  return photos.length - 1;
}

function previewSize() {
  const s = SIZES[sizeId];
  const long = document.body.classList.contains('shot-cover') ? 1080 : 720;
  const scale = long / Math.max(s.w, s.h);
  return { w: Math.round(s.w * scale), h: Math.round(s.h * scale) };
}

function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state, photos.map((p) => p.img), { highlightPanel: selectedPanel });
  updatePanelInfo();
}

function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

function downloadCanvas(c, filename) {
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportSize(id) {
  const s = SIZES[id];
  const out = renderCoverToSize(state, photos.map((p) => p.img), s.w, s.h);
  downloadCanvas(out, `${slug(state.title)}-${s.w}x${s.h}.png`);
  status.textContent = `Exported ${s.label} ${s.w} x ${s.h} PNG`;
}

function exportAllSizes() {
  for (const id of ['square', 'portrait', 'landscape']) exportSize(id);
  status.textContent = 'Exported all three sizes — square 1080x1080, portrait 1080x1350, landscape 1920x1080';
}

// ---- photo tray -----------------------------------------------------------

function renderPhotoTray() {
  const tray = document.getElementById('photo-tray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Use ${p.name} for the selected panel`;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    b.appendChild(img);
    b.appendChild(Object.assign(document.createElement('span'), { textContent: p.name }));
    b.addEventListener('click', () => {
      pushUndo();
      state.panels[selectedPanel].photo = i;
      redraw();
    });
    tray.appendChild(b);
  });
  const photoSelect = document.getElementById('panel-photo');
  photoSelect.innerHTML = '';
  photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = p.name;
    photoSelect.appendChild(o);
  });
  photoSelect.value = String(state.panels[selectedPanel]?.photo ?? 0);
}

// ---- panel inspector ------------------------------------------------------

function panelTag() {
  return state.nameTags[selectedPanel] ?? '';
}

function updatePanelInfo() {
  const slot = state.panels[selectedPanel];
  if (!slot) return;
  const tag = panelTag();
  panelInfo.textContent = `Panel ${selectedPanel + 1} — ${tag ? `${tag} · ` : ''}${photos[slot.photo]?.name ?? 'no photo'} · zoom ${slot.zoom.toFixed(2)}x`;
  const sel = document.getElementById('panel-photo');
  if (sel.value !== String(slot.photo)) sel.value = String(slot.photo);
  const zoom = document.getElementById('panel-zoom');
  if (document.activeElement !== zoom) zoom.value = String(Math.round(slot.zoom * 100));
  const tagInput = document.getElementById('panel-tag');
  if (document.activeElement !== tagInput) tagInput.value = tag;
}

function selectPanel(i) {
  selectedPanel = i;
  redraw();
}

// ---- canvas interaction: click to select, drag to pan, wheel to zoom ------

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(p) {
  const geo = layoutCover(state.layout, canvas.width, canvas.height);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const panel = geo.panels[i];
    if (panel.backdrop) continue;
    if (p.x >= panel.x && p.x <= panel.x + panel.w && p.y >= panel.y && p.y <= panel.y + panel.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = hitPanel(p);
  if (i < 0) return;
  selectPanel(i);
  drag = { i, x: p.x, y: p.y, moved: false, slot: { ...state.panels[i] } };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const geo = layoutCover(state.layout, canvas.width, canvas.height);
  const panel = geo.panels[drag.i];
  const slot = state.panels[drag.i];
  const dx = (p.x - drag.x) / panel.w;
  const dy = (p.y - drag.y) / panel.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.005) drag.moved = true;
  slot.ox = Math.max(-1, Math.min(1, drag.slot.ox + dx));
  slot.oy = Math.max(-1, Math.min(1, drag.slot.oy + dy));
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) pushUndo();
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const i = hitPanel(p);
  if (i < 0) return;
  selectPanel(i);
  const slot = state.panels[i];
  slot.zoom = Math.max(1, Math.min(3, slot.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

// ---- controls -------------------------------------------------------------

function buildPickers() {
  const layoutBox = document.getElementById('layout-picker');
  for (const id of LAYOUT_IDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = LAYOUTS[id].label;
    b.dataset.layout = id;
    b.addEventListener('click', () => {
      if (state.layout === id) return;
      pushUndo();
      state.layout = id;
      // A layout with fewer panels than the current state keeps only the
      // panels it draws; the hero layout's seven slots are the full set.
      state.panels = defaultPanels();
      state.nameTags = defaultNameTags();
      selectedPanel = 0;
      syncControls();
      redraw();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = document.getElementById('grade-picker');
  for (const id of GRADE_IDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = GRADES[id].label;
    b.dataset.grade = id;
    b.style.setProperty('--sw', `linear-gradient(135deg, ${GRADES[id].ramp[1]}, ${GRADES[id].ramp[4]}, ${GRADES[id].ramp[5]})`);
    b.addEventListener('click', () => {
      if (state.grade === id) return;
      pushUndo();
      state.grade = id;
      syncControls();
      redraw();
    });
    gradeBox.appendChild(b);
  }
  const sizeBox = document.getElementById('size-picker');
  for (const id of Object.keys(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${SIZES[id].label} ${SIZES[id].w}x${SIZES[id].h}`;
    b.dataset.size = id;
    b.addEventListener('click', () => {
      sizeId = id;
      syncControls();
      redraw();
    });
    sizeBox.appendChild(b);
  }
}

function syncControls() {
  for (const b of document.querySelectorAll('#layout-picker button')) {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  }
  for (const b of document.querySelectorAll('#grade-picker button')) {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  }
  for (const b of document.querySelectorAll('#size-picker button')) {
    b.classList.toggle('active', b.dataset.size === sizeId);
  }
  document.getElementById('caption').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('review-quote').value = state.reviewQuote;
  document.getElementById('review-source').value = state.reviewSource;
  document.getElementById('badge').value = state.badge;
  document.getElementById('heat').value = String(state.heat);
  document.getElementById('heat-value').textContent = `${state.heat} / 5`;
}

/** Binds a text field to a state key: live redraw, undo on commit. */
function bindText(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    state[key] = el.value;
    redraw();
  });
  el.addEventListener('change', pushUndo);
}

function bindControls() {
  bindText('caption', 'title');
  bindText('subtitle', 'subtitle');
  bindText('tagline', 'tagline');
  bindText('review-quote', 'reviewQuote');
  bindText('review-source', 'reviewSource');
  bindText('badge', 'badge');
  const heat = document.getElementById('heat');
  heat.addEventListener('input', () => {
    state.heat = Number(heat.value);
    document.getElementById('heat-value').textContent = `${state.heat} / 5`;
    redraw();
  });
  heat.addEventListener('change', pushUndo);
  document.getElementById('photo').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name.replace(/\.[^.]+$/, ''));
    }
    redraw();
  });
  document.getElementById('export-one').addEventListener('click', () => exportSize(sizeId));
  document.getElementById('export-all').addEventListener('click', exportAllSizes);
  document.getElementById('undo').addEventListener('click', undoCover);
  document.getElementById('redo').addEventListener('click', redoCover);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undoCover();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      redoCover();
    }
  });
  document.getElementById('panel-photo').addEventListener('change', (e) => {
    pushUndo();
    state.panels[selectedPanel].photo = Number(e.target.value);
    redraw();
  });
  document.getElementById('panel-tag').addEventListener('input', (e) => {
    state.nameTags[selectedPanel] = e.target.value;
    redraw();
  });
  document.getElementById('panel-tag').addEventListener('change', pushUndo);
  document.getElementById('panel-zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value) / 100;
    redraw();
  });
  document.getElementById('panel-zoom').addEventListener('change', pushUndo);
  document.getElementById('panel-reset').addEventListener('click', () => {
    pushUndo();
    state.panels[selectedPanel] = defaultPanels()[selectedPanel] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    redraw();
  });
  document.getElementById('panel-fill-all').addEventListener('click', () => {
    pushUndo();
    const photo = state.panels[selectedPanel].photo;
    state.panels.forEach((slot) => { slot.photo = photo; });
    redraw();
  });
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    for (const file of e.dataTransfer.files) {
      if (!file.type.startsWith('image/')) continue;
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name.replace(/\.[^.]+$/, ''));
    }
    redraw();
  });
}

// ---- shot scenes ----------------------------------------------------------

const shot = new URLSearchParams(location.search).get('shot');
buildPickers();
bindControls();
syncControls();
updateUndoButtons();

const api = {
  async loadSample(name, title) {
    const img = await loadImage(`samples/${name}.jpg`);
    const idx = photos.findIndex((p) => p.name === name);
    if (idx < 0) photos.push({ img, name });
    state.title = title;
    renderPhotoTray();
  },
  setState(patch) {
    Object.assign(state, patch);
    syncControls();
  },
  setSize(id) {
    sizeId = id;
    syncControls();
  },
  setSelected(i) {
    selectedPanel = i;
  },
  redraw,
  state: () => state,
  photos: () => photos,
};

async function boot() {
  await ensureCoverFonts();
  for (const s of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(s.url);
      photos.push({ img, name: s.name });
    } catch {
      // A missing sample still leaves a working editor.
    }
  }
  renderPhotoTray();
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), api);
  }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!shot) window.__shotReady = true;
  }));
}

boot();
