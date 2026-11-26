/* Part 4 - How we design changes the story. */
(function () {
  const Q = (field, extra = {}) => Object.assign({ field, type: "quantitative" }, extra);

  /* ---------------------------------------------------------- immigration and housing prices
     Recreation of the three original charts (values traced from them; the originals cite the
     American Community Survey and the Zillow Home Value Index), same three steps:
     1 immigrant share alone, zoomed axis · 2 + housing price on a second, zoomed axis
     3 the same two lines with both axes from zero */
  const rows = [
    [2016, 9.30, 216], [2017, 9.49, 230], [2018, 9.51, 243], [2019, 9.55, 255],
    [2020, 9.39, 269], [2021, 9.50, 306], [2022, 9.68, 347], [2023, 10.0, 354],
  ].map(([year, share, price]) => ({ year, share, price: price * 1000 }));
  const BLUE = C.cool, ORANGE = "#E8890C";
  Charts.register("immigration", (step) => {
    const zero = step === 3;
    const x = Q("year", { scale: { domain: [2015.7, 2023.3], nice: false }, axis: { title: null, format: "d", values: rows.map((d) => d.year), grid: false, labelFontSize: 16 } });
    const shareDom = zero ? [0, 10.6] : [9.25, 10.05];
    const priceDom = zero ? [0, 375000] : [205000, 365000];
    const axisCommon = { labelFontSize: 15, titleFontSize: 16, titleFontWeight: 600, grid: false, labelOverlap: false, tickCount: 20 };
    const share = {
      layer: [
        { mark: { type: "line", color: BLUE, strokeWidth: 3.5 } },
        { mark: { type: "point", filled: true, color: BLUE, size: 110, opacity: 1 } },
      ],
      encoding: { x, y: Q("share", { scale: { domain: shareDom, nice: false, zero: false },
        axis: Object.assign({}, axisCommon, { title: "Immigrant share (%)", titleColor: BLUE, labelColor: BLUE, values: zero ? [0, 2, 4, 6, 8, 10] : [9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.0], format: zero ? "d" : ".1f" }) }) },
    };
    const price = {
      layer: [
        { mark: { type: "line", color: ORANGE, strokeWidth: 3.5, opacity: step === 1 ? 0 : 1 } },
        { mark: { type: "point", filled: true, color: ORANGE, size: 110, opacity: step === 1 ? 0 : 1 } },
      ],
      encoding: { x, y: Q("price", { scale: { domain: priceDom, nice: false, zero: false },
        axis: Object.assign({}, axisCommon, { orient: "right", title: "Housing price ($)", titleColor: ORANGE, labelColor: ORANGE,
          titleAnchor: "end", titleAlign: "right", titleX: 0, labelExpr: "datum.value == 0 ? '$0' : '$' + format(datum.value / 1000, 'd') + 'k'",
          values: zero ? [0, 50000, 100000, 150000, 200000, 250000, 300000, 350000] : [220000, 240000, 260000, 280000, 300000, 320000, 340000, 360000],
          labelOpacity: step === 1 ? 0 : 1, titleOpacity: step === 1 ? 0 : 1 }) }) },
    };
    return {
      width: 820, height: 420, data: { values: rows },
      title: { text: "Average immigrant share (%) and housing price trends across all states (2016–2023)", color: zero ? C.ink : C.bg, fontSize: 19 },
      layer: [price, share],
      resolve: { scale: { y: "independent" } },
    };
  });
})();
