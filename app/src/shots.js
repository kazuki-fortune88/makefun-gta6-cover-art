// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor the editor with photos loaded, ?shot=portrait and ?shot=square
// the other post sizes. `caption` sets the title, `layout` and `grade` pick
// the look. window.__shotReady is set once the cover is painted.
import { defaultPanels } from './cover.js';

export async function runShot(shot, query, api) {
  const title = query.get('caption') ?? 'Neon Coast';
  const layout = query.get('layout') ?? 'grid9';
  const grade = query.get('grade') ?? 'sunset';
  const subtitle = query.get('subtitle') ?? 'vice city nights';
  const badge = query.get('badge') ?? 'VICE CITY';
  const heat = Number(query.get('heat') ?? 4);

  if (shot === 'cover' || shot === 'portrait' || shot === 'square') {
    document.body.classList.add('shot-cover');
    api.setSelected(-1);
  }
  if (shot === 'portrait') api.setSize('portrait');
  if (shot === 'square') api.setSize('square');
  if (shot === 'cover') api.setSize('landscape');
  api.setState({
    layout,
    grade,
    title,
    subtitle,
    badge,
    heat,
    panels: defaultPanels(),
  });
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
