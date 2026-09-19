# Givre

Parametric adult toy configurator. Pick a shape, set size in millimetres, export an STL for [Bambu Studio](https://bambulab.com/en/download/studio).

**Live app:** [hilsbos.github.io/givre](https://hilsbos.github.io/givre/)

*Givre* is French for frost. The ice mold is a two-part clamshell, not a one-piece inverse — a plug bulb is wider than its neck, so a rigid single cavity would lock the ice inside.

## What it makes

| Product | Output |
|---|---|
| **Solid toy** | One watertight STL of the plug or shaft |
| **Ice mold** | Two mold halves, a printed retrieval handle, an optional peg, or one combined plate |

Shapes: classic plug, long taper, beaded plug, curved P-spot (solid only), straight shaft.

Anal mode will not let the flared base shrink below a retrieval-safe margin relative to the bulb.

## Use

1. Open the [app](https://hilsbos.github.io/givre/) (or this `index.html` locally).
2. Choose **Solid toy** or **Ice mold**.
3. Pick a shape and a size preset, then fine-tune.
4. Download the STL. Import it in Bambu Studio and slice there — this site does not emit a `.gcode.3mf`.

The preview loads Three.js from a CDN. After the first load you can keep using it; nothing is uploaded.

## Print notes

**Solid toy.** Tip-up or on its side, tree supports under the flare, 0.16–0.20 mm layers, 4+ walls, 100% infill. PETG is less brittle than PLA. Raw FDM is porous and not a body-safe insertable. Use the print as a silicone-mold master, or sand, seal, and still use a barrier.

**Ice mold.** PETG, halves printed on the split face, 5+ walls, 40%+ infill so they hold water. Rubber-band shut, stand pour-up in a tray, line with a food bag if you do not trust the filament. Seat the printed handle stem-first so the ice freezes onto a flare that will not melt. Warm the outside, split.

## Safety

- Anal toys need a flared base wider than the insertable bulb. Do not grind it off.
- An all-ice flare can melt and get lost internally. Keep the printed handle.
- Ice can freeze to skin and crack into edges. Wait until the surface is wet.
- This is geometry, not a medical device.

## Repo

Single-page app. No build step.

```
index.html      configurator (Three.js + generated STL)
README.md       this file
LICENSE         MIT
.github/workflows/pages.yml
```

## License

MIT. Adult use only, on you.
