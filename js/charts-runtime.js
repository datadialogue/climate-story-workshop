/* ------------------------------------------------------------------
   Tiny runtime that turns   <div class="vl" data-chart="name" data-step="2">
   into a Vega-Lite chart.

   Registering a chart (see charts/*.js):

     Charts.register("my-chart", (step, el) => ({ ...vega-lite spec... }));

   or, when the chart needs to react to a fragment (animation):

     Charts.register("my-chart", {
       spec: (step, el) => ({...}),
       ready: (view, el) => {},                       // after first render
       events: { grow: { show(view, el) {}, hide(view, el) {} } },
     });

   A fragment with data-chart-event="grow" on the same slide fires the
   show/hide handlers of every chart on that slide that defines "grow".

   Charts render lazily (current slide + the next two) to keep things fast.
------------------------------------------------------------------- */
(function () {
  const registry = {};
  const views = new WeakMap();

  function def(name) {
    const d = registry[name];
    if (!d) throw new Error("Unknown chart: " + name);
    return typeof d === "function" ? { spec: d } : d;
  }

  const pending = new WeakMap();
  function render(el) {
    if (!pending.has(el)) pending.set(el, draw(el));
    return pending.get(el);
  }
  async function draw(el) {
    const d = def(el.dataset.chart);
    const step = el.dataset.step ? +el.dataset.step : 1;
    const spec = Object.assign({ $schema: "https://vega.github.io/schema/vega-lite/v5.json" }, d.spec(step, el));
    try {
      const res = await vegaEmbed(el, spec, { renderer: "svg", actions: false, config: VL_CONFIG, tooltip: false });
      views.set(el, res.view);
      if (d.ready) d.ready(res.view, el, step);
    } catch (err) {
      el.innerHTML = `<pre style="color:#c00;font-size:14px">${el.dataset.chart}: ${err.message}</pre>`;
      console.error(el.dataset.chart, err);
    }
  }

  /* Keep every step of a stacked chart in exactly the same place.
     Vega sizes each step to fit its own titles, legends and labels, so a step that
     adds a title or an annotation would otherwise shift the plot. Here every step
     in one .r-stack is padded so its plot area (the data rectangle) starts at the
     same point; the stack is then centred as one block. */
  function align(stack) {
    const els = [...stack.children].filter((el) => el.matches(".vl") && views.has(el));
    if (els.length < 2 || stack.dataset.align === "none") return;
    const m = els.map((el) => {
      const v = views.get(el), o = v.origin(), p = v.padding(), svg = el.querySelector("svg");
      const x = o[0] + (p.left || 0), y = o[1] + (p.top || 0);
      return { el, svg, x, y, w: +svg.getAttribute("width"), h: +svg.getAttribute("height") };
    });
    const L = Math.max(...m.map((d) => d.x)), R = Math.max(...m.map((d) => d.w - d.x));
    const T = Math.max(...m.map((d) => d.y)), B = Math.max(...m.map((d) => d.h - d.y));
    m.forEach((d) => {
      const box = d.svg.parentElement;
      box.style.width = L + R + "px"; box.style.height = T + B + "px";
      box.style.justifyContent = "flex-start"; box.style.alignItems = "flex-start";
      d.svg.style.display = "block";
      d.svg.style.marginLeft = L - d.x + "px"; d.svg.style.marginTop = T - d.y + "px";
    });
  }

  async function renderSlide(slide) {
    if (!slide) return;
    await Promise.all([...slide.querySelectorAll(".vl[data-chart]")].map(render));
    slide.querySelectorAll(".r-stack").forEach(align);
  }

  function around(slide) {
    const all = [...document.querySelectorAll(".reveal .slides section:not(.stack)")];
    const i = all.indexOf(slide);
    return all.slice(Math.max(0, i - 1), i + 3);
  }

  function dispatch(fragment, kind) {
    const ev = fragment.dataset.chartEvent;
    if (!ev) return;
    const slide = fragment.closest("section");
    slide.querySelectorAll(".vl[data-chart]").forEach(async (el) => {
      await render(el);
      const d = def(el.dataset.chart);
      const h = d.events && d.events[ev] && d.events[ev][kind];
      if (h && views.get(el)) h(views.get(el), el);
    });
  }

  window.Charts = {
    register(name, d) { registry[name] = d; },
    renderAll() { return Promise.all([...document.querySelectorAll(".reveal .slides section:not(.stack)")].map(renderSlide)); },
    view(el) { return views.get(el); },
    // helper: animate a number from a to b and call fn(value) each frame
    tween(a, b, ms, fn, done) {
      const t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      function frame(now) {
        const t = Math.min(1, (now - t0) / ms);
        fn(a + (b - a) * ease(t));
        if (t < 1) requestAnimationFrame(frame); else if (done) done();
      }
      requestAnimationFrame(frame);
    },
  };

  function boot() {
    if (!window.Reveal) return;
    const go = () => around(Reveal.getCurrentSlide()).forEach(renderSlide);
    Reveal.on("ready", go);
    Reveal.on("slidechanged", go);
    // several fragments can share one index, so check all of them for a chart event
    Reveal.on("fragmentshown", (e) => (e.fragments || [e.fragment]).forEach((f) => dispatch(f, "show")));
    Reveal.on("fragmenthidden", (e) => (e.fragments || [e.fragment]).forEach((f) => dispatch(f, "hide")));
    // print / pdf export: render everything
    if (/print-pdf/.test(location.search)) Charts.renderAll();
    if (Reveal.isReady && Reveal.isReady()) go();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
