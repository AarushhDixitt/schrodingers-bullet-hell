# Schrödinger's Bullet Hell

A twin-stick bullet hell where you play a cat in quantum superposition. Split into many copies, fold back into one, and survive being measured: every bullet that touches you is a measurement, and whether you live follows the Born rule.

**Play it:** open `index.html` (or any `vN/index.html`) in a browser. Everything (code, fonts, sound) is in one file; there is nothing to install.

> **I did not make this.** The game was written by Claude (Anthropic's AI) in conversation with me. I designed, suggested ideas and played it; Claude wrote the code, the art, the music, the physics notes and the text. I'm sharing it so people can play it.

## Versions

| Folder | What changed |
|---|---|
| `v1/` | The first version: a cat in a box, splitting and folding, one arena. |
| `v2/` | Bosses, discoveries, a grant office and the paper-style title screen. |
| `v3/` | Six difficulties, elites, space weather, sized black holes, more laws of physics, interpretations of quantum mechanics, medals, touch controls. |
| `v4/` | The latest. A tenth experiment on nonlocality ending in a Bell-test boss, realistic black hole masses and mergers, entangled enemies, sprinting, a Research Programme mode with branching maps, Lab Notes (a notebook of everything you observe, with the real physics behind it), and a lineage of named cats. |

`v1/` is the game file only; its source wasn't kept separately. `v2/`–`v4/` each have `index.html` (the game) and `source/` (how it's built).

## Building from source (v2–v4)

The source is plain JavaScript split into modules (`source/src/js/`) and one HTML/CSS template (`source/src/template.html`). `build.mjs` joins them into a single self-contained HTML file in `source/dist/`.

```sh
cd v4/source
npm install
npm run build:fast   # skips font subsetting and minifying: quick, readable output
npm run build        # full build; needs Python's fonttools (pip install fonttools brotli) for pyftsubset
```

The `test/` scripts drive the game in a headless browser with Playwright (`npx playwright install chromium` first).

## Credits

- **Creative direction & playtesting:** Aarush Dixit ("Risen", AarushhDixitt): concept, design decisions, feature ideas, testing and feedback.
- **Code, art, music and writing:** Claude (Anthropic).
- **Fonts:** STIX Two, Martian Mono, Caveat, Reenie Beanie (SIL Open Font License, see `source/fonts/`).
- Physics quotes and references are to the real people and papers named.
