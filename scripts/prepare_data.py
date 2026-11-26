"""
Build data/data.js (window.DATA = {...}) from the raw downloads in data/raw/.

Everything the charts need lives in that one file, so the slides work even when
opened straight from disk (file://), where fetch() of CSVs is blocked.

Run from the project root:   python3 scripts/prepare_data.py

Raw sources (re-download to refresh):
  data/raw/owid-co2.csv     https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv
  data/raw/gistemp.csv      https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
  data/raw/oni.data         https://psl.noaa.gov/data/correlation/oni.data
  data/raw/co2_mlo.csv      https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.csv
  data/raw/world-110m.json  https://cdn.jsdelivr.net/npm/vega-datasets@2.8.0/data/world-110m.json
  data/raw/unrate.csv       https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE&cosd=2008-01-01&coed=2013-12-01
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "data.js"

LATEST = 2024          # last full year in the OWID file (2025 is a projection)
LAST_FULL_TEMP = 2025  # last full calendar year in GISTEMP

data = {}

# ---------------------------------------------------------------- temperature
g = pd.read_csv(RAW / "gistemp.csv", skiprows=1, na_values="***")
months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
g = g[g.Year <= LAST_FULL_TEMP + 1]

# GISTEMP is relative to 1951-1980. Re-baseline to 1880-1900, a common proxy
# for "pre-industrial", so the 1.5 °C Paris threshold can be drawn honestly.
base = g[(g.Year >= 1880) & (g.Year <= 1900)][months].stack().mean()
data["tempBaselineOffset"] = round(float(base), 3)

annual = g[g.Year <= LAST_FULL_TEMP][["Year", "J-D"]].rename(columns={"Year": "year", "J-D": "anom"})
annual["anomPI"] = (annual.anom - base).round(2)
data["tempAnnual"] = annual.to_dict("records")

mon = g.melt(id_vars="Year", value_vars=months, var_name="m", value_name="anom").dropna()
mon["month"] = mon.m.map({m: i + 1 for i, m in enumerate(months)})
mon["date"] = mon.Year.astype(str) + "-" + mon.month.map("{:02d}".format) + "-15"
mon["anomPI"] = (mon.anom - base).round(2)
mon = mon.sort_values("date")
data["tempMonthly"] = mon[mon.Year >= 1990][["date", "anom", "anomPI"]].to_dict("records")

# 8 x 8 grid of annual anomalies (64 most recent full years) for the "table of numbers" slide
grid = annual[annual.year > LAST_FULL_TEMP - 64].reset_index(drop=True)
grid["row"] = grid.index // 8
grid["col"] = grid.index % 8
data["tempGrid"] = grid[["year", "anom", "row", "col"]].to_dict("records")

# ---------------------------------------------------------------- ENSO (ONI)
rows = []
with open(RAW / "oni.data") as f:
    lines = f.read().splitlines()
for line in lines[1:]:
    parts = line.split()
    if len(parts) != 13 or not parts[0].isdigit():
        continue
    y = int(parts[0])
    for i, v in enumerate(parts[1:]):
        v = float(v)
        if v > -99:
            rows.append({"date": f"{y}-{i + 1:02d}-15", "oni": v})
data["oni"] = [r for r in rows if r["date"] >= "1990"]

# ---------------------------------------------------------------- CO2 ppm
c = pd.read_csv(RAW / "co2_mlo.csv", comment="#")
data["co2ppm"] = c[["year", "mean"]].rename(columns={"mean": "ppm"}).to_dict("records")

# ---------------------------------------------------------------- OWID emissions
o = pd.read_csv(RAW / "owid-co2.csv", usecols=["country", "year", "iso_code", "co2", "co2_per_capita", "cumulative_co2"])
countries = o[o.iso_code.notna() & ~o.iso_code.astype(str).str.startswith("OWID")]

latest = countries[countries.year == LATEST]
pc = latest.set_index("country").co2_per_capita
data["perCapitaLatestYear"] = LATEST
data["perCapita"] = {k: round(float(pc[k]), 1) for k in
                     ["Canada", "India", "China", "United Kingdom", "United States", "Brazil", "Germany", "Japan"]}

# cumulative emissions (billion tonnes = Gt) for the same 27 countries, in the same order,
# as the original folded-bar slide: a few huge values next to many very small ones.
snake_order = ["United States", "United Kingdom", "Turkey", "Switzerland", "Sweden", "Spain", "South Korea", "Russia",
               "Portugal", "Norway", "Netherlands", "Mexico", "Italy", "Israel", "Ireland", "Iran", "Germany", "France",
               "Egypt", "Czechia", "China", "Canada", "Brazil", "Belgium", "Austria", "Australia", "Argentina"]
cum = latest.set_index("country").loc[snake_order, ["cumulative_co2"]].reset_index()
cum["gt"] = (cum.cumulative_co2 / 1000).round(2)
data["cumulative"] = cum[["country", "gt"]].to_dict("records")

# Example 1: emissions indexed to 1990 = 100
ex1 = ["China", "India", "United States", "Canada", "Japan", "United Kingdom"]
t = countries[countries.country.isin(ex1) & (countries.year >= 1990) & (countries.year <= LATEST)][["country", "year", "co2"]].copy()
b90 = t[t.year == 1990].set_index("country").co2
t["index"] = (t.co2 / t.country.map(b90) * 100).round(1)
data["co2Index"] = t[["country", "year", "index"]].to_dict("records")

# Example 3: per-person emissions, 2005 vs latest
ex3 = ["United States", "Australia", "Canada", "Russia", "Germany", "Japan", "United Kingdom",
       "France", "China", "South Africa", "Mexico", "Brazil", "Indonesia", "India", "Vietnam"]
a = countries[countries.country.isin(ex3) & countries.year.isin([2005, LATEST])]
w = a.pivot(index="country", columns="year", values="co2_per_capita").round(1).reset_index()
w.columns = ["country", "y2005", "yLatest"]
w["change"] = (w.yLatest - w.y2005).round(1)
data["perCapitaChange"] = w.to_dict("records")

# ---------------------------------------------------------------- US unemployment ("Take a look at this chart")
u = pd.read_csv(RAW / "unrate.csv")
u = u[(u.observation_date >= "2008-10-01") & (u.observation_date <= "2012-09-01")]
data["unemployment"] = [{"date": d[:7], "rate": float(r)} for d, r in zip(u.observation_date, u.UNRATE)]

# ---------------------------------------------------------------- map
data["world"] = json.loads((RAW / "world-110m.json").read_text())

OUT.write_text("// Generated by scripts/prepare_data.py - do not edit by hand.\nwindow.DATA = "
               + json.dumps(data, separators=(",", ":")) + ";\n")
print("wrote", OUT, f"{OUT.stat().st_size/1024:.0f} KB")
print("baseline offset", data["tempBaselineOffset"])
print("per capita", data["perCapita"])
print("cumulative", data["cumulative"])
print("change", data["perCapitaChange"])
print("grid", data["tempGrid"][0], data["tempGrid"][-1])
