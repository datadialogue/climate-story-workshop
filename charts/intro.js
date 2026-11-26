/* Part 1 - What is visualization?  (charts used in the intro section) */
(function () {
  const D = window.DATA;
  const noAxis = { axis: null };

  /* ---------------------------------------------------------- berries -> circles
     The photo comes first (an <img>), this abstract version is painted over it. */
  const berries = [
    { kind: "blackberry", x: -0.72, y: 0.4 }, { kind: "blackberry", x: 0.12, y: 0.62 },
    { kind: "blackberry", x: 0.3, y: -0.22 }, { kind: "blackberry", x: -0.08, y: -0.62 },
    { kind: "raspberry", x: -0.38, y: 0.52 }, { kind: "raspberry", x: -0.36, y: 0.08 },
    { kind: "raspberry", x: 0.32, y: 0.3 }, { kind: "raspberry", x: 0.7, y: 0.18 },
    { kind: "raspberry", x: 0.78, y: -0.12 }, { kind: "raspberry", x: 0.72, y: -0.5 },
  ];
  Charts.register("berries", () => ({
    width: 560, height: 520,
    layer: [
      { data: { values: [{ x: -1.05, x2: 1.05, y: 0, y2: 0 }, { x: 0, x2: 0, y: -1.05, y2: 1.05 }] },
        mark: { type: "rule", color: C.ink, strokeWidth: 1.5 },
        encoding: { x: { field: "x", type: "quantitative", scale: { domain: [-1.1, 1.1] }, ...noAxis }, x2: { field: "x2" },
          y: { field: "y", type: "quantitative", scale: { domain: [-1.1, 1.1] }, ...noAxis }, y2: { field: "y2" } } },
      { data: { values: [{ x: 1.07, y: -0.06, t: "x" }, { x: 0.05, y: 1.06, t: "y" }] },
        mark: { type: "text", fontSize: 18, fontStyle: "italic", color: C.muted, align: "left" },
        encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" }, text: { field: "t" } } },
      { data: { values: berries },
        mark: { type: "point", filled: false, strokeWidth: 5, size: 9000 },
        encoding: {
          x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" },
          color: { field: "kind", type: "nominal", scale: { domain: ["blackberry", "raspberry"], range: ["#4B2A86", "#E0457B"] }, legend: null },
        } },
    ],
  }));

  /* ---------------------------------------------------------- table of numbers -> colour */
  Charts.register("temp-table", (step) => {
    const cell = 66;
    return {
      width: cell * 8, height: cell * 8,
      data: { values: D.tempGrid },
      transform: [{ calculate: "replace(format(datum.anom, '.2f'), '-', '−')", as: "label" }],
      encoding: {
        x: { field: "col", type: "ordinal", ...noAxis, scale: { paddingInner: 0 } },
        y: { field: "row", type: "ordinal", ...noAxis, scale: { paddingInner: 0 } },
      },
      layer: [
        { mark: { type: "rect", stroke: step === 1 ? "#D5D2CC" : C.bg, strokeWidth: step === 1 ? 1 : 2 },
          encoding: { fill: step === 1 ? { value: "#FFFFFF" } : { field: "anom", type: "quantitative", scale: H.tempScale(1.3), legend: null } } },
        { mark: { type: "text", fontSize: 19, fontWeight: 500 },
          encoding: { text: { field: "label" },
            color: step === 1 ? { value: C.ink } : { condition: { test: "abs(datum.anom) > 0.62", value: "#FFFFFF" }, value: C.ink } } },
      ],
    };
  });

  /* ---------------------------------------------------------- the world map encoding story
     Same flow as the original One Piece slides, with CO2 per person instead of population.
     step 1: map   2: name two places   3: squares, values unknown   4: Canada's value given */
  const pc = D.perCapita;
  const places = [
    { name: "Canada", lon: -102, lat: 58, v: pc.Canada, lx: -128, ly: 80 },
    { name: "India", lon: 79, lat: 22, v: pc.India, lx: 96, ly: 80 },
    { name: "Bouvet Island", lon: 3.4, lat: -54.4, v: 0, lx: 3.4, ly: -54.4, below: true },
  ];
  Charts.register("world-map", (step) => {
    const label = (p) => {
      if (p.below) return step >= 3 ? "CO₂ per person on an empty island is 0" : "";
      if (step === 2) return p.name;
      if (p.name === "Canada" && step >= 4) return `CO₂ per person in Canada = ${p.v} t`;
      return `CO₂ per person in ${p.name}?`;
    };
    const rows = places.map((p) => Object.assign({}, p, { label: label(p) })).filter((p) => p.label);
    const geo = (lon, lat) => ({ longitude: { field: lon }, latitude: { field: lat } });
    const layers = [
      { data: { values: D.world, format: { type: "topojson", feature: "countries" } },
        transform: [{ filter: "+datum.id != 10" }],
        mark: { type: "geoshape", fill: "#E4E1DA", stroke: C.bg, strokeWidth: 0.6 } },
    ];
    if (step >= 2) {
      const top = rows.filter((r) => !r.below);
      layers.push(
        { data: { values: top }, mark: { type: "rule", color: C.ink, strokeWidth: 1.2 }, encoding: Object.assign(geo("lx", "ly"), { longitude2: { field: "lon" }, latitude2: { field: "lat" } }) },
        { data: { values: top }, mark: { type: "text", fontSize: 20, fontWeight: 500, align: "center", baseline: "bottom", dy: -8, color: C.ink },
          encoding: Object.assign(geo("lx", "ly"), { text: { field: "label" } }) },
        { data: { values: rows.filter((r) => r.below) }, mark: { type: "text", fontSize: 20, fontWeight: 500, align: "center", baseline: "top", dy: 34, color: C.ink },
          encoding: Object.assign(geo("lx", "ly"), { text: { field: "label" } }) },
      );
      if (step === 2) layers.push({ data: { values: top }, mark: { type: "point", shape: "square", filled: false, size: 2300, strokeWidth: 1.5, color: C.ink },
        encoding: geo("lon", "lat") });
    }
    if (step >= 3) {
      layers.push({ data: { values: rows }, mark: { type: "point", shape: "square", filled: true, size: 2300, stroke: C.ink, strokeWidth: 1.5, opacity: 1 },
        encoding: Object.assign(geo("lon", "lat"), { fill: { field: "v", type: "quantitative", scale: H.grayScale(pc.Canada), legend: null } }) });
    }
    return { width: 1080, height: 520, projection: { type: "equalEarth" }, layer: layers };
  });

  /* ---------------------------------------------------------- bars: the same two numbers as length */
  Charts.register("canada-india-bars", () => ({
    width: 380, height: 400,
    data: { values: [{ c: "Canada (13.6 t)", v: pc.Canada }, { c: "India", v: pc.India }] },
    mark: { type: "bar", color: C.ink },
    encoding: {
      x: { field: "c", type: "nominal", sort: null, axis: { title: null, labelFontSize: 18, labelColor: C.ink, domainColor: C.ink }, scale: { paddingInner: 0.45 } },
      y: { field: "v", type: "quantitative", axis: null, scale: { domain: [0, pc.Canada] } },
    },
  }));

  /* ---------------------------------------------------------- grey squares for five places */
  Charts.register("gray-squares", () => ({
    width: 1050, height: 260,
    data: { values: [
      { c: "Empty island (0)", v: 0 }, { c: "India", v: pc.India }, { c: "UK", v: pc["United Kingdom"] },
      { c: "China", v: pc.China }, { c: "Canada (13.6)", v: pc.Canada },
    ] },
    encoding: { x: { field: "c", type: "nominal", sort: null, axis: null } },
    layer: [
      { mark: { type: "point", shape: "square", size: 17000, filled: true, stroke: C.ink, strokeWidth: 1.5, opacity: 1 },
        encoding: { y: { value: 90 }, fill: { field: "v", type: "quantitative", scale: H.grayScale(pc.Canada), legend: null } } },
      { mark: { type: "text", fontSize: 20, color: C.ink }, encoding: { y: { value: 200 }, text: { field: "c" } } },
    ],
  }));

  /* ---------------------------------------------------------- Du Bois "snake" bars
     Bars that would run off the chart fold back on themselves (W.E.B. Du Bois, 1900).
     A fragment with data-chart-event="wrap" animates the fold. */
  const short = { "United States": "USA", "United Kingdom": "UK", "South Africa": "S. Africa", "South Korea": "S. Korea", "Saudi Arabia": "Saudi Ar." };
  const cum = D.cumulative.map((d) => ({ name: short[d.country] || d.country, v: d.gt }));
  const VMAX = Math.ceil(cum[0].v / 50) * 50;
  const CAP = 50;
  function snake(cap) {
    const dx = 0.5; const out = []; let x = 0;
    cum.forEach((d, ci) => {
      const n = Math.max(1, Math.ceil(d.v / cap - 1e-9));
      let rem = d.v; let i = 0;
      for (let k = 0; k < n; k++) {
        const xx = x + k * dx; const len = Math.min(rem, cap); const up = k % 2 === 0;
        const y0 = up ? 0 : cap; const y1 = up ? len : cap - len;
        out.push({ name: d.name, i: i++, x: xx, y: y0, xc: 0, ci }, { name: d.name, i: i++, x: xx, y: y1, xc: 0, ci });
        rem -= len;
      }
      const span = (n - 1) * dx;
      out.filter((p) => p.name === d.name).forEach((p) => (p.xc = x + span / 2));
      x += span + 1;
    });
    return out;
  }
  Charts.register("snake", {
    spec: () => ({
      width: 1080, height: 440,
      params: [{ name: "cap", value: VMAX }],
      data: { name: "snake" },
      encoding: { x: { field: "x", type: "quantitative", axis: null, scale: { zero: false, nice: false, padding: 14 } } },
      layer: [
        { mark: { type: "line", color: C.hot, strokeWidth: 9, strokeCap: "butt", strokeJoin: "miter", clip: true },
          encoding: { y: { field: "y", type: "quantitative", scale: { domain: [0, { expr: "cap" }], nice: false },
            axis: { title: "Billion tonnes of CO₂, cumulative since 1750", tickCount: 5, format: "~s" } },
            detail: { field: "name" }, order: { field: "i" } } },
        { transform: [{ filter: "datum.i == 0" }],
          mark: { type: "text", angle: 320, align: "right", baseline: "middle", fontSize: 14, color: C.ink, dy: 12, dx: 2 },
          encoding: { x: { field: "xc", type: "quantitative" }, y: { datum: 0, type: "quantitative" }, text: { field: "name" } } },
      ],
    }),
    ready(view) { view.data("snake", snake(VMAX)).run(); },
    events: {
      wrap: {
        show(view) { Charts.tween(VMAX, CAP, 3200, (c) => view.signal("cap", c).data("snake", snake(c)).run()); },
        hide(view) { Charts.tween(CAP, VMAX, 1200, (c) => view.signal("cap", c).data("snake", snake(c)).run()); },
      },
    },
  });

  /* ---------------------------------------------------------- vaccination scatter (recreated from the original slides)
     1 points + bare axes · 2 axis labels + "US State" key · 3 "We find patterns in data"
     (4 is the protest photo) · 5 trend line · 6 a few states only · 7 + note · 8 a question */
  const states = [[20.1, 51.2], [15.9, 39.3], [15.7, 37.1], [19.7, 37.3], [30.3, 36.1], [26.0, 31.8], [22.4, 27.5], [24.4, 26.1], [29.6, 27.5],
    [22.8, 20.3], [24.9, 18.4], [31.8, 18.8], [31.6, 17.6], [31.1, 16.3], [31.1, 14.7], [31.6, 13.7], [29.4, 12.6], [29.6, 11.3], [31.1, 10.7],
    [22.6, 12.3], [20.2, 11.1], [19.1, 12.9], [24.2, 4.5], [33.2, 3.4], [35.9, 4.9], [37.2, 7.0], [32.9, 7.5], [35.4, 8.1], [37.2, 8.4],
    [42.1, 13.1], [42.6, 11.6], [40.3, 7.0], [41.5, 6.4], [41.4, 5.1], [43.3, 4.6], [44.1, 6.9], [45.0, 5.7], [45.9, 10.2], [48.2, 9.8],
    [48.8, 8.7], [47.9, 4.6], [49.1, 2.6], [50.4, 5.5], [49.5, 6.6], [54.0, 3.7], [56.7, 4.9], [56.7, 3.9], [57.6, 2.8], [62.1, 2.0]]
    .map(([x, y], i) => ({ x, y, i }));
  const subset = [9, 10, 19, 20, 21, 22];
  const top = { x: 36, y: 59.5 }; // the circle at the top that the "US State" key points to
  Charts.register("vax-scatter", (step) => {
    const full = step >= 2;
    const few = step === 6 || step === 7;
    const pts = few ? states.filter((d) => subset.includes(d.i)) : states;
    const sc = { x: { domain: [0, 80] }, y: { domain: [0, 60] } };
    const x = { field: "x", type: "quantitative", scale: sc.x,
      axis: Object.assign({ title: "Percent fully vaccinated", values: [0, 20, 40, 60, 80], titleAnchor: "middle", domainColor: C.ink, titleFontSize: 15 }, full ? {} : { labelOpacity: 0, tickOpacity: 0, titleOpacity: 0 }) };
    const y = { field: "y", type: "quantitative", scale: sc.y,
      axis: Object.assign({ title: "N hospitalized per 100,000", values: [0, 10, 20, 30, 40, 50, 60], tickCount: 20, grid: false, domain: true, domainColor: C.ink, titleFontSize: 15 }, full ? {} : { labelOpacity: 0, titleOpacity: 0 }) };
    const P = (vals, mark, enc = {}) => ({ data: { values: vals }, mark, encoding: Object.assign({ x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } }, enc) });
    const ring = { type: "point", filled: false, size: 210, strokeWidth: 1.6, color: C.ink };
    const layers = [P(pts, ring, { x, y }), P([top], ring)];
    if (full) {
      const q = step === 8;
      const key = q ? "Why was this state so high in hospitalization?" : "US State";
      layers.push(
        P([{ x: top.x + 1.4, x2: top.x + 5, y: top.y }], { type: "rule", color: C.ink, strokeWidth: 1.2 }, { x2: { field: "x2" } }),
        P([{ x: top.x + 5.6, y: top.y, t: key }], { type: "text", align: "left", baseline: "middle", fontSize: 16, color: q ? C.hot : C.ink, fontWeight: q ? 600 : 400 }, { text: { field: "t" } }),
      );
    }
    const note = { 3: "We find patterns in data", 7: ["We might interpret visualizations", "differently based on our", "existing views"], 8: "We can ask questions from visualizations" }[step];
    if (note) layers.push(P([{ x: 50, y: 46, t: note }], { type: "text", align: "left", baseline: "top", fontSize: 20, fontWeight: 600, color: C.ink, lineHeight: 26 }, { text: { field: "t" } }));
    if (step === 5) layers.push({ data: { values: states }, transform: [{ regression: "y", on: "x", method: "exp", extent: [15, 70] }],
      mark: { type: "line", color: C.hot, strokeWidth: 3.5 }, encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } } });
    return { width: 880, height: 500, layer: layers };
  });

  /* ---------------------------------------------------------- warming stripes */
  Charts.register("stripes", (step) => ({
    width: 1080, height: 330,
    data: { values: D.tempAnnual },
    layer: [
      { mark: { type: "rect" },
        encoding: { x: { field: "year", type: "ordinal", axis: Object.assign({ values: [1880, 1920, 1960, 2000, 2025], title: null, domain: false, ticks: false, labelFontSize: 15 }, step === 2 ? {} : { labelOpacity: 0 }), scale: { paddingInner: 0 } },
          color: { field: "anom", type: "quantitative", scale: H.tempScale(1.1), legend: null } } },
    ],
  }));
})();
