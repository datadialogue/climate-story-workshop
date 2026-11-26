/* Small helpers shared by charts/*.js */
window.H = {
  // minus sign that typesets properly
  fmt(v, d = 1) { return (v < 0 ? "−" : "") + Math.abs(v).toFixed(d); },
  signed(v, d = 1) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d); },

  // push label positions apart so they never overlap (values in data units)
  spread(items, key, minGap) {
    const s = [...items].sort((a, b) => a[key] - b[key]);
    for (let k = 0; k < 50; k++) {
      let moved = false;
      for (let i = 1; i < s.length; i++) {
        const gap = s[i][key] - s[i - 1][key];
        if (gap < minGap) { const d = (minGap - gap) / 2; s[i][key] += d; s[i - 1][key] -= d; moved = true; }
      }
      if (!moved) break;
    }
    return items;
  },

  // white -> ink intensity scale used for "intensity" encodings (same everywhere)
  grayScale(max) { return { domain: [0, max], range: ["#FFFFFF", C.ink], interpolate: "rgb" }; },

  // diverging temperature scale centred on 0
  tempScale(ext = 1.3) {
    const n = C.div.length;
    return { domain: C.div.map((_, i) => -ext + (2 * ext * i) / (n - 1)), range: C.div, clamp: true };
  },

  // a text annotation layer: [{x, y, text, align, dx, dy}] in data space
  notes(rows, opts = {}) {
    return {
      data: { values: rows },
      mark: Object.assign({ type: "text", align: "left", baseline: "middle", fontSize: 15, color: C.ink, lineHeight: 19 }, opts),
      encoding: Object.assign({ text: { field: "text" } }, opts.enc || {}),
    };
  },
};
