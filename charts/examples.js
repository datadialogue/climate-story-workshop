/* Part 3 - Let's practice: three charts transformed step by step. */
(function () {
  const D = window.DATA;
  const Q = (field, extra = {}) => Object.assign({ field, type: "quantitative" }, extra);
  const T = (field, extra = {}) => Object.assign({ field, type: "temporal" }, extra);
  const W = 760, HT = 420, HT1 = 400; // HT1: Example 1 leaves room for the article text above it

  /* ======================================================== Example 1
     CO2 emissions indexed to 1990, six countries.
     1 default chart w/ legend · 2 legend removed · 3 direct labels · 4 annotated
     5 highlight Canada · 6 slope chart of % change · 7 small multiples */
  const idx = D.co2Index;
  const names = ["China", "India", "United States", "Canada", "Japan", "United Kingdom"];
  const short = { "United States": "US", "United Kingdom": "UK" };
  const lastYear = Math.max(...idx.map((d) => d.year));
  const ends = names.map((c) => { const d = idx.find((r) => r.country === c && r.year === lastYear); return { country: c, label: short[c] || c, year: lastYear, index: d.index, ly: d.index }; });
  H.spread(ends, "ly", 26);
  const color = (hl) => ({ field: "country", type: "nominal", scale: { domain: names, range: hl ? names.map((n) => (n === hl ? C.hot : C.context)) : C.cat.slice(0, 6) },
    legend: null });

  Charts.register("ex1", (step) => {
    const x = Q("year", { axis: { title: null, format: "d", values: [1990, 2000, 2010, 2020] }, scale: { domain: [1990, lastYear] } });
    const y = Q("index", { scale: { domain: [0, 600] }, axis: { title: step === 1 ? null : "Emissions, 1990 = 100", tickCount: 6 } });
    if (step === 6) return slope();
    if (step === 7) return multiples();
    const hl = step === 5 ? "Canada" : null;
    const c = color(hl);
    if (step === 1) c.legend = { title: null, orient: "top", direction: "horizontal", symbolType: "stroke", symbolStrokeWidth: 3, labelFontSize: 14, offset: 14 };
    const layers = [
      { data: { values: [{}] }, mark: { type: "rule", color: C.muted, strokeDash: [4, 4], strokeWidth: 1.2 }, encoding: { y: { datum: 100 } } },
      { data: { values: idx }, mark: { type: "line", strokeWidth: step === 5 ? 2 : 2.5 }, encoding: { x, y, color: c, detail: { field: "country" } } },
    ];
    if (step === 5) layers.push({ data: { values: idx.filter((d) => d.country === "Canada") }, mark: { type: "line", strokeWidth: 4, color: C.hot }, encoding: { x, y } });
    if (step >= 3) layers.push({ data: { values: ends }, mark: { type: "text", align: "left", dx: 8, fontSize: 15, fontWeight: 500 },
      encoding: { x: Q("year"), y: Q("ly"), text: { field: "label" }, color: step === 5 ? { condition: { test: "datum.country == 'Canada'", value: C.hot }, value: C.muted } : { value: C.ink } } });
    if (step === 4) layers.push(
      { data: { values: [{ x: 2003.5, y: 450, t: ["India and China: about five times", "their 1990 emissions"] }, { x: 2003, y: 28, t: "The UK has cut its emissions roughly in half" }] },
        mark: { type: "text", align: "left", fontSize: 15, color: C.ink, lineHeight: 19 }, encoding: { x: Q("x"), y: Q("y"), text: { field: "t" } } },
      { data: { values: [{ x: 1992, y: 62, t: "- - -  1990 level" }] }, mark: { type: "text", align: "left", fontSize: 13, color: C.muted }, encoding: { x: Q("x"), y: Q("y"), text: { field: "t" } } },
    );
    if (step === 5) layers.push({ data: { values: [{ x: 2010, y: 185, t: ["Canada is still 18% above", "its 1990 level"] }] },
      mark: { type: "text", align: "left", fontSize: 16, fontWeight: 600, color: C.hot, lineHeight: 20 }, encoding: { x: Q("x"), y: Q("y"), text: { field: "t" } } });
    return { width: W, height: HT1, title: step === 1 ? { text: "Annual CO₂ emissions, selected countries", subtitle: "Index, 1990 = 100" } : null, layer: layers };
  });

  function slope() {
    const rows = names.flatMap((c) => {
      const a = idx.find((r) => r.country === c && r.year === 1990), b = idx.find((r) => r.country === c && r.year === lastYear);
      return [{ country: c, t: "1990", pct: 0 }, { country: c, t: String(lastYear), pct: +(b.index - a.index).toFixed(0) }];
    });
    const labs = rows.filter((r) => r.t !== "1990").map((r) => Object.assign({ ly: r.pct, label: `${short[r.country] || r.country}  ${r.pct > 0 ? "+" : ""}${r.pct}%` }, r));
    H.spread(labs, "ly", 30);
    const x = { field: "t", type: "ordinal", axis: { title: null, orient: "top", labelFontSize: 16, labelColor: C.ink, domain: false, ticks: false }, scale: { padding: 0.15 } };
    const hl = { condition: { test: "datum.country == 'Canada'", value: C.hot }, value: "#8a9099" };
    return { width: 420, height: HT1, title: { text: "Change in CO₂ emissions since 1990" },
      layer: [
        { data: { values: rows }, mark: { type: "line", strokeWidth: 2.5, point: { size: 60, filled: true } }, encoding: { x, y: Q("pct", { axis: null }), detail: { field: "country" }, color: hl } },
        { data: { values: labs }, mark: { type: "text", align: "left", dx: 12, fontSize: 15, fontWeight: 500 }, encoding: { x, y: Q("ly"), text: { field: "label" }, color: { condition: { test: "datum.country == 'Canada'", value: C.hot }, value: C.ink } } },
      ] };
  }

  function multiples() {
    return { data: { values: idx }, columns: 3, spacing: 26,
      facet: { field: "country", type: "nominal", sort: names, header: { title: null, labelFontSize: 15, labelAnchor: "start", labelFontWeight: 600 } },
      spec: { width: 230, height: 150, layer: [
        { mark: { type: "area", color: C.hotSoft, opacity: 0.8 }, encoding: { x: Q("year", { axis: { title: null, values: [1990, 2024], format: "d" } }), y: Q("index", { axis: { title: null, tickCount: 3 } }), y2: { datum: 100 } } },
        { mark: { type: "rule", color: C.muted, strokeDash: [3, 3] }, encoding: { y: { datum: 100 } } },
        { mark: { type: "line", color: C.ink, strokeWidth: 2 }, encoding: { x: Q("year"), y: Q("index") } },
      ] },
      resolve: { scale: { y: "independent" } } };
  }

  /* ======================================================== Example 2
     Monthly global temperature + El Niño index.
     1 rainbow bars + dual axis · 2 line over bars · 3 colours removed (4 = same chart)
     5 one axis, one series · 6 El Niño chart below · 7 annotated
     The temperature panel keeps the same size and position in every step. */
  const t2 = D.tempMonthly.filter((d) => d.date >= "2010").map((d) => Object.assign({ yr: d.date.slice(0, 4) }, d));
  const oni = D.oni.filter((d) => d.date >= "2010" && d.date <= t2[t2.length - 1].date);
  const merged = t2.map((d) => Object.assign({ oni: (oni.find((o) => o.date === d.date) || {}).oni }, d));
  const H2 = 300;
  const xDom = { domain: [{ year: 2010, month: 1, date: 1 }, { year: 2026, month: 11, date: 1 }], padding: 0 };
  Charts.register("ex2", (step) => {
    const x = T("date", { scale: xDom, axis: { title: null, format: "%Y", tickCount: 9, grid: false } });
    const yT = Q("anomPI", { scale: { domain: [0, 2] }, axis: { title: "Temperature (°C)", format: ".1f", tickCount: 5 } });
    const tLine = () => ({ mark: { type: "line", color: C.ink, strokeWidth: 2.5 }, encoding: { x, y: yT } });

    if (step <= 4) {
      const bars = { mark: { type: "bar", cornerRadiusEnd: 0, opacity: step <= 2 ? 0.9 : 1 }, encoding: { x, y: yT,
        color: step <= 2 ? { field: "yr", type: "nominal", scale: { scheme: "category20" },
          legend: step === 1 ? { title: null, columns: 17, orient: "bottom", symbolType: "square", symbolSize: 70, labelFontSize: 11, columnPadding: 6, offset: 14 } : null } : { value: "#E4E5E8" } } };
      const left = { layer: step >= 2 ? [bars, tLine()] : [bars] };
      const right = { mark: { type: "line", color: "#1f3a93", strokeWidth: 2 },
        encoding: { x, y: Q("oni", { scale: { domain: [-3, 3] }, axis: { title: "El Niño index", orient: "right", grid: false, titleAnchor: "end", titleAlign: "right", titleX: 30 } }) } };
      return { width: W, height: H2, data: { values: merged }, layer: [left, right], resolve: { scale: { y: "independent", color: "independent" } } };
    }
    const main = { width: W, height: H2, data: { values: t2 }, layer: [tLine()] };
    main.layer[0].encoding.y = Q("anomPI", { scale: { domain: [0, 2] }, axis: { title: "Temperature (°C above 1880–1900)", format: ".1f", tickCount: 5 } });
    if (step === 7) main.layer.push(
      { data: { values: [{}] }, mark: { type: "rule", color: C.hot, strokeDash: [5, 4], strokeWidth: 1.5 }, encoding: { y: { datum: 1.5 } } },
      { data: { values: [{ d: "2010-02-01", t: "1.5 °C" }] }, mark: { type: "text", align: "left", dy: -10, fontSize: 14, fontWeight: 600, color: C.hot }, encoding: { x: T("d"), y: { datum: 1.5 }, text: { field: "t" } } },
      { data: { values: [{ d: "2016-02-15", y: 1.58 }, { d: "2023-09-15", y: 1.7 }, { d: "2026-10-15", y: 1.77 }] }, mark: { type: "point", color: C.hot, size: 90, filled: true }, encoding: { x: T("d"), y: Q("y") } },
      { data: { values: [{ d: "2015-10-01", y: 1.7, t: "Record heat follows each El Niño" }] }, mark: { type: "text", align: "right", fontSize: 15, fontWeight: 600, color: C.ink }, encoding: { x: T("d"), y: Q("y"), text: { field: "t" } } },
    );
    if (step === 5) return main;
    const enso = { width: W, height: 100, data: { values: oni },
      layer: [
        { mark: { type: "bar", cornerRadiusEnd: 0 }, transform: [{ calculate: "datum.oni >= 0.5 ? 'El Niño' : datum.oni <= -0.5 ? 'La Niña' : 'Neutral'", as: "phase" }],
          encoding: { x: T("date", { scale: xDom, axis: { title: null, format: "%Y", tickCount: 9 } }), y: Q("oni", { scale: { domain: [-3, 3] }, axis: { title: "El Niño index", values: [-2, 0, 2] } }),
            color: { field: "phase", type: "nominal", scale: { domain: ["El Niño", "Neutral", "La Niña"], range: [C.hot, "#D5D7DB", C.cool] },
              legend: { orient: "right", direction: "vertical", title: null, labelFontSize: 13, symbolType: "square", offset: 12 } } } },
        ...(step === 7 ? [{ data: { values: [{ d: "2015-12-15", y: 2.59, t: "2015–16 El Niño" }, { d: "2023-12-15", y: 1.99, t: "2023–24" }, { d: "2026-09-15", y: 2.46, t: "2026" }] },
          mark: { type: "text", align: "right", dx: -10, fontSize: 13, color: C.ink }, encoding: { x: T("d"), y: Q("y"), text: { field: "t" } } }] : []),
      ] };
    return { vconcat: [main, enso], spacing: 40, resolve: { legend: { color: "independent" } } };
  });

  /* ======================================================== Example 3
     CO2 per person, 2005 vs latest year, 15 countries.
     1 grouped bars · 2 grouped bars + deltas · 3 deltas only
     4 simple bar of change · 5 colour-coded increase / decrease */
  const pcc = D.perCapitaChange;
  const yr = D.perCapitaLatestYear;
  const by2005 = [...pcc].sort((a, b) => b.y2005 - a.y2005).map((d) => d.country);
  const byChange = [...pcc].sort((a, b) => a.change - b.change).map((d) => d.country);
  Charts.register("ex3", (step) => {
    const order = step >= 4 ? byChange : by2005;
    const y = { field: "country", type: "nominal", sort: order, axis: { title: null, labelFontSize: 14, labelColor: C.ink, domain: false, ticks: false, labelPadding: 10 }, scale: { paddingInner: 0.25 } };
    const xv = (extra = {}) => Q("v", Object.assign({ scale: { domain: [0, 22] }, axis: { title: "Tonnes of CO₂ per person", grid: true, gridColor: C.grid, tickCount: 5, orient: "top" } }, extra));
    const long = pcc.flatMap((d) => [{ country: d.country, k: "2005", v: d.y2005 }, { country: d.country, k: String(yr), v: d.yLatest }]);
    const grouped = { data: { values: long }, mark: { type: "bar", cornerRadiusEnd: 0, opacity: step === 2 ? 0.35 : 1 },
      encoding: { y, yOffset: { field: "k", sort: ["2005", String(yr)] }, x: xv(),
        color: { field: "k", type: "nominal", scale: { domain: ["2005", String(yr)], range: ["#B8BDC4", C.ink] }, legend: step === 1 ? { title: null, orient: "top", symbolType: "square" } : null } } };
    const delta = { data: { values: pcc }, mark: { type: "bar", height: 9, cornerRadiusEnd: 0, color: C.hot },
      encoding: { y, x: Q("y2005", { scale: { domain: [0, 22] }, axis: step === 3 ? { title: "Tonnes of CO₂ per person (2005 → " + yr + ")", grid: true, gridColor: C.grid, tickCount: 5, orient: "top" } : null }), x2: { field: "yLatest" } } };
    const arrow = { data: { values: pcc }, mark: { type: "point", shape: "triangle", size: 90, filled: true, color: C.hot },
      transform: [{ calculate: "datum.change > 0 ? 90 : -90", as: "ang" }], encoding: { y, x: Q("yLatest"), angle: { field: "ang", type: "quantitative", scale: null } } };
    if (step === 1) return { width: 560, height: 500, layer: [grouped], title: { text: "CO₂ per person, 2005 and " + yr } };
    if (step === 2) return { width: 560, height: 500, layer: [grouped, delta, arrow], resolve: { scale: { x: "shared" } } };
    if (step === 3) return { width: 560, height: 500, layer: [delta, arrow] };
    const xc = Q("change", { scale: { domain: [-8, 5] }, axis: { title: `Change in tonnes per person, 2005 → ${yr}`, grid: true, gridColor: C.grid, orient: "top", tickCount: 6 } });
    const col = step === 5
      ? { field: "dir", type: "nominal", scale: { domain: ["Increase", "Decrease"], range: [C.hot, C.cool] }, legend: { title: null, orient: "top", symbolType: "square", offset: 30 } }
      : { value: C.ink };
    return { width: 560, height: 500, data: { values: pcc },
      transform: [{ calculate: "datum.change > 0 ? 'Increase' : 'Decrease'", as: "dir" }, { calculate: "(datum.change > 0 ? '+' : '−') + format(abs(datum.change), '.1f')", as: "lab" }],
      layer: [
        { mark: { type: "bar", cornerRadiusEnd: 0 }, encoding: { y, x: xc, color: col } },
        { data: { values: [{}] }, mark: { type: "rule", color: C.ink }, encoding: { x: { datum: 0 } } },
        ...(step === 5 ? [
          { transform: [{ filter: "datum.change > 0" }], mark: { type: "text", align: "left", dx: 6, fontSize: 13, color: C.ink }, encoding: { y, x: Q("change"), text: { field: "lab" } } },
          { transform: [{ filter: "datum.change <= 0" }], mark: { type: "text", align: "right", dx: -6, fontSize: 13, color: C.ink }, encoding: { y, x: Q("change"), text: { field: "lab" } } },
        ] : []),
      ] };
  });
})();

