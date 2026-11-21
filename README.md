# Neon Coast Cover Studio v2

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kazuki-fortune88/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kazuki-fortune88/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos + captions into GTA 6-style multi-panel cover art, fully offline in the browser. Pick a layout, drop in your photos, edit the title and caption text, and export a polished poster — no upload, no network, no Rockstar assets.

## What it does

- **Six layouts** — Hero + Cast (default), Four-Panel Grid, Hero + Three, Full-Bleed, Nine-Panel Grid, Tilted Snapshots.
- **Five gradient-map grades** — Sunset, Neon, Vice Teal, Palm Gold, Noir — that keep faces looking like faces.
- **Per-panel crop and position** — drag to pan, scroll to zoom, or reset to the face-aware default crop.
- **Editable poster furniture** — title, subtitle, tagline, review quote and source, badge, heat meter, and every panel's character name tag.
- **One-click export** — PNG at 1080x1080, 1080x1350, and 1920x1080.
- **Fully offline** — static files, no network requests. Lettering is Anton, Pacifico and Bebas Neue under the SIL Open Font License.

## Run it

```sh
node main.ts
```

Then open the app in your browser (the server prints the local URL; use `--port <n>` for another port). Add your own photos from the Photos panel, pick a layout and grade, edit the caption, and hit **Export all sizes**.

To build the hand-in bundle:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4fxhr3y1&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
