# Seeing Climate Data: slides

Quarto reveal.js deck. All charts are Vega-Lite and use real climate data.

```bash
quarto preview slides.qmd        # live preview (use this to present: YouTube embeds need http://)
quarto render slides.qmd         # writes slides.html
python3 scripts/prepare_data.py  # rebuild data/data.js after refreshing data/raw/
```

## Layout

| Path | What it is |
|---|---|
| `slides.qmd` | the deck: text, order, and which chart step shows when |
| `charts/intro.js` | Part 1 charts: berries, the 64-number table, the world map, Du Bois snake bars, the scatter, warming stripes |
| `charts/principles.js` | Part 2 charts: the 1.5 °C chart, encodings, illusions, ensembles, comparisons |
| `charts/examples.js` | Part 3: Examples 1–3, transformed step by step |
| `js/theme.js` | colours, fonts, and the shared Vega-Lite config (axes, grid, legends) |
| `theme/climate.scss` | slide styling (keep the colours in sync with `js/theme.js`) |
| `js/charts-runtime.js` | renders `<div class="vl" data-chart=… data-step=…>` with vega-embed |
| `data/data.js` | generated; every dataset the charts use (works from `file://`) |
| `images/` | photos and screenshots taken from the original decks |

## How a step-by-step chart works

Every chart is a function of `step`:

```js
Charts.register("ex1", (step) => ({ ...vega-lite spec that changes with step... }));
```

In the slide, stack the steps. Each later step is a fragment painted over the previous one:

```html
::: {.r-stack}
<div class="vl" data-chart="ex1" data-step="1"></div>
<div class="vl fragment" data-chart="ex1" data-step="2" data-fragment-index="1"></div>
:::
```

Text that changes with each step goes in a `.textstack`, using the same `data-fragment-index` values.
For animation (the Du Bois folding bars), a chart can define `events`, and a fragment with
`data-chart-event="wrap"` triggers them.

## Chart recipe (the process used for every figure)

1. **Decide the job.** Pick one comparison the viewer should make, and choose the form that makes it easiest (position > length > angle > intensity).
2. **Start from the theme.** No per-chart styling of axes, grids or fonts. `js/theme.js` sets thin muted axes, light horizontal grid only, no frame, and the axis title on top of the y-axis.
3. **Minimal axes.** Show only the ticks you need (`values: [...]`). Schematic figures use `axis: null`.
4. **Colour by job.** Context marks use `C.context` (grey), and the one thing to look at uses `C.hot`. Increases and decreases use `C.hot` and `C.cool`, temperature uses the diverging `H.tempScale()`, and intensity demos use `H.grayScale()`. Categorical `C.cat` appears only in the deliberately "before" charts.
5. **Label directly**, not with legends, once the "before" version has been shown. Use `H.spread()` to keep end labels from colliding.
6. **Keep the frame fixed across steps.** Every step of one chart uses the same width, height and scale domains. The runtime then pins every step in a `.r-stack` to the same plot origin, so adding a title, legend or annotation never moves the chart (opt out with `data-align="none"` on the stack).
7. **Annotate on the chart, not beside it.** Labels and notes go in the chart as text marks, in the original wording. Side text stays short: the talk is narrated.
8. **Cite the data.** Every chart drawn from data gets a `[Data: [name](link)]{.source}` line on its slide.
9. **Render and look.** Screenshot every fragment and check for collisions before calling it done.

## Data sources

- CO₂ emissions: Our World in Data / Global Carbon Budget (`owid-co2-data.csv`). 2024 is used as the latest full year.
- Global temperature: NASA GISTEMP v4, monthly. Re-baselined to 1880–1900 where the 1.5 °C line is shown.
- El Niño: NOAA PSL Oceanic Niño Index (ONI).
- US unemployment ("Take a look at this chart"): BLS via FRED, series UNRATE.
- The vaccination scatter's points were traced from the original slide (they are approximate, no source link).
- The dual-axis "Production costs" figures are images (`images/dual-axis-*.png`), not recreated charts.

## Online

- Slides: https://datadialogue.github.io/climate-story-workshop/ (redirects to `slides.html`)
- Story: https://datadialogue.github.io/climate-story-workshop/story/

GitHub Pages serves the `main` branch as is, so run `quarto render slides.qmd` and commit `slides.html`
and `slides_files/` before pushing. The original `.pptx` files are not published (see `.gitignore`).
The slides share the story's fonts (Inter, Fraunces) and highlight colours (see `theme/climate.scss`).