/* ======================================================== Example 4
   Alberto Cairo, The Truthful Art (2016), Figures 5.15 and 5.16: the same 25 bars,
   first grouped by generation, then regrouped by advertising method.
   One chart; a fragment with data-chart-event="regroup" slides every bar to its new place
   (signal t goes 0 -> 1), and the colours and labels cross-fade. Values read from the figures. */
(function () {
  const Q = (field, extra = {}) => Object.assign({ field, type: "quantitative" }, extra);
  const methods = ["Television ads", "Newspaper ads", "Magazine ads", "In-theater ads", "Radio ads"];
  const gens = [["Trailing Millennials", "Ages 14–23"], ["Leading Millennials", "Ages 24–29"], ["Xers", "Ages 30–46"], ["Boomers", "Ages 47–65"], ["Matures", "Ages 66+"]];
  const vals = [ // rows: methods, columns: generations (% medium or high net influence)
    [73, 69, 71, 64, 56], [42, 47, 53, 55, 55], [54, 54, 56, 47, 49], [57, 49, 44, 23, 9], [41, 45, 46, 34, 25]];
  const colors = [C.cat[1], C.cat[3], C.cat[0], C.cat[2], C.cat[6]];
  const bars = vals.flatMap((row, m) => row.map((v, g) => ({ m, g, v, method: methods[m], col: colors[m], xa: g * 6 + m, xb: m * 6 + g, n: String(g + 1) })));
  const W = 780, HH = 330, DOM = [-0.6, 29.4];
  const xs = (f) => Q(f, { scale: { domain: DOM, nice: false, zero: false }, axis: null });
  const groupLabels = (names, tExpr) => ({
    data: { values: names.map((t, i) => ({ x: i * 6 + 2.0, t })) },
    mark: { type: "text", baseline: "top", fontSize: 14, color: C.ink, lineHeight: 17, opacity: { expr: tExpr } },
    encoding: { x: xs("x"), y: { value: HH + 10 }, text: { field: "t" } } });
  const legendA = {
    data: { values: methods.map((t, i) => ({ x: i * 6.1, t, col: colors[i] })) },
    layer: [
      { mark: { type: "square", size: 160, opacity: { expr: "1 - t" } }, encoding: { x: xs("x"), y: { value: -26 }, color: { field: "col", type: "nominal", scale: null } } },
      { mark: { type: "text", align: "left", dx: 12, fontSize: 14, color: C.ink, opacity: { expr: "1 - t" } }, encoding: { x: xs("x"), y: { value: -26 }, text: { field: "t" } } },
    ] };
  const legendB = {
    data: { values: gens.map((g, i) => ({ x: i * 6.1, n: String(i + 1), t: g })) },
    layer: [
      { mark: { type: "text", align: "left", fontSize: 26, fontWeight: 600, color: C.cool, opacity: { expr: "t" } }, encoding: { x: xs("x"), y: { value: -24 }, text: { field: "n" } } },
      { mark: { type: "text", align: "left", dx: 20, fontSize: 13, color: C.ink, lineHeight: 15, opacity: { expr: "t" } }, encoding: { x: xs("x"), y: { value: -32 }, text: { field: "t" } } },
    ] };
  Charts.register("ads", {
    spec: () => ({
      width: W, height: HH,
      params: [{ name: "t", value: 0 }],
      title: { text: "To what degree do the following advertising methods influence your buying decisions?", subtitle: "Medium or high net influence", fontSize: 19, offset: 52 },
      layer: [
        { data: { values: bars }, transform: [{ calculate: "datum.xa * (1 - t) + datum.xb * t", as: "x" }, { calculate: "datum.x + 0.86", as: "x2" }],
          layer: [
            { mark: { type: "rect", opacity: { expr: "1 - t" } }, encoding: { x: xs("x"), x2: { field: "x2" },
              y: Q("v", { scale: { domain: [0, 80], nice: false }, axis: { title: null, values: [0, 25, 50, 75], tickCount: 20, labelExpr: "datum.value + '%'" } }), y2: { datum: 0 },
              color: { field: "col", type: "nominal", scale: null } } },
            { mark: { type: "rect", color: C.cool, opacity: { expr: "t" } }, encoding: { x: xs("x"), x2: { field: "x2" }, y: Q("v"), y2: { datum: 0 } } },
            { transform: [{ calculate: "datum.x + 0.43", as: "xc" }], mark: { type: "text", baseline: "bottom", dy: -6, fontSize: 12, color: "#fff", opacity: { expr: "t" } },
              encoding: { x: xs("xc"), y: { datum: 0 }, text: { field: "n" } } },
          ] },
        groupLabels(gens, "1 - t"),
        groupLabels(methods, "t"),
        legendA, legendB,
        { data: { values: [{}] }, mark: { type: "rule", color: C.axis }, encoding: { y: { datum: 0 } } },
      ],
    }),
    events: {
      regroup: {
        show(view) { Charts.tween(0, 1, 1600, (v) => view.signal("t", v).run()); },
        hide(view) { Charts.tween(1, 0, 900, (v) => view.signal("t", v).run()); },
      },
    },
  });
})();
