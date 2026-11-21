// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor the editor with photos loaded, ?shot=portrait and ?shot=square
// the other post sizes. `caption` sets the title, `layout` and `grade` pick
// the look, `tagline` and `quote` set the poster furniture. The hero layout
// is the default, so every shot shows the big centre close-up ringed by its
// cast. window.__shotReady is set once the cover is painted.
import { defaultPanels, defaultNameTags } from './cover.js';

export async function runShot(shot, query, api) {
  const title = query.get('caption') ?? 'Sundown Racket';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const subtitle = query.get('subtitle') ?? 'Paid in Sunsets';
  const tagline = query.get('tagline') ?? 'Everyone wants a cut of the sunset';
  const reviewQuote = query.get('quote') ?? '“The sunset never stood a chance.”';
  const reviewSource = query.get('source') ?? 'VICE CITY GAZETTE';
  const badge = query.get('badge') ?? 'VICE CITY';
  const heat = Number(query.get('heat') ?? 5);

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
    tagline,
    reviewQuote,
    reviewSource,
    badge,
    heat,
    panels: defaultPanels(),
    nameTags: defaultNameTags(),
  });
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
