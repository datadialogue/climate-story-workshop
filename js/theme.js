/* ------------------------------------------------------------------
   Design tokens + the shared Vega-Lite config.
   Every chart in charts/*.js pulls its colours from window.C, so the
   whole deck can be re-themed here (keep in sync with theme/climate.scss).
------------------------------------------------------------------- */
window.C = {
  bg: "#FBFAF7",        // slide background (charts paint it so overlays cover)
  ink: "#1C2430",       // primary text / emphasis marks
  muted: "#6B7280",     // secondary text, axis labels
  axis: "#9AA1AB",      // axis domain + ticks
  grid: "#E7E5E0",      // recessive gridlines
  context: "#C9CCD1",   // de-emphasised "everything else" marks
  faint: "#E3E5E8",
  hot: "#D4572C",       // warm accent (warming, increases, the one thing to look at)
  cool: "#1D6FA3",      // cool accent (cooling, decreases)
  hotSoft: "#F6D2C2",
  coolSoft: "#CFE2F0",
  // categorical slots in fixed order (validated default palette)
  cat: ["#257de0", "#f47230", "#00b894", "#f2a600", "#ee7fac", "#008a17", "#6a4ce2", "#ec4647"],
  // diverging blue <-> red with a neutral middle (warming-stripes style)
  div: ["#08306b", "#2171b5", "#6baed6", "#c6dbef", "#f2f0ec", "#fcbba1", "#fb6a4a", "#cb181d", "#67000d"],
  font: "Inter, 'Helvetica Neue', Arial, sans-serif",
  serif: "Fraunces, Georgia, serif",
};

window.VL_CONFIG = {
  background: C.bg,
  padding: 8,
  font: C.font,
  view: { stroke: null },
  title: {
    font: C.font, fontSize: 20, fontWeight: 600, color: C.ink, anchor: "start",
    subtitleFont: C.font, subtitleFontSize: 15, subtitleColor: C.muted, subtitlePadding: 6, offset: 16,
  },
  axis: {
    labelFont: C.font, labelFontSize: 14, labelColor: C.muted, labelPadding: 6,
    titleFont: C.font, titleFontSize: 14, titleFontWeight: 500, titleColor: C.muted, titlePadding: 10,
    domainColor: C.axis, tickColor: C.axis, tickSize: 5, grid: false,
  },
  axisY: { domain: false, ticks: false, grid: true, gridColor: C.grid, tickCount: 5, titleAngle: 0, titleAlign: "left", titleAnchor: "end", titleY: -14, titleX: 0 },
  axisX: { labelAngle: 0 },
  axisBand: { ticks: false, domain: true },
  legend: {
    labelFont: C.font, labelFontSize: 14, labelColor: C.ink, titleFont: C.font, titleFontSize: 13,
    titleColor: C.muted, symbolSize: 120, orient: "top", direction: "horizontal", titleOrient: "left",
  },
  header: { labelFont: C.font, labelFontSize: 15, labelColor: C.ink, titleFontSize: 0 },
  text: { font: C.font, fontSize: 14, color: C.ink },
  line: { strokeWidth: 2.5, strokeCap: "round", strokeJoin: "round" },
  point: { size: 90, filled: true },
  bar: { cornerRadiusEnd: 0 },
  range: { category: C.cat },
};
