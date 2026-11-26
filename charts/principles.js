/* Part 2 - Visualization best practices (after Franconeri et al. 2021,
   "The Science of Visual Data Communication: What Works").
   Most of these are schematic: no data axes, just the idea. */
(function () {
  const D = window.DATA;
  const Q = (field, extra = {}) => Object.assign({ field, type: "quantitative" }, extra);
  const off = { axis: null };

  /* ---------------------------------------------------------- "Take a look at this chart"
     Recreation of the unemployment chart (after the NYT, 2012), with BLS data via FRED.
     step 1: bare chart   2: + title & description   3: designed (goal line, shading, notes) */
  const un = D.unemployment.map((d) => Object.assign({ t: d.date + "-01" }, d));
  const yearTicks = [2009, 2010, 2011, 2012].map((year) => ({ year, month: 1, date: 1 }));
  // o: { w, h, fs } sizes, so the same design can be shown large (Part 2) or side by side (Part 4)
  function unemp(step, o = { w: 760, h: 400, fs: 18 }) {
    const designed = step === 3;
    const x = { field: "t", type: "temporal", scale: { domain: ["2008-09-01", "2012-10-01"] },
      axis: { title: null, format: "%Y", values: yearTicks, grid: true, gridColor: C.grid, domain: false, ticks: false,
        labelFontSize: o.fs - 2, labelColor: C.ink, labelAlign: "left", labelPadding: 10 } };
    const dom = { domain: [6.2, 10.3], nice: false };
    const y = Q("rate", { scale: dom, axis: { title: "Unemployment rate", titleFontStyle: "italic", titleFontSize: o.fs - 2, titleColor: C.ink,
      values: [7, 8, 9, 10], labelExpr: "datum.value + '%'", labelFontSize: o.fs - 2, labelColor: C.ink } });
    const title = {
      text: "Unemployment is higher than stated goals",
      subtitle: step === 2 ? ["In 2008, the president promised unemployment rates under 8% before 2011.", "Yet, in 2011, unemployment was still at 9%"] : [" ", " "],
      fontSize: o.fs + 6, subtitleFontSize: o.fs - 1, subtitleFontStyle: "italic", subtitleColor: C.ink, color: step === 1 ? C.bg : C.ink,
    };
    const layers = [];
    if (designed) layers.push(
      { transform: [{ filter: "datum.date >= '2009-01' && datum.date <= '2011-01'" }, { calculate: "max(datum.rate, 8)", as: "hi" }],
        mark: { type: "area", color: C.hotSoft, opacity: 0.75 }, encoding: { x, y: Q("hi", { scale: dom }), y2: { datum: 8 } } },
      { transform: [{ filter: "datum.date >= '2011-01' && datum.date <= '2012-01'" }, { calculate: "max(datum.rate, 8)", as: "hi" }],
        mark: { type: "area", color: "#C98B6B", opacity: 0.75 }, encoding: { x, y: Q("hi", { scale: dom }), y2: { datum: 8 } } },
      { data: { values: [{}] }, mark: { type: "rule", color: C.hot, strokeDash: [10, 8], strokeWidth: 4 }, encoding: { y: { datum: 8 } } },
      { data: { values: [
          { t: "2009-04-01", y: 7.8, txt: ["In 2008, the president promised", "unemployment rates of 8% before", "2011"] },
          { t: "2011-01-01", y: 10.15, txt: ["Yet, in 2011,", "unemployment was", "still at 9%"] }] },
        mark: { type: "text", align: "left", fontSize: o.fs, fontStyle: "italic", fontWeight: 600, color: C.ink, lineHeight: o.fs + 4, baseline: "top" },
        encoding: { x: { field: "t", type: "temporal" }, y: Q("y"), text: { field: "txt" } } },
    );
    layers.push({ mark: { type: "line", color: C.ink, strokeWidth: o.fs > 16 ? 5 : 4, strokeJoin: "miter" }, encoding: { x, y } });
    return { width: o.w, height: o.h, data: { values: un }, title, layer: layers };
  }
  Charts.register("take-a-look", (step) => unemp(step));

  /* ---------------------------------------------------------- Part 4: the same data, two stories
     The framings follow the NYT's "One Report, Diverging Perspectives" (Oct 5, 2012):
     Republican: "The rate was above 8 percent for 43 months."
     Democrat:   "The rate has fallen more than 2 points since its recent peak." */
  const SMALL = { w: 470, h: 330, fs: 15 };
  Charts.register("unemp-gop", () => unemp(3, SMALL));
  Charts.register("unemp-dem", () => {
    const o = SMALL;
    const spec = unemp(1, o);
    spec.title = { text: "Unemployment has fallen 2 points since its peak", subtitle: [" ", " "], fontSize: o.fs + 6, subtitleFontSize: o.fs - 1, color: C.ink };
    const x = spec.layer[0].encoding.x, y = spec.layer[0].encoding.y;
    const ys = y.scale; // the same fixed y scale on every layer, so nothing widens the domain
    const Y = (v) => ({ datum: v, type: "quantitative", scale: ys });
    const T = (t) => ({ datum: { year: +t.slice(0, 4), month: +t.slice(5, 7), date: 1 }, type: "temporal" });
    spec.layer = [
      { data: { values: [{}] }, mark: { type: "rule", color: C.cool, strokeDash: [6, 5], strokeWidth: 2 }, encoding: { x: T("2009-10"), x2: T("2012-09"), y: Y(10) } },
      { mark: { type: "line", color: C.context, strokeWidth: 4, strokeJoin: "miter" }, encoding: { x, y } },
      { transform: [{ filter: "datum.date >= '2009-10'" }], mark: { type: "line", color: C.cool, strokeWidth: 4, strokeJoin: "miter" }, encoding: { x, y } },
      { data: { values: [{}] }, mark: { type: "rule", color: C.cool, strokeWidth: 3 }, encoding: { x: T("2012-09"), y: Y(10), y2: { datum: 7.8 } } },
      { data: { values: [{ t: "2009-10-01", y: 10 }, { t: "2012-09-01", y: 7.8 }] }, mark: { type: "point", filled: true, size: 110, color: C.cool },
        encoding: { x: { field: "t", type: "temporal" }, y: Q("y", { scale: ys }) } },
      ...["left", "right"].map((a) => ({ data: { values: [
          { t: "2009-12-01", y: 10.18, txt: "10.0% in October 2009", a: "left" },
          { t: "2012-08-01", y: 8.9, txt: ["down", "2.2 points"], a: "right" },
          { t: "2012-09-01", y: 7.6, txt: "7.8% in September 2012", a: "right" }].filter((d) => d.a === a) },
        mark: { type: "text", align: a, fontSize: o.fs, fontStyle: "italic", fontWeight: 600, color: C.ink, lineHeight: o.fs + 4, baseline: "middle" },
        encoding: { x: { field: "t", type: "temporal" }, y: Q("y", { scale: ys }), text: { field: "txt" } } })),
    ];
    return spec;
  });

  // the Fox News "If Bush tax cuts expire" bars, redrawn from zero
  Charts.register("tax-cuts", () => ({
    width: 380, height: 360, data: { values: [{ k: "Now", v: 35 }, { k: "Jan. 1, 2013", v: 39.6 }] },
    title: { text: "Top tax rate if Bush tax cuts expire", fontSize: 18 },
    layer: [
      { mark: { type: "bar", color: C.ink }, encoding: {
        x: { field: "k", type: "nominal", sort: null, axis: { title: null, labelFontSize: 15, labelColor: C.ink, domainColor: C.ink }, scale: { paddingInner: 0.35 } },
        y: Q("v", { scale: { domain: [0, 45] }, axis: { title: "%", values: [0, 10, 20, 30, 40] } }) } },
      { mark: { type: "text", dy: -12, fontSize: 16, fontWeight: 600 }, encoding: { x: { field: "k", type: "nominal", sort: null }, y: Q("v"), text: { field: "v", format: ".1~f" } } },
    ],
  }));

  /* ---------------------------------------------------------- 01 encodings, one glyph each */
  const frame = (w, h, layers, dom = [0, 8]) => ({
    width: w, height: h, layer: layers,
    resolve: { scale: { x: "shared", y: "shared" } },
  });
  const L = (values, mark, enc) => ({ data: { values }, mark, encoding: enc });
  const xs = (dom) => ({ scale: { domain: dom }, ...off });

  Charts.register("enc-position", () => frame(300, 150, [
    L([{ x: 0, y: 0, x2: 8.2, y2: 0 }, { x: 0, y: 0, x2: 0, y2: 10 }], { type: "rule", color: C.ink, strokeWidth: 1.5 },
      { x: Q("x", xs([0, 8.4])), y: Q("y", xs([0, 10])), x2: { field: "x2" }, y2: { field: "y2" } }),
    L([{ x: 1, y: 6, t: "1" }, { x: 7, y: 6, t: "7" }], { type: "point", size: 600, color: C.context, stroke: C.ink, strokeWidth: 1.5 }, { x: Q("x"), y: Q("y") }),
    L([{ x: 1, y: -1.8, t: "1" }, { x: 7, y: -1.8, t: "7" }], { type: "text", fontSize: 18 }, { x: Q("x"), y: Q("y"), text: { field: "t" } }),
  ]));

  Charts.register("enc-length", () => frame(300, 150, [
    L([{ x: 0, x2: 7, y: 4, y2: 7 }], { type: "rect", fill: C.context, stroke: C.ink, strokeWidth: 1.5 }, { x: Q("x", xs([0, 8.4])), x2: { field: "x2" }, y: Q("y", xs([0, 10])), y2: { field: "y2" } }),
    L([{ x: 0, x2: 1, y: 4, y2: 7 }], { type: "rect", fill: C.ink }, { x: Q("x"), x2: { field: "x2" }, y: Q("y"), y2: { field: "y2" } }),
    L([{ x: 0.5, y: 5.5, t: "1", c: "w" }, { x: 6.5, y: 5.5, t: "7", c: "k" }], { type: "text", fontSize: 18 },
      { x: Q("x"), y: Q("y"), text: { field: "t" }, color: { field: "c", type: "nominal", scale: { range: [C.ink, "#fff"], domain: ["k", "w"] }, legend: null } }),
  ]));

  Charts.register("enc-angle", () => {
    const glyph = (cx, deg, t) => {
      const r = 3, a = (deg * Math.PI) / 180;
      return [
        { x: cx, y: 0, x2: cx + 3.2, y2: 0 }, { x: cx, y: 0, x2: cx, y2: 3.6 },
        { x: cx + 0.2, y: 0.4, x2: cx + 0.2 + r * Math.cos(a), y2: 0.4 + r * Math.sin(a), main: 1, t },
      ];
    };
    const rows = [...glyph(0.4, 11, "1"), ...glyph(5, 70, "7")];
    return frame(300, 150, [
      L(rows, { type: "rule", color: C.ink }, { x: Q("x", xs([0, 8.6])), y: Q("y", xs([-0.4, 4])), x2: { field: "x2" }, y2: { field: "y2" },
        strokeWidth: { condition: { test: "datum.main", value: 4 }, value: 1.5 } }),
      L(rows.filter((r) => r.main), { type: "text", fontSize: 18, dx: 14, dy: -4 }, { x: Q("x2"), y: Q("y2"), text: { field: "t" } }),
    ]);
  });

  Charts.register("enc-intensity", () => frame(300, 150, [
    L([{ x: 1.5, v: 1, t: "1" }, { x: 6.5, v: 7, t: "7" }], { type: "point", size: 1800, filled: true, stroke: C.ink, strokeWidth: 1.5, opacity: 1 },
      { x: Q("x", xs([0, 8])), y: { value: 75 }, fill: Q("v", { scale: H.grayScale(7.5), legend: null }) }),
    L([{ x: 1.5, t: "1", c: "k" }, { x: 6.5, t: "7", c: "w" }], { type: "text", fontSize: 18 },
      { x: Q("x"), y: { value: 75 }, text: { field: "t" }, color: { field: "c", type: "nominal", scale: { range: [C.ink, "#fff"], domain: ["k", "w"] }, legend: null } }),
  ]));

  /* ---------------------------------------------------------- 02 illusions */
  const ab = [{ k: "a", v: 98.35 }, { k: "b", v: 98.75 }];
  const truncY = { scale: { domain: [98, 99] }, axis: { values: [98, 99], title: null, grid: false, domain: true, domainColor: C.ink, ticks: true, labelFontSize: 16, labelColor: C.ink } };
  const abX = { field: "k", type: "nominal", axis: { title: null, labelFontSize: 16, labelColor: C.ink, domainColor: C.ink }, scale: { paddingInner: 0.5, paddingOuter: 0.5 } };
  Charts.register("nonzero-dots", () => ({ width: 120, height: 200, data: { values: ab },
    mark: { type: "point", size: 160, color: C.ink }, encoding: { x: abX, y: Q("v", truncY) } }));
  Charts.register("nonzero-bars", () => ({ width: 120, height: 200, data: { values: ab },
    mark: { type: "bar", color: C.ink, clip: true }, encoding: { x: abX, y: Q("v", truncY), y2: { datum: 98 } } }));

  const enroll = [{ k: "As of March 27", v: 6.0, lab: "6,000,000" }, { k: "March 31 goal", v: 7.066, lab: "7,066,000" }];
  Charts.register("obamacare-fixed", (step) => {
    const trunc = step === 1;
    return { width: 340, height: 360, data: { values: enroll },
      title: { text: trunc ? "Axis starts at 5.5 million" : "Axis starts at zero", fontSize: 17 },
      layer: [
        { mark: { type: "bar", color: trunc ? C.hot : C.ink, clip: true, cornerRadiusEnd: 0 },
          encoding: { x: { field: "k", type: "nominal", sort: null, axis: { title: null, labelFontSize: 15, labelColor: C.ink }, scale: { paddingInner: 0.35 } },
            y: Q("v", { scale: { domain: trunc ? [5.5, 7.2] : [0, 7.2] }, axis: { title: "million", format: ".1f", tickCount: 4 } }), y2: { datum: trunc ? 5.5 : 0 } } },
        { mark: { type: "text", dy: -12, fontSize: 16, fontWeight: 600 },
          encoding: { x: { field: "k", type: "nominal", sort: null }, y: Q("v"), text: { field: "lab" } } },
      ] };
  });

  // stacked bars (after Franconeri et al. Fig.): black segments share a baseline, so their
  // differences are easy to see. The dark grey segments differ by exactly the same amounts.
  const seg = [[3.0, 2.3, 1.2], [2.0, 1.3, 1.0], [2.5, 1.8, 1.4]].flatMap(([k, d, l], r) => [
    { r, s: "1 black", v: k }, { r, s: "2 dark", v: d }, { r, s: "3 light", v: l }]);
  Charts.register("stacked-illusion", (step) => ({
    width: 520, height: 230, data: { values: seg },
    layer: [
      { mark: { type: "bar", stroke: C.ink, strokeWidth: 1.5, cornerRadiusEnd: 0 },
        encoding: { y: { field: "r", type: "ordinal", axis: null, scale: { paddingInner: 0.4 } },
          x: Q("v", { stack: "zero", axis: null, scale: { domain: [0, 6.6] } }), order: { field: "s" },
          color: { field: "s", type: "nominal", legend: null, scale: { domain: ["1 black", "2 dark", "3 light"],
            range: step === 2 ? ["#3a404a", C.hot, "#E3E5E8"] : [C.ink, "#8A9099", "#E3E5E8"] } },
          opacity: step === 2 ? { condition: { test: "datum.s == '2 dark'", value: 1 }, value: 0.35 } : { value: 1 } } },
      { data: { values: [{}] }, mark: { type: "rule", color: C.ink, strokeWidth: 2 }, encoding: { x: { datum: 0 } } },
    ],
  }));

  // flat (light) and steep (dark) segments, a constant vertical distance apart
  const zig = (dy) => [[0, 0], [3, 0], [4, 5], [7, 5]].map(([x, y], i) => ({ x, y: y + dy, i }));
  const zz = [...zig(0).map((d) => Object.assign({ s: "a" }, d)), ...zig(1.3).map((d) => Object.assign({ s: "b" }, d))];
  const segs = zz.filter((d) => d.i < 3).map((d) => { const n = zz.find((e) => e.s === d.s && e.i === d.i + 1); return { x: d.x, y: d.y, x2: n.x, y2: n.y, steep: d.i === 1 }; });
  // Both steps use exactly the same fixed scales (no "nice", no zero), so the lines never move;
  // step 2 only adds the equal vertical gaps on top.
  const lx = (f) => Q(f, { axis: null, scale: { domain: [0, 7], nice: false, zero: false } });
  const ly = (f) => Q(f, { axis: null, scale: { domain: [-0.3, 6.6], nice: false, zero: false } });
  const gaps = [0.6, 1.7, 2.6, 3.25, 3.5, 3.75, 4.6, 5.6, 6.5].map((x) => { const f = x < 3 ? 0 : x > 4 ? 5 : 5 * (x - 3); return { x, y: f + 0.18, y2: f + 1.12 }; });
  Charts.register("lines-illusion", (step) => ({
    width: 420, height: 300,
    layer: [
      { data: { values: segs }, mark: { type: "rule", strokeCap: "butt" },
        encoding: { x: lx("x"), y: ly("y"), x2: { field: "x2" }, y2: { field: "y2" },
          color: { condition: { test: "datum.steep", value: C.ink }, value: "#C9CCD1" }, strokeWidth: { condition: { test: "datum.steep", value: 5 }, value: 7 } } },
      { data: { values: gaps }, mark: { type: "rule", color: C.hot, strokeWidth: 3, opacity: step === 2 ? 1 : 0 },
        encoding: { x: lx("x"), y: ly("y"), y2: { field: "y2" } } },
    ],
  }));

  // the same grey looks different on different backgrounds
  Charts.register("intensity-illusion", (step) => ({
    width: 460, height: 220,
    layer: [
      ...(step === 1 ? [{ data: { values: d3range(0, 99, 1).map((x) => ({ x, x2: x + 1, v: x })) }, mark: { type: "rect" },
        encoding: { x: Q("x", { axis: null, scale: { domain: [0, 100] } }), x2: { field: "x2" }, y: { value: 0 }, y2: { value: 220 },
          color: Q("v", { scale: { domain: [0, 100], range: ["#2a2f36", "#f4f3ef"] }, legend: null }) } }] : []),
      { data: { values: [{ x: 18 }, { x: 82 }] }, mark: { type: "point", size: 4200, filled: true, color: "#8A8F96", opacity: 1 },
        encoding: { x: Q("x", { axis: null, scale: { domain: [0, 100] } }), y: { value: 110 } } },
    ],
  }));
  function d3range(a, b, s) { const o = []; for (let v = a; v <= b + 1e-9; v += s) o.push(+v.toFixed(3)); return o; }

  /* ---------------------------------------------------------- 03 global statistics are fast */
  const dots = [["a", 2.6], ["b", 3.6], ["c", 3.1], ["d", 4.1], ["e", 2.2], ["f", 3.4]].map(([k, v]) => ({ k, v }));
  const kX = { field: "k", type: "nominal", axis: { title: null, labelFontSize: 17, labelColor: C.ink, domainColor: C.ink, ticks: false }, scale: { paddingOuter: 0.5 } };
  const yDom = (dom) => ({ scale: { domain: dom }, axis: { title: null, labels: false, grid: false, domain: true, domainColor: C.ink, ticks: false } });
  Charts.register("ensemble-dots", (step) => {
    const vals = dots.map((d) => d.v); const mean = vals.reduce((a, b) => a + b) / vals.length;
    const stats = [{ t: "Max height", v: Math.max(...vals) }, { t: "Mean height", v: mean }, { t: "Min height", v: Math.min(...vals) }];
    return { width: 380, height: 260, layer: [
      { data: { values: dots }, mark: { type: "point", size: 300, color: C.context, stroke: C.ink, strokeWidth: 1.5, opacity: 1 }, encoding: { x: kX, y: Q("v", yDom([1, 5])) } },
      ...(step === 2 ? [
        { data: { values: stats }, mark: { type: "rule", color: C.hot, strokeWidth: 2.5, strokeDash: [5, 4] }, encoding: { y: Q("v") } },
        { data: { values: stats }, mark: { type: "text", align: "left", dx: 8, fontSize: 16, fontWeight: 600, color: C.hot }, encoding: { x: { value: 380 }, y: Q("v"), text: { field: "t" } } },
      ] : []),
    ] };
  });
  const sbars = [["a", 2.1, 4.6], ["b", 3.0, 4.0], ["c", 1.4, 4.4], ["d", 3.6, 4.8], ["e", 2.5, 3.6], ["f", 1.9, 4.2]].map(([k, dark, tot]) => ({ k, dark, tot }));
  Charts.register("ensemble-bars", (step) => {
    const dk = sbars.map((d) => d.dark); const mean = dk.reduce((a, b) => a + b) / dk.length;
    const mx = Math.max(...dk), mn = Math.min(...dk);
    const x = Object.assign({}, kX, { scale: { paddingInner: 0.55, paddingOuter: 0.5 } });
    return { width: 380, height: 260, data: { values: sbars }, layer: [
      { mark: { type: "bar", fill: "#fff", stroke: C.ink, strokeWidth: 1.5, cornerRadiusEnd: 0 }, encoding: { x, y: Q("tot", yDom([0, 5.4])) } },
      { mark: { type: "bar", cornerRadiusEnd: 0 }, encoding: { x, y: Q("dark"),
        color: step === 2 ? { condition: { test: `datum.dark == ${mx} || datum.dark == ${mn}`, value: C.hot }, value: "#5d636c" } : { value: "#5d636c" } } },
      ...(step === 2 ? [
        { data: { values: [{ v: mean }] }, mark: { type: "rule", color: C.hot, strokeWidth: 2.5, strokeDash: [5, 4] }, encoding: { y: Q("v") } },
        { data: { values: [{ v: mean, t: ["Mean length", "of dark bars"] }] }, mark: { type: "text", align: "left", dx: 8, fontSize: 16, fontWeight: 600, color: C.hot, lineHeight: 19 }, encoding: { x: { value: 380 }, y: Q("v"), text: { field: "t" } } },
        { transform: [{ filter: `datum.dark == ${mx} || datum.dark == ${mn}` }, { calculate: `datum.dark == ${mx} ? 'Max' : 'Min'`, as: "t" }],
          mark: { type: "text", dy: -10, fontSize: 16, fontWeight: 600, color: C.hot, baseline: "bottom" }, encoding: { x, y: Q("tot"), text: { field: "t" } } },
      ] : []),
    ] };
  });

  /* ---------------------------------------------------------- 04 / 05 comparisons
     1 lollipops · 2 floating bars · 3 + direct depiction of the deltas · 4 highlight the increases */
  const pairs = [["a", 2.5, 3.5], ["b", 4.2, 3.6], ["c", 3.0, 5.3], ["d", 5.6, 4.6], ["e", 2.6, 3.6], ["f", 3.6, 2.2]]
    .flatMap(([k, v1, v2]) => [{ k, t: "1", v: v1, up: v2 > v1 }, { k, t: "2", v: v2, up: v2 > v1 }]);
  const floats = [[2.0, 4.0, 1.8, 4.4], [3.5, 5.2, 1.6, 3.9], [1.5, 3.4, 2.3, 4.9], [2.3, 5.7, 3.6, 5.9], [2.6, 4.2, 2.0, 3.6], [2.7, 4.1, 3.3, 4.5]]
    .flatMap(([a, b, c, d], i) => [{ k: "abcdef"[i], t: "1", lo: a, hi: b }, { k: "abcdef"[i], t: "2", lo: c, hi: d }]);
  const deltas = [...new Set(pairs.map((p) => p.k))].map((k) => { const [a, b] = pairs.filter((p) => p.k === k); return { k, d: +(b.v - a.v).toFixed(2), up: b.v > a.v }; });
  Charts.register("pairs", (step) => {
    const x = { field: "k", type: "nominal", axis: { title: null, labelFontSize: 18, labelColor: C.ink, domainColor: C.ink, ticks: false }, scale: { paddingInner: 0.4 } };
    const y = Q("v", { scale: { domain: [0, 6] }, axis: { title: null, labels: false, grid: false, domain: true, domainColor: C.ink, ticks: false } });
    const W = 560, HH = 260;
    if (step === 2) return { width: W, height: HH, data: { values: floats },
      mark: { type: "bar", color: "#A3A8B0", size: 16, cornerRadiusEnd: 0 },
      encoding: { x, xOffset: { field: "t" }, y: Q("lo", { scale: { domain: [0, 6] }, axis: y.axis }), y2: { field: "hi" } } };
    const hl = step === 4;
    const on = (a, b) => (hl ? { condition: { test: "datum.up", value: a }, value: b } : { value: b });
    const xy = { x, xOffset: { field: "t" }, y };
    const lol = { width: W, height: HH, data: { values: pairs },
      layer: [
        { mark: { type: "rule", strokeWidth: 2 }, encoding: Object.assign({ y2: { datum: 0 }, color: hl ? on(C.ink, C.context) : { value: "#8a9099" } }, xy) },
        { mark: { type: "point", size: 190, filled: true, strokeWidth: 1.5, opacity: 1 },
          encoding: Object.assign({ fill: hl ? on(C.hot, "#fff") : { value: C.context }, stroke: hl ? on(C.ink, C.context) : { value: C.ink } }, xy) },
        ...(hl ? [{ data: { values: [{ t: "“a, c, & e have increased”" }] }, mark: { type: "text", fontSize: 20, fontWeight: 500, color: C.ink, baseline: "top" },
          encoding: { x: { value: W / 2 }, y: { value: HH + 44 }, text: { field: "t" } } }] : []),
      ] };
    if (step === 3) return { vconcat: [lol, { width: W, height: 90, data: { values: deltas },
      layer: [
        { mark: { type: "bar", cornerRadiusEnd: 0, size: 18 }, encoding: { x: Object.assign({}, x, { axis: null }), y: Q("d", { axis: null, scale: { domain: [-2.5, 2.5] } }),
          color: { condition: { test: "datum.up", value: C.ink }, value: "#A3A8B0" } } },
        { data: { values: [{}] }, mark: { type: "rule", color: C.ink }, encoding: { y: { datum: 0 } } },
        { data: { values: [{ t: "Δ" }] }, mark: { type: "text", fontSize: 20, align: "right", dx: -10, color: C.ink }, encoding: { x: { value: 0 }, y: { datum: 0 }, text: { field: "t" } } },
      ] }], spacing: 30 };
    return lol;
  });
})();
