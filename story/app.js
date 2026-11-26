/* ==========================================================================
   AHVAZ & THE KARUN — SCROLLYTELLING ENGINE
   Layered D3 geographic map (global Mercator, zero antimeridian cut),
   anchored location photo cards, native video clips, river cross-section,
   and directly-annotated hydrological & wildfire charts.
   ========================================================================== */

(function () {
  const DATA = window.STORY_DATA;
  const STEPS = window.STORY_STEPS;

  // State
  let currentStepId = STEPS[0].id;
  let currentStepIndex = 0;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let showRegionalCompare = false; // toggle on chart-iran-water
  let bcWildfireMetric = "fires"; // "fires" | "hectares" toggle on chart-bc-wildfires

  // DOM references
  const stepsTrack = document.getElementById("steps-track");
  const stepDots = document.getElementById("step-dots");
  const progressBar = document.getElementById("progress-bar");
  const hudStepLabel = document.getElementById("hud-step-label");
  const layerMap = document.getElementById("layer-map");
  const layerElevation = document.getElementById("layer-elevation");
  const layerChart = document.getElementById("layer-chart");
  const photoSpotlight = document.getElementById("photo-spotlight");
  const spotlightImg = document.getElementById("spotlight-img");
  const spotlightTitle = document.getElementById("spotlight-title");
  const spotlightMeta = document.getElementById("spotlight-meta");
  const videoSpotlight = document.getElementById("video-spotlight");
  const videoFrame = document.getElementById("video-frame");
  const videoTitle = document.getElementById("video-title");
  const videoMeta = document.getElementById("video-meta");
  const videoControls = document.getElementById("video-controls");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxDesc = document.getElementById("lightbox-desc");
  const lightboxSource = document.getElementById("lightbox-source");

  let activeSpotlightKey = null;
  let activeSpotlightAnchor = null; // { lon, lat, color } when anchored to a map pin
  let activeVideoEl = null;

  // =========================================================================
  // 1. BUILD SCROLL STEPS (Borderless story text only, accent highlights)
  // =========================================================================
  function buildNarrative() {
    stepsTrack.innerHTML = "";
    stepDots.innerHTML = "";

    STEPS.forEach((step, i) => {
      const el = document.createElement("section");
      el.className = "step" + (step.tone ? ` tone-${step.tone}` : "");
      el.dataset.step = step.id;
      el.dataset.index = i;

      const card = document.createElement("div");
      card.className = "step-card";

      (step.bodyHtml || []).forEach((html) => {
        const p = document.createElement("p");
        p.className = "step-body";
        p.innerHTML = html;
        card.appendChild(p);
      });

      // Interactive country toggle on Iran freshwater chart
      if (step.id === "chart-iran-water") {
        const ctrl = document.createElement("div");
        ctrl.className = "inline-controls";
        const btnIran = document.createElement("button");
        btnIran.className = "chip-btn is-active";
        btnIran.textContent = "Iran only";
        const btnAll = document.createElement("button");
        btnAll.className = "chip-btn";
        btnAll.textContent = "Compare Iran, Iraq & Syria";
        btnIran.addEventListener("click", () => {
          showRegionalCompare = false;
          btnIran.classList.add("is-active");
          btnAll.classList.remove("is-active");
          renderChart("chart-iran-water", true);
        });
        btnAll.addEventListener("click", () => {
          showRegionalCompare = true;
          btnAll.classList.add("is-active");
          btnIran.classList.remove("is-active");
          renderChart("chart-iran-water", true);
        });
        ctrl.appendChild(btnIran);
        ctrl.appendChild(btnAll);
        card.appendChild(ctrl);
      }

      // Interactive metric toggle + year-by-year replay on BC Wildfires icon grid
      if (step.id === "chart-bc-wildfires") {
        const ctrl = document.createElement("div");
        ctrl.className = "inline-controls";
        const btnFires = document.createElement("button");
        btnFires.className = "chip-btn is-active";
        btnFires.textContent = "Number of wildfires";
        const btnHa = document.createElement("button");
        btnHa.className = "chip-btn";
        btnHa.textContent = "Hectares burned";
        const btnReplay = document.createElement("button");
        btnReplay.className = "chip-btn";
        btnReplay.textContent = "Replay 2014 → 2024";
        btnFires.addEventListener("click", () => {
          bcWildfireMetric = "fires";
          btnFires.classList.add("is-active");
          btnHa.classList.remove("is-active");
          renderChart("chart-bc-wildfires", true);
        });
        btnHa.addEventListener("click", () => {
          bcWildfireMetric = "hectares";
          btnHa.classList.add("is-active");
          btnFires.classList.remove("is-active");
          renderChart("chart-bc-wildfires", true);
        });
        btnReplay.addEventListener("click", () => {
          renderChart("chart-bc-wildfires", true);
        });
        ctrl.appendChild(btnFires);
        ctrl.appendChild(btnHa);
        ctrl.appendChild(btnReplay);
        card.appendChild(ctrl);
      }

      if (step.note) {
        const note = document.createElement("p");
        note.className = "step-note";
        note.textContent = step.note;
        card.appendChild(note);
      }

      if (step.sources && step.sources.length) {
        const srcWrap = document.createElement("div");
        srcWrap.className = "step-sources";
        const label = document.createElement("strong");
        label.textContent = "Source: ";
        srcWrap.appendChild(label);
        step.sources.forEach((s, idx) => {
          if (idx > 0) srcWrap.appendChild(document.createTextNode(" · "));
          const a = document.createElement("a");
          a.href = s.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = s.label;
          srcWrap.appendChild(a);
        });
        card.appendChild(srcWrap);
      }

      if (step.showScrollCue) {
        const cue = document.createElement("div");
        cue.className = "scroll-cue";
        cue.innerHTML = `<span class="dot"></span><span>Scroll to continue</span>`;
        card.appendChild(cue);
      }

      el.appendChild(card);
      stepsTrack.appendChild(el);

      // Right-hand dot nav
      const dot = document.createElement("button");
      dot.className = "step-dot";
      dot.title = `Step ${i + 1}`;
      dot.setAttribute("aria-label", `Jump to step ${i + 1}`);
      dot.addEventListener("click", () => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      stepDots.appendChild(dot);
    });
  }

  // =========================================================================
  // 2. GEOGRAPHIC MAP ENGINE (Global Mercator [0, 20], smooth zoom-pan)
  // =========================================================================
  const mapSvg = d3.select("#map-svg");
  let mapProj;
  let mapPath;
  let worldSpace;
  let screenSpace;
  let karunPathNode = null;
  let karunTotalLen = 0;

  let currentCamView = null;
  let activeZoomTimer = null;

  function stageFocusCenter() {
    if (width <= 900) {
      return [width * 0.5, height * 0.36];
    }
    if (currentStepId === "closing-world") {
      return [width * 0.56, height * 0.52];
    }
    return [width * 0.62, height * 0.5];
  }

  function baseToScreen(bx, by, view) {
    const [fx, fy] = stageFocusCenter();
    const k = Math.min(width, height) / view[2];
    return [fx + (bx - view[0]) * k, fy + (by - view[1]) * k, k];
  }

  function lonLatToScreen(lon, lat, view) {
    const [bx, by] = mapProj([lon, lat]);
    return baseToScreen(bx, by, view);
  }

  function cameraForLonLat(lon, lat, spanDegLon) {
    const [cx, cy] = mapProj([lon, lat]);
    const [x1] = mapProj([Math.max(-179, lon - spanDegLon / 2), lat]);
    const [x2] = mapProj([Math.min(179, lon + spanDegLon / 2), lat]);
    return [cx, cy, Math.max(0.01, Math.abs(x2 - x1))];
  }

  function cameraForBroadWorld() {
    const [cx, cy] = mapProj([10, 18]);
    // Span full globe width nicely inside viewport
    const [leftX] = mapProj([-155, 0]);
    const [rightX] = mapProj([165, 0]);
    const worldSpan = Math.abs(rightX - leftX);
    const aspect = width / Math.max(1, height);
    const viewDim = aspect >= 1 ? worldSpan / (aspect * 0.92) : worldSpan;
    return [cx, cy, viewDim];
  }

  function initMap() {
    mapSvg.selectAll("*").remove();
    mapSvg.attr("viewBox", `0 0 ${width} ${height}`);

    // Centered at [0, 20] so the antimeridian cut stays cleanly in mid-Pacific (±180°)
    mapProj = d3.geoMercator().center([0, 20]).scale(1000).translate([0, 0]);
    mapPath = d3.geoPath(mapProj);

    const defs = mapSvg.append("defs");

    const arrow = defs
      .append("marker")
      .attr("id", "transfer-arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 7)
      .attr("refY", 5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto");
    arrow.append("path").attr("d", "M 0 1 L 8 5 L 0 9 z").attr("fill", "var(--transfer)");

    const arrowDesal = defs
      .append("marker")
      .attr("id", "desal-arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 7)
      .attr("refY", 5)
      .attr("markerWidth", 7.5)
      .attr("markerHeight", 7.5)
      .attr("orient", "auto");
    arrowDesal.append("path").attr("d", "M 0 1 L 8 5 L 0 9 z").attr("fill", "var(--river)");

    mapSvg
      .append("rect")
      .attr("class", "map-ocean-bg")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "var(--bg)");

    worldSpace = mapSvg.append("g").attr("id", "map-world-space");
    screenSpace = mapSvg.append("g").attr("id", "map-screen-space");

    // 2a. Countries layer (Natural Earth 50m, excluding Antarctica for clean framing)
    const countries = topojson
      .feature(DATA.worldTopo, DATA.worldTopo.objects.countries)
      .features.filter((d) => String(d.id) !== "010");

    const gCountries = worldSpace.append("g").attr("class", "g-countries");
    gCountries
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("class", (d) => {
        if (String(d.id) === "364") return "map-country is-iran";
        if (String(d.id) === "760") return "map-country is-syria";
        if (String(d.id) === "124") return "map-country is-canada";
        return "map-country";
      })
      .attr("d", mapPath);

    // 2b. Regional rivers layer
    const gRegRivers = worldSpace.append("g").attr("class", "g-regional-rivers");
    const lineGen = d3
      .line()
      .x((d) => mapProj(d)[0])
      .y((d) => mapProj(d)[1])
      .curve(d3.curveCatmullRom.alpha(0.5));

    Object.entries(DATA.regionalRivers).forEach(([key, coords]) => {
      gRegRivers
        .append("path")
        .attr("class", `reg-river reg-river-${key}`)
        .attr("d", lineGen(coords))
        .attr("fill", "none")
        .attr("stroke", "var(--river)")
        .attr("stroke-width", key === "karun_basin" ? 4.2 : 3.6)
        .attr("stroke-linecap", "round")
        .attr("vector-effect", "non-scaling-stroke")
        .attr("opacity", 0);
    });

    // 2c. Water transfer pipelines layer
    const gTransfers = worldSpace.append("g").attr("class", "g-transfers").attr("opacity", 0);
    DATA.waterTransfers.forEach((tr) => {
      gTransfers
        .append("path")
        .attr("class", tr.desal ? "transfer-path is-desal" : "transfer-path")
        .attr("d", lineGen(tr.coords))
        .attr("fill", "none")
        .attr("stroke", tr.desal ? "var(--river)" : "var(--transfer)")
        .attr("stroke-width", tr.desal ? 3.2 : 3.8)
        .attr("stroke-dasharray", tr.desal ? "5 6" : "9 6")
        .attr("vector-effect", "non-scaling-stroke")
        .attr("marker-end", tr.desal ? "url(#desal-arrow)" : "url(#transfer-arrow)");
    });

    // 2d. Ahvaz street grid layer (2,431 real OSM roads)
    const gAhvaz = worldSpace.append("g").attr("class", "g-ahvaz");
    const gRoads = gAhvaz.append("g").attr("class", "g-ahvaz-roads");

    [3, 2, 1].forEach((tier) => {
      let dStr = "";
      DATA.ahvaz.roads.forEach((r) => {
        if (r.t !== tier) return;
        for (let i = 0; i < r.c.length; i++) {
          const [x, y] = mapProj(r.c[i]);
          dStr += (i === 0 ? "M" : "L") + x.toFixed(3) + "," + y.toFixed(3);
        }
      });
      gRoads
        .append("path")
        .attr("class", `ahvaz-road tier-${tier}`)
        .attr("d", dStr)
        .attr("stroke-width", tier === 1 ? 1.9 : tier === 2 ? 1.25 : 0.85);
    });

    // 2e. Persian "اهواز" watermark layered BETWEEN street grid and Karun River
    const [ax, ay] = mapProj([48.682, 31.318]);
    gAhvaz
      .append("text")
      .attr("class", "ahvaz-watermark")
      .attr("x", ax)
      .attr("y", ay)
      .attr("font-size", 0.96)
      .text("اهواز");

    // 2f. Karun River through Ahvaz (780-point OSM centerline, layered ON TOP of "اهواز")
    const karunLineGen = d3
      .line()
      .x((d) => mapProj(d)[0])
      .y((d) => mapProj(d)[1])
      .curve(d3.curveBasis);

    const karunD = karunLineGen(DATA.ahvaz.karunMain);
    const gKarun = gAhvaz.append("g").attr("class", "g-ahvaz-karun");

    gKarun
      .append("path")
      .attr("class", "karun-bank-dry")
      .attr("d", karunD)
      .attr("stroke-width", 0.115);

    const karunPath = gKarun
      .append("path")
      .attr("class", "karun-ribbon")
      .attr("d", karunD)
      .attr("stroke-width", 0.11)
      .attr("opacity", 0);

    karunPathNode = karunPath.node();
    karunTotalLen = karunPathNode.getTotalLength();
    karunPath
      .attr("stroke-dasharray", `${karunTotalLen} ${karunTotalLen}`)
      .attr("stroke-dashoffset", karunTotalLen);

    // Night veil overlay (Step: one-night)
    gAhvaz
      .append("rect")
      .attr("class", "night-veil")
      .attr("x", ax - 6)
      .attr("y", ay - 6)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", "#080b0e")
      .attr("opacity", 0)
      .style("pointer-events", "none");

    // Screen-space layers
    screenSpace.append("g").attr("class", "ss-pollution");
    screenSpace.append("g").attr("class", "ss-boat");
    screenSpace.append("g").attr("class", "ss-iran-cities");
    screenSpace.append("g").attr("class", "ss-global-focus");
    screenSpace.append("g").attr("class", "ss-industry");
    screenSpace.append("g").attr("class", "ss-world-closing");
    screenSpace.append("g").attr("class", "ss-annotations");
    screenSpace.append("g").attr("class", "ss-leader");
    screenSpace.append("g").attr("class", "ss-syria-card");

    currentCamView = cameraForLonLat(48.685, 31.32, 0.175);
    applyCamera(currentCamView);
  }

  function applyCamera(view) {
    currentCamView = view;
    const [fx, fy] = stageFocusCenter();
    const k = Math.min(width, height) / view[2];
    const tx = fx - view[0] * k;
    const ty = fy - view[1] * k;
    worldSpace.attr("transform", `translate(${tx},${ty}) scale(${k})`);

    const ahvazVis = Math.max(0, Math.min(1, (k - 45) / 140));
    worldSpace.select(".g-ahvaz").attr("opacity", ahvazVis);

    const macroVis = Math.max(0, Math.min(1, 1 - (k - 18) / 80));
    worldSpace.select(".g-countries").attr("opacity", macroVis);
    mapSvg
      .select(".map-ocean-bg")
      .attr("fill", macroVis > 0.4 ? "var(--water-sea)" : "var(--bg)");

    updateScreenSpacePositions(view);
    positionAnchoredSpotlight(view);
  }

  function flyTo(targetView, duration = 1250) {
    if (activeZoomTimer) activeZoomTimer.stop();
    const startView = currentCamView || targetView;
    const interp = d3.interpolateZoom(startView, targetView);
    const dur = Math.max(450, Math.min(duration, interp.duration * 0.95));

    activeZoomTimer = d3.timer((elapsed) => {
      const t = Math.min(1, elapsed / dur);
      const eased = d3.easeCubicInOut(t);
      applyCamera(interp(eased));
      if (t >= 1) {
        activeZoomTimer.stop();
        activeZoomTimer = null;
      }
    });
  }

  // =========================================================================
  // 3. BOAT, NET, FISH & POLLUTION ANIMATION ON THE KARUN
  // =========================================================================
  let boatMode = "hidden";
  let boatProgress = 0.44;
  let lastFrameTime = performance.now();

  const BOAT_MIN_FRAC = 0.39;
  const BOAT_MAX_FRAC = 0.51;
  const STUCK_FRAC = 0.448;
  const POLLUTION_FRACS = [0.402, 0.422, 0.436, 0.448, 0.468, 0.492];

  function getPointAndAngleOnKarun(frac, view) {
    if (!karunPathNode || !karunTotalLen) return null;
    const len = frac * karunTotalLen;
    const p = karunPathNode.getPointAtLength(len);
    const p2 = karunPathNode.getPointAtLength(Math.min(karunTotalLen, len + 0.015));
    const [sx, sy] = baseToScreen(p.x, p.y, view);
    const [sx2, sy2] = baseToScreen(p2.x, p2.y, view);
    const angle = (Math.atan2(sy2 - sy, sx2 - sx) * 180) / Math.PI;
    return { x: sx, y: sy, angle };
  }

  function setBoatMode(nextMode) {
    const prev = boatMode;
    boatMode = nextMode;
    if (nextMode === "hidden") {
      screenSpace.select(".ss-boat").selectAll("*").remove();
      screenSpace.select(".ss-pollution").selectAll("*").remove();
      return;
    }
    if (prev === "hidden" && (nextMode === "gliding" || nextMode === "fishing")) {
      boatProgress = BOAT_MIN_FRAC;
    }
    if (currentCamView) {
      renderBoatFrame(performance.now(), currentCamView);
    }
  }

  function animateBoatLoop(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (boatMode === "hidden") {
      if (!screenSpace.select(".ss-boat").selectAll("*").empty()) {
        screenSpace.select(".ss-boat").selectAll("*").remove();
        screenSpace.select(".ss-pollution").selectAll("*").remove();
      }
    } else if (currentCamView && !layerMap.classList.contains("is-hidden")) {
      if (boatMode === "gliding" || boatMode === "fishing") {
        boatProgress += dt * 0.024;
        if (boatProgress > BOAT_MAX_FRAC) boatProgress = BOAT_MIN_FRAC;
      } else if (boatMode === "uncle") {
        boatProgress += dt * 0.013;
        if (boatProgress > BOAT_MAX_FRAC) boatProgress = BOAT_MIN_FRAC;
      } else if (boatMode === "stuck" || boatMode === "low-water" || boatMode === "closing") {
        boatProgress += (STUCK_FRAC - boatProgress) * Math.min(1, dt * 3.5);
      }
      renderBoatFrame(now, currentCamView);
    }

    requestAnimationFrame(animateBoatLoop);
  }

  function renderBoatFrame(now, view) {
    const gBoat = screenSpace.select(".ss-boat");
    const gPol = screenSpace.select(".ss-pollution");

    if (boatMode === "hidden") {
      gBoat.selectAll("*").remove();
      gPol.selectAll("*").remove();
      return;
    }

    const pos = getPointAndAngleOnKarun(boatProgress, view);
    if (!pos) return;
    const tSec = now / 1000;

    if (boatMode === "low-water" || boatMode === "closing") {
      const pts = POLLUTION_FRACS.map((f, idx) => {
        const pt = getPointAndAngleOnKarun(f, view);
        return { ...pt, idx, isSnag: Math.abs(f - STUCK_FRAC) < 0.005 };
      });
      const sel = gPol.selectAll("g.pol-spot").data(pts, (d) => d.idx);
      const enter = sel.enter().append("g").attr("class", "pol-spot");
      enter.append("circle").attr("r", (d) => (d.isSnag ? 24 : 16)).attr("fill", "var(--alert)").attr("opacity", 0.3);
      enter.append("circle").attr("r", (d) => (d.isSnag ? 6.5 : 4.5)).attr("fill", "var(--alert)").attr("stroke", "var(--bg)").attr("stroke-width", 1.8);
      sel.merge(enter).attr("transform", (d) => `translate(${d.x},${d.y})`);
      sel.exit().remove();
    } else {
      gPol.selectAll("*").remove();
    }

    let grp = gBoat.select("g.boat-actor");
    if (grp.empty()) {
      grp = gBoat.append("g").attr("class", "boat-actor");
      grp.append("circle").attr("class", "boat-glow").attr("r", 32).attr("fill", "var(--boat)").attr("opacity", 0.16);
      grp.append("circle").attr("class", "boat-halo").attr("r", 36).attr("fill", "none");
      grp.append("path").attr("class", "boat-wake").attr("fill", "none").attr("stroke-linecap", "round");

      const netG = grp.append("g").attr("class", "boat-net");
      netG.append("path").attr("class", "net-arc");
      netG.append("path").attr("class", "net-mesh").attr("fill", "none").attr("stroke-linecap", "round");
      netG.append("g").attr("class", "net-sinkers");

      [
        { x: 40, y: -26, r: -12 },
        { x: 56, y: -12, r: 8 },
        { x: 48, y: 14, r: -18 },
        { x: 64, y: 4, r: 15 },
        { x: 38, y: 24, r: 6 }
      ].forEach((f, idx) => {
        netG
          .append("path")
          .attr("class", `fish-glyph fish-${idx}`)
          .attr("d", "M -7,0 Q -1,-4.2 5,0 Q -1,4.2 -7,0 M -7,0 L -11,-3.5 L -11,3.5 Z")
          .attr("transform", `translate(${f.x},${f.y}) rotate(${f.r})`)
          .attr("fill", "var(--ink)")
          .attr("stroke", "var(--bg)")
          .attr("stroke-width", 1);
      });

      grp.append("circle").attr("class", "snag-fill").attr("cx", 48).attr("cy", 18).attr("r", 16).attr("fill", "var(--alert)").attr("opacity", 0);
      grp.append("circle").attr("class", "snag-ring").attr("cx", 48).attr("cy", 18).attr("r", 16).attr("fill", "none");
      grp
        .append("path")
        .attr("class", "snag-x")
        .attr("d", "M41,11 L55,25 M55,11 L41,25")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 3.2)
        .attr("stroke-linecap", "round");

      grp
        .append("path")
        .attr("class", "boat-hull")
        .attr("d", "M -21,-8 L 8,-8 Q 24,0 8,8 L -21,8 Q -24,0 -21,-8 Z")
        .attr("fill", "var(--boat)")
        .attr("stroke", "var(--bg)")
        .attr("stroke-width", 2.4);
      grp
        .append("path")
        .attr("class", "boat-seats")
        .attr("d", "M -13,-6.2 L -13,6.2 M -2,-6.8 L -2,6.8 M 8,-5.5 L 8,5.5")
        .attr("stroke", "var(--bg)")
        .attr("stroke-width", 1.7)
        .attr("opacity", 0.72);
      grp
        .append("circle")
        .attr("class", "boat-person")
        .attr("cx", -6)
        .attr("cy", 0)
        .attr("r", 4.5)
        .attr("fill", "var(--bg)")
        .attr("stroke", "var(--ink)")
        .attr("stroke-width", 1.3);
    }

    grp.attr("transform", `translate(${pos.x},${pos.y}) rotate(${pos.angle})`);

    const isMoving = boatMode === "gliding" || boatMode === "fishing" || boatMode === "uncle";
    const wakePulse = (tSec * 1.6) % 1;
    grp
      .select(".boat-wake")
      .attr(
        "d",
        `M -25,-4 Q -39,-${8 + wakePulse * 9} -50,-${12 + wakePulse * 11} M -25,4 Q -39,${8 + wakePulse * 9} -50,${12 + wakePulse * 11}`
      )
      .attr("stroke", "var(--ink)")
      .attr("stroke-width", 2.2)
      .attr("opacity", isMoving ? 0.7 * (1 - wakePulse * 0.65) : 0);

    const haloPulse = 0.5 + 0.5 * Math.sin(tSec * 2.8);
    grp
      .select(".boat-glow")
      .attr("fill", boatMode === "stuck" || boatMode === "low-water" ? "var(--alert)" : "var(--boat)")
      .attr("opacity", boatMode === "closing" ? 0.14 : 0.22);

    if (boatMode === "uncle") {
      grp.select(".boat-halo").attr("r", 34 + haloPulse * 12).attr("stroke", "var(--boat)").attr("stroke-width", 2.5).attr("opacity", 0.85 - haloPulse * 0.35);
    } else if (boatMode === "stuck") {
      grp.select(".boat-halo").attr("r", 34 + haloPulse * 16).attr("stroke", "var(--alert)").attr("stroke-width", 2.8).attr("opacity", 0.9 - haloPulse * 0.45);
    } else {
      grp.select(".boat-halo").attr("opacity", 0);
    }

    const showNet = boatMode === "fishing" || boatMode === "uncle" || boatMode === "stuck";
    const netG = grp.select(".boat-net");
    netG.attr("opacity", showNet ? 1 : 0);
    if (showNet) {
      const castPhase = boatMode === "stuck" ? 1 : 0.5 + 0.5 * Math.sin(tSec * 1.7) ** 2;
      const r = 34 + castPhase * 42;
      const ox = 11;
      const netColor = boatMode === "stuck" ? "var(--alert)" : "var(--boat)";
      const xTop = ox + r * 0.84;
      const yTop = -r * 0.58;
      const yBot = r * 0.58;

      netG.select(".net-arc").attr("d", `M ${ox},0 L ${xTop},${yTop} A ${r},${r} 0 0,1 ${xTop},${yBot} Z`).attr("fill", netColor).attr("fill-opacity", boatMode === "stuck" ? 0.28 : 0.22);

      const angles = [-0.6, -0.3, 0, 0.3, 0.6];
      let meshD = angles.map((a) => `M ${ox},0 L ${ox + r * Math.cos(a)},${r * Math.sin(a)}`).join(" ");
      [0.42, 0.72, 1.0].forEach((s) => {
        const rs = r * s;
        const ax = ox + rs * Math.cos(0.6);
        const ay = rs * Math.sin(0.6);
        meshD += ` M ${ax},${-ay} A ${rs},${rs} 0 0,1 ${ax},${ay}`;
      });
      netG
        .select(".net-mesh")
        .attr("d", meshD)
        .attr("stroke", boatMode === "stuck" ? "var(--alert)" : "#fff6d1")
        .attr("stroke-width", boatMode === "stuck" ? 2.4 : 2.0)
        .attr("stroke-dasharray", boatMode === "stuck" ? "none" : "4 3");

      const sinkers = [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((a, idx) => ({
        idx,
        x: ox + r * Math.cos(a),
        y: r * Math.sin(a)
      }));
      const sSel = netG.select(".net-sinkers").selectAll("circle").data(sinkers, (d) => d.idx);
      sSel.enter().append("circle").merge(sSel).attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 2.8).attr("fill", netColor).attr("stroke", "var(--bg)").attr("stroke-width", 1);

      netG.selectAll(".fish-glyph").attr("opacity", boatMode === "stuck" ? 0 : 0.92 * castPhase);
    }

    const isStuck = boatMode === "stuck";
    grp.select(".snag-fill").attr("opacity", isStuck ? 0.34 : 0);
    grp.select(".snag-ring").attr("r", 14 + haloPulse * 14).attr("stroke", "var(--alert)").attr("stroke-width", 2.8).attr("opacity", isStuck ? 0.95 - haloPulse * 0.45 : 0);
    grp.select(".snag-x").attr("opacity", isStuck ? 1 : 0);

    let boatLab = gBoat.select("text.boat-direct-label");
    if (boatLab.empty()) {
      boatLab = gBoat.append("text").attr("class", "map-label boat-direct-label");
    }
    const labelMap = {
      gliding: "Fishing boat on the Karun",
      fishing: "Casting net across the river",
      uncle: "My uncle's boat",
      stuck: "Net caught on sunken debris",
      "low-water": "Lower water · exposed banks & waste",
      closing: "Ahvaz · Karun River"
    };
    boatLab
      .attr("x", pos.x + 34)
      .attr("y", pos.y - 30)
      .attr("font-size", 17)
      .attr("fill", boatMode === "stuck" || boatMode === "low-water" ? "var(--alert)" : "var(--boat)")
      .text(labelMap[boatMode] || "");
  }

  // =========================================================================
  // 4. SCREEN-SPACE MAP OVERLAYS & ADJACENT PHOTO POSITIONING
  // =========================================================================
  let mapOverlayState = {
    ahvazPin: false,
    karunLabel: false,
    nightPhotoPin: false,
    iranDroughts: false,
    focusCity: null,
    globalFocus: null, // { lon, lat, name, sub, color, syriaExtras }
    policies: false,
    industry: false,
    worldClosing: false
  };

  function positionAnchoredSpotlight(view) {
    const gLeader = screenSpace.select(".ss-leader");
    gLeader.selectAll("*").remove();

    if (!activeSpotlightAnchor || !photoSpotlight.classList.contains("is-visible") || width <= 900) {
      return;
    }

    const { lon, lat, color } = activeSpotlightAnchor;
    const [px, py] = lonLatToScreen(lon, lat, view);
    const cardW = Math.min(390, width * 0.34);
    const cardH = photoSpotlight.offsetHeight || 320;
    const minLeft = Math.max(515, width * 0.41);

    // Place card adjacent to pin: right of pin if room, otherwise left of pin (still clear of narrative column)
    let left = px + 44;
    let attachEdgeX = left;
    if (left + cardW > width - 32) {
      left = Math.max(minLeft, px - cardW - 44);
      attachEdgeX = left + cardW;
    }
    if (left < minLeft) {
      left = Math.min(width - cardW - 32, Math.max(minLeft, px + 36));
      attachEdgeX = left;
    }
    const top = Math.max(66, Math.min(height - cardH - 28, py - cardH * 0.48));
    const attachEdgeY = Math.max(top + 28, Math.min(top + cardH - 28, py));

    photoSpotlight.classList.add("is-anchored");
    photoSpotlight.style.left = `${Math.round(left)}px`;
    photoSpotlight.style.top = `${Math.round(top)}px`;

    // Crisp dashed leader line from pin to card edge
    if (px > 0 && px < width && py > 0 && py < height) {
      gLeader
        .append("line")
        .attr("x1", px)
        .attr("y1", py)
        .attr("x2", attachEdgeX)
        .attr("y2", attachEdgeY)
        .attr("stroke", color || "var(--alert)")
        .attr("stroke-width", 2.2)
        .attr("stroke-dasharray", "6 5")
        .attr("opacity", 0.85);
      gLeader
        .append("circle")
        .attr("cx", attachEdgeX)
        .attr("cy", attachEdgeY)
        .attr("r", 4)
        .attr("fill", color || "var(--alert)");
    }
  }

  function updateScreenSpacePositions(view) {
    // 4a. Ahvaz pin + Karun label + Night photo pin
    const gAnno = screenSpace.select(".ss-annotations");
    gAnno.selectAll("*").remove();

    if (mapOverlayState.ahvazPin) {
      const [x, y] = lonLatToScreen(48.6706, 31.3183, view);
      gAnno.append("circle").attr("cx", x).attr("cy", y).attr("r", 24).attr("fill", "var(--river)").attr("opacity", 0.28);
      gAnno.append("circle").attr("cx", x).attr("cy", y).attr("r", 8.5).attr("fill", "var(--river)").attr("stroke", "var(--bg)").attr("stroke-width", 2.6);
      gAnno.append("text").attr("class", "map-label").attr("x", x + 16).attr("y", y - 4).attr("font-size", 19).text("Ahvaz");
      gAnno.append("text").attr("class", "map-sublabel").attr("x", x + 16).attr("y", y + 16).text("Khuzestan, SW Iran");

      const [ix, iy] = lonLatToScreen(54.2, 33.4, view);
      gAnno.append("text").attr("class", "map-label").attr("x", ix).attr("y", iy).attr("font-size", 20).attr("opacity", 0.72).attr("letter-spacing", "0.26em").text("IRAN");
      const [gx, gy] = lonLatToScreen(51.4, 26.8, view);
      gAnno.append("text").attr("class", "map-sublabel").attr("x", gx).attr("y", gy).attr("font-size", 14.5).attr("font-style", "italic").text("Persian Gulf");
    }

    if (mapOverlayState.karunLabel) {
      const pt = getPointAndAngleOnKarun(0.41, view);
      if (pt) {
        gAnno.append("text").attr("class", "map-label").attr("x", pt.x + 28).attr("y", pt.y - 12).attr("font-size", 19).attr("fill", "var(--river)").text("Karun River");
      }
    }

    if (mapOverlayState.nightPhotoPin && DATA.ahvaz.nightPhotoLocation) {
      const loc = DATA.ahvaz.nightPhotoLocation;
      const [px, py] = lonLatToScreen(loc.lon, loc.lat, view);
      gAnno.append("circle").attr("cx", px).attr("cy", py).attr("r", 28).attr("fill", "var(--boat)").attr("opacity", 0.25);
      gAnno.append("circle").attr("cx", px).attr("cy", py).attr("r", 15).attr("fill", "none").attr("stroke", "var(--boat)").attr("stroke-width", 2.2);
      gAnno.append("circle").attr("cx", px).attr("cy", py).attr("r", 7.5).attr("fill", "var(--boat)").attr("stroke", "var(--bg)").attr("stroke-width", 2.4);
      gAnno.append("text").attr("class", "map-label").attr("x", px - 18).attr("y", py - 10).attr("text-anchor", "end").attr("font-size", 18).attr("fill", "var(--boat)").text(loc.name);
      gAnno.append("text").attr("class", "map-sublabel").attr("x", px - 18).attr("y", py + 11).attr("text-anchor", "end").text(loc.subtitle);
    }

    // 4b. Iran drought cities
    const gCities = screenSpace.select(".ss-iran-cities");
    gCities.selectAll("*").remove();
    if (mapOverlayState.iranDroughts) {
      const offsets = {
        ahvaz: [-16, 22, "end"],
        isfahan: [-16, -12, "end"],
        kashmar: [-16, -10, "end"],
        urmia: [-16, 6, "end"],
        mashhad: [16, -12, "start"],
        yazd: [16, 6, "start"],
        kerman: [16, 8, "start"],
        shiraz: [16, 10, "start"],
        sistan: [-14, 22, "end"]
      };

      DATA.iranDroughtCities.forEach((c) => {
        const [x, y] = lonLatToScreen(c.lon, c.lat, view);
        const isFocus =
          (mapOverlayState.focusCity === "zayandeh" && c.id === "isfahan") ||
          (mapOverlayState.focusCity === "kashmar" && c.id === "kashmar") ||
          (mapOverlayState.focusCity === "urmia" && c.id === "urmia");
        const dimmed = mapOverlayState.focusCity && !isFocus && c.id !== "ahvaz";

        const g = gCities.append("g").attr("opacity", dimmed ? 0.35 : 1);
        const pinColor = c.id === "ahvaz" && !mapOverlayState.focusCity ? "var(--river)" : "var(--alert)";
        g.append("circle").attr("cx", x).attr("cy", y).attr("r", isFocus ? 26 : 15).attr("fill", pinColor).attr("opacity", isFocus ? 0.34 : 0.2);
        g.append("circle").attr("cx", x).attr("cy", y).attr("r", isFocus ? 9 : 6).attr("fill", pinColor).attr("stroke", "var(--bg)").attr("stroke-width", 2.3);

        const [dx, dy, anchor] = offsets[c.id] || [14, 5, "start"];
        g.append("text").attr("class", "map-label").attr("x", x + dx).attr("y", y + dy).attr("text-anchor", anchor).attr("font-size", isFocus ? 19 : 15).text(c.name);

        if (isFocus || (!mapOverlayState.focusCity && (c.id === "ahvaz" || c.id === "isfahan" || c.id === "urmia" || c.id === "kashmar"))) {
          g.append("text").attr("class", "map-sublabel").attr("x", x + dx).attr("y", y + dy + 18).attr("text-anchor", anchor).text(c.note);
        }
      });

      if (mapOverlayState.focusCity === "zayandeh") {
        const [zx, zy] = lonLatToScreen(52.2, 32.35, view);
        gCities.append("text").attr("class", "map-label").attr("x", zx).attr("y", zy + 24).attr("font-size", 16.5).attr("fill", "var(--river-dry)").text("Zayandeh Rud (dry)");
      }
    }

    // 4c. Single global location focus (Syria, Aral, Chad, Po, Mead, BC)
    const gGlobal = screenSpace.select(".ss-global-focus");
    gGlobal.selectAll("*").remove();
    const gSyriaCard = screenSpace.select(".ss-syria-card");
    gSyriaCard.selectAll("*").remove();

    if (mapOverlayState.globalFocus) {
      const f = mapOverlayState.globalFocus;
      const [fx, fy] = lonLatToScreen(f.lon, f.lat, view);
      const col = f.color || "var(--alert)";
      gGlobal.append("circle").attr("cx", fx).attr("cy", fy).attr("r", 28).attr("fill", col).attr("opacity", 0.28);
      gGlobal.append("circle").attr("cx", fx).attr("cy", fy).attr("r", 15).attr("fill", "none").attr("stroke", col).attr("stroke-width", 2);
      gGlobal.append("circle").attr("cx", fx).attr("cy", fy).attr("r", 8.5).attr("fill", col).attr("stroke", "var(--bg)").attr("stroke-width", 2.5);
      gGlobal.append("text").attr("class", "map-label").attr("x", fx - 18).attr("y", fy - 12).attr("text-anchor", "end").attr("font-size", 19).attr("fill", col).text(f.name);
      gGlobal.append("text").attr("class", "map-sublabel").attr("x", fx - 18).attr("y", fy + 9).attr("text-anchor", "end").text(f.sub);

      if (f.syriaExtras) {
        const [tx, ty] = lonLatToScreen(38.5, 38.0, view);
        gGlobal.append("text").attr("class", "map-sublabel").attr("x", tx - 14).attr("y", ty - 6).attr("text-anchor", "end").text("Upstream dams (Turkey)");
        const [ax, ay] = lonLatToScreen(48.67, 31.32, view);
        gGlobal.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 6.5).attr("fill", "var(--river)").attr("stroke", "var(--bg)").attr("stroke-width", 2);
        gGlobal.append("text").attr("class", "map-label").attr("x", ax + 12).attr("y", ay + 5).attr("font-size", 15.5).text("Ahvaz");

        // Compact World Bank regional freshwater summary box at bottom-right
        if (width > 900) {
          const cw = 305;
          const ch = 160;
          const cx = width - cw - 36;
          const cy = height - ch - 24;
          const cg = gSyriaCard.append("g").attr("transform", `translate(${cx},${cy})`);
          cg.append("rect").attr("width", cw).attr("height", ch).attr("rx", 10).attr("fill", "var(--surface)");
          cg.append("text").attr("x", 16).attr("y", 25).attr("fill", "var(--ink)").attr("font-size", 13.5).attr("font-weight", 700).text("Renewable freshwater / person (2022)");

          const items = [
            { label: "Iran", val: 1435, max: 1700, col: "var(--river)" },
            { label: "Iraq", val: 799, max: 1700, col: "var(--context)" },
            { label: "Syria", val: 318, max: 1700, col: "var(--alert)" }
          ];
          const barW = 160;
          items.forEach((it, idx) => {
            const yy = 46 + idx * 31;
            cg.append("text").attr("x", 16).attr("y", yy + 11).attr("fill", "var(--ink)").attr("font-size", 13.5).attr("font-weight", 600).text(it.label);
            cg.append("rect").attr("x", 68).attr("y", yy).attr("width", barW).attr("height", 14).attr("rx", 3).attr("fill", "var(--grid)");
            cg.append("rect").attr("x", 68).attr("y", yy).attr("width", (it.val / it.max) * barW).attr("height", 14).attr("rx", 3).attr("fill", it.col);
            cg.append("text").attr("x", 68 + (it.val / it.max) * barW + 8).attr("y", yy + 11.5).attr("fill", it.col).attr("font-size", 13).attr("font-weight", 700).text(`${it.val.toLocaleString()} m³`);
          });
          cg.append("text").attr("x", 16).attr("y", ch - 12).attr("fill", "var(--ink-muted)").attr("font-size", 11.5).text("Below 1,700 m³ stress line · World Bank / FAO");
        }
      }
    }

    // 4d. Policies & Industrial sites around water basins
    const gInd = screenSpace.select(".ss-industry");
    gInd.selectAll("*").remove();

    if (mapOverlayState.policies) {
      const [kx, ky] = lonLatToScreen(50.6, 33.2, view);
      gInd.append("text").attr("class", "map-label").attr("x", kx - 12).attr("y", ky - 16).attr("text-anchor", "end").attr("font-size", 16.5).attr("fill", "var(--transfer)").text("Kuhrang transfer tunnels");
      gInd.append("text").attr("class", "map-sublabel").attr("x", kx - 12).attr("y", ky + 2).attr("text-anchor", "end").text("Diverts upper Karun water east →");

      const [dx, dy] = lonLatToScreen(56.1, 28.4, view);
      gInd.append("text").attr("class", "map-label").attr("x", dx - 12).attr("y", dy).attr("text-anchor", "end").attr("font-size", 15.5).attr("fill", "var(--river)").text("Desalination pipeline");
      gInd.append("text").attr("class", "map-sublabel").attr("x", dx - 12).attr("y", dy + 17).attr("text-anchor", "end").text("Gulf of Oman → inland factories");

      const [ax, ay] = lonLatToScreen(48.67, 31.32, view);
      gInd.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 15).attr("fill", "var(--river)").attr("opacity", 0.25);
      gInd.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 7).attr("fill", "var(--river)").attr("stroke", "var(--bg)").attr("stroke-width", 2.2);
      gInd.append("text").attr("class", "map-label").attr("x", ax - 14).attr("y", ay + 5).attr("text-anchor", "end").attr("font-size", 16.5).text("Ahvaz (downstream)");
    }

    if (mapOverlayState.industry) {
      const indOffsets = {
        "Khuzestan Steel": [-16, -2, "end"],
        "Sugarcane Agro-Industry": [-16, -12, "end"],
        "Abadan Refinery": [-16, 18, "end"],
        "Mahshahr Petrochemical": [16, 16, "start"],
        "Mobarakeh Steel": [-16, 20, "end"],
        "Esfahan Steel (Zobahan)": [-16, -12, "end"],
        "Isfahan Refinery & Petrochem": [16, -14, "start"],
        "Yazd / Chadormalu Steel": [16, 5, "start"],
        "Sarcheshmeh & Kerman Steel": [-14, 18, "end"]
      };

      DATA.industrialSites.forEach((s) => {
        const [x, y] = lonLatToScreen(s.lon, s.lat, view);
        const [dx, dy, anchor] = indOffsets[s.name] || [14, 5, "start"];
        gInd
          .append("rect")
          .attr("x", -8)
          .attr("y", -8)
          .attr("width", 16)
          .attr("height", 16)
          .attr("transform", `translate(${x},${y}) rotate(45)`)
          .attr("fill", "var(--industry)")
          .attr("stroke", "var(--bg)")
          .attr("stroke-width", 2.2);
        gInd
          .append("text")
          .attr("class", "map-label")
          .attr("x", x + dx)
          .attr("y", y + dy)
          .attr("text-anchor", anchor)
          .attr("font-size", 14.5)
          .attr("fill", "var(--industry)")
          .text(s.name);
      });
    }

    // 4e. Final slide: broad world map with clearly tagged climate events
    const gClosing = screenSpace.select(".ss-world-closing");
    gClosing.selectAll("*").remove();

    if (mapOverlayState.worldClosing) {
      DATA.worldClosingEvents.forEach((ev) => {
        const [x, y] = lonLatToScreen(ev.lon, ev.lat, view);
        if (x < 20 || x > width - 20 || y < 20 || y > height - 20) return;

        const color =
          ev.type === "home"
            ? "var(--river)"
            : ev.type === "flood" || ev.type === "both"
              ? "var(--transfer)"
              : "var(--alert)";

        const g = gClosing.append("g");
        g.append("circle").attr("cx", x).attr("cy", y).attr("r", ev.type === "home" ? 20 : 15).attr("fill", color).attr("opacity", 0.28);
        g.append("circle").attr("cx", x).attr("cy", y).attr("r", ev.type === "home" ? 7.5 : 6).attr("fill", color).attr("stroke", "var(--bg)").attr("stroke-width", 2);

        g.append("text")
          .attr("class", "map-label")
          .attr("x", x + ev.dx)
          .attr("y", y + ev.dy)
          .attr("text-anchor", ev.anchor)
          .attr("font-size", ev.type === "home" ? 15.5 : 14)
          .attr("fill", color)
          .text(ev.name);
        g.append("text")
          .attr("class", "map-sublabel")
          .attr("x", x + ev.dx)
          .attr("y", y + ev.dy + 15)
          .attr("text-anchor", ev.anchor)
          .attr("font-size", 12)
          .text(ev.tag);
      });
    }
  }

  // =========================================================================
  // 5. ELEVATION / CROSS-SECTION VIEW (Fixed frame: Past vs Now)
  // =========================================================================
  const elevSvg = d3.select("#elevation-svg");
  let elevBuilt = false;

  function elevBox() {
    if (width <= 900) {
      return { x: 24, y: 92, w: width - 48, h: Math.min(340, height * 0.44) };
    }
    const left = Math.max(515, width * 0.4);
    const w = Math.min(750, width - left - 52);
    const h = Math.min(460, height * 0.62);
    return { x: left, y: (height - h) / 2, w, h };
  }

  function renderElevation(mode, animate = true) {
    const b = elevBox();
    elevSvg.attr("viewBox", `0 0 ${width} ${height}`);
    const dur = animate ? 950 : 0;
    const isNow = mode === "elevation-now";

    if (!elevBuilt) {
      elevSvg.selectAll("*").remove();
      const g = elevSvg.append("g").attr("class", "elev-root");
      g.append("text").attr("class", "chart-title elev-title");
      g.append("text").attr("class", "chart-subtitle elev-subtitle");

      const defs = elevSvg.append("defs");
      defs.append("clipPath").attr("id", "channel-clip").append("path").attr("class", "channel-clip-path");

      g.append("rect").attr("class", "elev-water").attr("clip-path", "url(#channel-clip)").attr("fill", "var(--river)").attr("opacity", 0.72);
      g.append("rect").attr("class", "elev-water-deep").attr("clip-path", "url(#channel-clip)").attr("fill", "var(--river-deep)").attr("opacity", 0.38);

      g.append("line").attr("class", "elev-past-line").attr("stroke", "var(--river)").attr("stroke-dasharray", "6 5").attr("stroke-width", 1.8);
      g.append("text").attr("class", "chart-anno-sub elev-past-label").attr("fill", "var(--river)");
      g.append("path").attr("class", "elev-surface-line").attr("fill", "none").attr("stroke", "var(--river)").attr("stroke-width", 2.5);
      g.append("path").attr("class", "elev-ground").attr("fill", "var(--river-bank)").attr("stroke", "var(--river-dry)").attr("stroke-width", 2);
      g.append("g").attr("class", "elev-debris");

      const actor = g.append("g").attr("class", "elev-actor");
      actor.append("path").attr("class", "elev-net-fill").attr("fill", "var(--boat)").attr("opacity", 0.16);
      actor.append("path").attr("class", "elev-net-stroke").attr("fill", "none").attr("stroke", "var(--boat)").attr("stroke-width", 1.8).attr("stroke-dasharray", "4 3");
      actor.append("circle").attr("class", "elev-snag-ring").attr("r", 16).attr("fill", "var(--alert)").attr("opacity", 0);
      actor.append("circle").attr("class", "elev-snag-dot").attr("r", 5).attr("fill", "var(--alert)").attr("opacity", 0);
      actor.append("path").attr("class", "elev-boat-hull").attr("fill", "var(--boat)").attr("stroke", "var(--bg)").attr("stroke-width", 1.6);
      actor.append("circle").attr("class", "elev-fisher-head").attr("r", 5.5).attr("fill", "var(--ink)");
      actor.append("path").attr("class", "elev-fisher-body").attr("stroke", "var(--ink)").attr("stroke-width", 2.5).attr("fill", "none").attr("stroke-linecap", "round");
      g.append("g").attr("class", "elev-annotations");
      elevBuilt = true;
    }

    const g = elevSvg.select(".elev-root");
    const x0 = b.x;
    const y0 = b.y + 56;
    const cw = b.w;
    const ch = b.h - 70;

    const bankTopY = y0 + ch * 0.12;
    const bedY = y0 + ch * 0.86;
    const pastWaterY = y0 + ch * 0.24;
    const nowWaterY = y0 + ch * 0.62;
    const activeWaterY = isNow ? nowWaterY : pastWaterY;

    const cavityD = `M ${x0 + cw * 0.08},${bankTopY}
                     C ${x0 + cw * 0.2},${bankTopY + 18} ${x0 + cw * 0.24},${bedY} ${x0 + cw * 0.34},${bedY}
                     L ${x0 + cw * 0.68},${bedY}
                     C ${x0 + cw * 0.78},${bedY} ${x0 + cw * 0.82},${bankTopY + 18} ${x0 + cw * 0.92},${bankTopY}
                     L ${x0 + cw * 0.92},${y0} L ${x0 + cw * 0.08},${y0} Z`;
    elevSvg.select(".channel-clip-path").attr("d", cavityD);

    const groundD = `M ${x0},${bankTopY}
                     L ${x0 + cw * 0.1},${bankTopY}
                     C ${x0 + cw * 0.2},${bankTopY + 18} ${x0 + cw * 0.24},${bedY} ${x0 + cw * 0.34},${bedY}
                     L ${x0 + cw * 0.68},${bedY}
                     C ${x0 + cw * 0.78},${bedY} ${x0 + cw * 0.82},${bankTopY + 18} ${x0 + cw * 0.9},${bankTopY}
                     L ${x0 + cw},${bankTopY} L ${x0 + cw},${y0 + ch} L ${x0},${y0 + ch} Z`;
    g.select(".elev-ground").attr("d", groundD);

    g.select(".elev-title").attr("x", x0).attr("y", b.y + 18).text(isNow ? "Karun River cross-section: Now" : "Karun River cross-section: In the past");
    g.select(".elev-subtitle").attr("x", x0).attr("y", b.y + 42).text(isNow ? "Lower water exposes mudbanks and brings sunken waste within reach" : "Deep flow kept boats and nets well above the riverbed");

    g.select(".elev-water").transition().duration(dur).ease(d3.easeCubicInOut).attr("x", x0).attr("y", activeWaterY).attr("width", cw).attr("height", Math.max(0, bedY - activeWaterY + 4)).attr("fill", isNow ? "var(--river-deep)" : "var(--river)").attr("opacity", isNow ? 0.62 : 0.72);
    g.select(".elev-water-deep").transition().duration(dur).ease(d3.easeCubicInOut).attr("x", x0).attr("y", activeWaterY + (bedY - activeWaterY) * 0.55).attr("width", cw).attr("height", Math.max(0, (bedY - activeWaterY) * 0.48)).attr("fill", isNow ? "var(--river-dry)" : "var(--river-deep)");

    const surfLeft = isNow ? x0 + cw * 0.255 : x0 + cw * 0.14;
    const surfRight = isNow ? x0 + cw * 0.755 : x0 + cw * 0.86;
    g.select(".elev-surface-line").transition().duration(dur).ease(d3.easeCubicInOut).attr("d", `M ${surfLeft},${activeWaterY} L ${surfRight},${activeWaterY}`).attr("stroke", isNow ? "var(--alert)" : "var(--river)");

    g.select(".elev-past-line").attr("x1", x0 + cw * 0.14).attr("x2", x0 + cw * 0.86).attr("y1", pastWaterY).attr("y2", pastWaterY).transition().duration(dur).attr("opacity", isNow ? 0.75 : 0);
    g.select(".elev-past-label").attr("x", x0 + cw * 0.86 - 4).attr("y", pastWaterY - 8).attr("text-anchor", "end").text("Past water level").transition().duration(dur).attr("opacity", isNow ? 0.95 : 0);

    const debrisG = g.select(".elev-debris");
    debrisG.selectAll("*").remove();
    const snagX = x0 + cw * 0.55;
    const snagY = bedY - 12;
    [
      `M ${x0 + cw * 0.36},${bedY} L ${x0 + cw * 0.39},${bedY - 11} L ${x0 + cw * 0.43},${bedY - 4} L ${x0 + cw * 0.45},${bedY}`,
      `M ${snagX - 18},${bedY} L ${snagX - 6},${bedY - 18} L ${snagX + 8},${bedY - 22} L ${snagX + 16},${bedY - 7} L ${snagX + 24},${bedY}`,
      `M ${x0 + cw * 0.62},${bedY} L ${x0 + cw * 0.65},${bedY - 12} L ${x0 + cw * 0.69},${bedY}`
    ].forEach((dPath) => {
      debrisG.append("path").attr("d", dPath).attr("fill", "var(--alert)").attr("fill-opacity", 0.34).attr("stroke", "var(--alert)").attr("stroke-width", 2.2).attr("stroke-linejoin", "round");
    });
    debrisG.append("path").attr("d", `M ${snagX - 4},${bedY - 16} L ${snagX + 3},${bedY - 30} M ${snagX + 6},${bedY - 18} L ${snagX + 14},${bedY - 28}`).attr("stroke", "var(--alert)").attr("stroke-width", 2.4).attr("stroke-linecap", "round");
    debrisG.transition().duration(dur).attr("opacity", isNow ? 1 : 0.06);

    const boatX = x0 + cw * 0.47;
    const boatY = activeWaterY;
    const actor = g.select(".elev-actor");
    actor.select(".elev-boat-hull").transition().duration(dur).ease(d3.easeCubicInOut).attr("d", `M ${boatX - 42},${boatY - 10} L ${boatX + 42},${boatY - 10} L ${boatX + 30},${boatY + 8} L ${boatX - 30},${boatY + 8} Z`);
    actor.select(".elev-fisher-head").transition().duration(dur).ease(d3.easeCubicInOut).attr("cx", boatX + 10).attr("cy", boatY - 28);
    actor.select(".elev-fisher-body").transition().duration(dur).ease(d3.easeCubicInOut).attr("d", `M ${boatX + 10},${boatY - 22} L ${boatX + 10},${boatY - 10} M ${boatX + 10},${boatY - 17} L ${boatX + 28},${boatY - 11}`);

    const netBottomY = isNow ? snagY - 8 : boatY + (bedY - boatY) * 0.48;
    const netEndX = isNow ? snagX + 4 : boatX + 76;
    const netMidX = (boatX + 28 + netEndX) / 2;
    const netFillD = `M ${boatX + 28},${boatY - 11} Q ${netMidX + 18},${boatY + 12} ${netEndX},${netBottomY} Q ${netMidX - 18},${netBottomY + 10} ${boatX + 18},${boatY + 28} Z`;
    const netStrokeD = `M ${boatX + 28},${boatY - 11} Q ${netMidX + 18},${boatY + 12} ${netEndX},${netBottomY} Q ${netMidX - 18},${netBottomY + 10} ${boatX + 18},${boatY + 28}`;

    actor.select(".elev-net-fill").transition().duration(dur).ease(d3.easeCubicInOut).attr("d", netFillD).attr("fill", isNow ? "var(--alert)" : "var(--boat)");
    actor.select(".elev-net-stroke").transition().duration(dur).ease(d3.easeCubicInOut).attr("d", netStrokeD).attr("stroke", isNow ? "var(--alert)" : "var(--boat)");
    actor.select(".elev-snag-ring").transition().duration(dur).attr("cx", snagX + 4).attr("cy", snagY - 10).attr("opacity", isNow ? 0.34 : 0);
    actor.select(".elev-snag-dot").transition().duration(dur).attr("cx", snagX + 4).attr("cy", snagY - 10).attr("opacity", isNow ? 1 : 0);

    const anno = g.select(".elev-annotations");
    anno.selectAll("*").remove();
    if (!isNow) {
      anno.append("text").attr("class", "chart-anno").attr("x", x0 + cw * 0.16).attr("y", pastWaterY - 10).attr("fill", "var(--river)").text("High water level");
      anno.append("text").attr("class", "chart-anno-sub").attr("x", boatX + 80).attr("y", netBottomY + 4).text("Net drifts clear of riverbed");
      anno.append("text").attr("class", "chart-anno-sub").attr("x", x0 + cw * 0.5).attr("y", bedY + 22).attr("text-anchor", "middle").text("Deep channel floor");
    } else {
      anno.append("text").attr("class", "chart-anno").attr("x", x0 + cw * 0.25).attr("y", nowWaterY - 10).attr("fill", "var(--alert)").text("Lower water today");
      anno.append("text").attr("class", "chart-anno-sub").attr("x", x0 + cw * 0.11).attr("y", bankTopY + 38).attr("fill", "var(--river-dry)").text("Exposed mudbank");
      anno.append("text").attr("class", "chart-anno").attr("x", snagX + 24).attr("y", snagY - 14).attr("fill", "var(--alert)").text("Net snags on waste & metal");
      anno.append("text").attr("class", "chart-anno-sub").attr("x", snagX + 24).attr("y", snagY + 4).text("Shallow depth traps divers");
      const dropX = x0 + cw * 0.81;
      anno.append("line").attr("x1", dropX).attr("x2", dropX).attr("y1", pastWaterY + 4).attr("y2", nowWaterY - 4).attr("stroke", "var(--alert)").attr("stroke-width", 2.2);
      anno.append("text").attr("class", "chart-anno").attr("x", dropX + 10).attr("y", (pastWaterY + nowWaterY) / 2 + 4).attr("fill", "var(--alert)").text("Drop in level");
    }
  }

  // =========================================================================
  // 6. CHARTS (Direct annotation, zero legends, zero-based axes)
  // =========================================================================
  const chartSvg = d3.select("#chart-svg");

  function chartBox() {
    if (width <= 900) {
      return { x: 52, y: 120, w: width - 82, h: Math.min(300, height * 0.42) };
    }
    const left = Math.max(525, width * 0.41);
    const w = Math.min(700, width - left - 78);
    const h = Math.min(410, height * 0.56);
    return { x: left, y: (height - h) / 2 + 12, w, h };
  }

  function spreadLabels(items, minGap) {
    items.sort((a, b) => a.y - b.y);
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 1; i < items.length; i++) {
        const gap = items[i].y - items[i - 1].y;
        if (gap < minGap) {
          const push = (minGap - gap) / 2;
          items[i - 1].y -= push;
          items[i].y += push;
        }
      }
    }
    return items;
  }

  function renderChart(stepId, animate = true) {
    chartSvg.attr("viewBox", `0 0 ${width} ${height}`);
    chartSvg.selectAll("*").remove();

    const b = chartBox();
    const g = chartSvg.append("g");

    if (stepId === "chart-karun-history" || stepId === "chart-karun-drop") {
      renderKarunDischargeChart(g, b, stepId === "chart-karun-drop", animate);
    } else if (stepId === "chart-iran-water") {
      renderIranFreshwaterChart(g, b, animate);
    } else if (stepId === "chart-bc-rain") {
      renderBcRainChart(g, b, animate);
    } else if (stepId === "chart-bc-wildfires") {
      renderBcWildfiresChart(g, b, animate);
    }
  }

  function renderKarunDischargeChart(g, b, highlightDrop, animate) {
    const data = DATA.karunDischarge;
    const x = d3.scaleLinear().domain([1960, 2024]).range([b.x, b.x + b.w]);
    const y = d3.scaleLinear().domain([0, 1250]).range([b.y + b.h, b.y]);
    const histMean = 700;

    g.append("text").attr("class", "chart-title").attr("x", b.x).attr("y", b.y - 46).text(highlightDrop ? "Karun River flow dropped sharply after 2000" : "Karun River annual mean flow at Ahvaz");
    g.append("text").attr("class", "chart-subtitle").attr("x", b.x).attr("y", b.y - 22).text("Cubic meters per second (m³/s) · zero-based scale");

    const yTicks = [0, 250, 500, 750, 1000, 1250];
    g.append("g").attr("class", "chart-axis").selectAll("line").data(yTicks).join("line").attr("x1", b.x).attr("x2", b.x + b.w).attr("y1", (d) => y(d)).attr("y2", (d) => y(d)).attr("stroke", "var(--grid)");
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(${b.x},0)`).call(d3.axisLeft(y).tickValues(yTicks).tickSize(0).tickPadding(10)).call((ax) => ax.select(".domain").remove());
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${b.y + b.h})`).call(d3.axisBottom(x).tickValues([1960, 1970, 1980, 1990, 2000, 2010, 2020]).tickFormat(d3.format("d")).tickSize(5)).call((ax) => ax.select(".domain").attr("stroke", "var(--border)"));

    g.append("line").attr("x1", b.x).attr("x2", b.x + b.w).attr("y1", y(histMean)).attr("y2", y(histMean)).attr("stroke", highlightDrop ? "var(--context)" : "var(--river)").attr("stroke-dasharray", "6 5").attr("stroke-width", 1.6);
    g.append("text").attr("class", "chart-anno-sub").attr("x", b.x + 6).attr("y", y(histMean) - 8).attr("fill", highlightDrop ? "var(--ink-muted)" : "var(--river)").text("Historical average (~700 m³/s)");

    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.flow)).curve(d3.curveMonotoneX);

    if (!highlightDrop) {
      const path = g.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", "var(--river)").attr("stroke-width", 3.2);
      if (animate) {
        const len = path.node().getTotalLength();
        path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(900).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
      }
      const peak = data.find((d) => d.year === 1969);
      g.append("circle").attr("cx", x(peak.year)).attr("cy", y(peak.flow)).attr("r", 5).attr("fill", "var(--river)");
      g.append("text").attr("class", "chart-anno").attr("x", x(peak.year) + 10).attr("y", y(peak.flow) + 4).text("1969 peak: 1,139 m³/s");
      const d77 = data.find((d) => d.year === 1977);
      g.append("circle").attr("cx", x(d77.year)).attr("cy", y(d77.flow)).attr("r", 4.5).attr("fill", "var(--ink-muted)");
      g.append("text").attr("class", "chart-anno-sub").attr("x", x(d77.year) + 8).attr("y", y(d77.flow) + 14).text("1977 drought");
    } else {
      const recent = data.filter((d) => d.year >= 1999);
      const areaDeficit = d3.area().x((d) => x(d.year)).y0((d) => y(Math.min(d.flow, histMean))).y1(y(histMean)).curve(d3.curveMonotoneX);
      g.append("path").datum(recent).attr("d", areaDeficit).attr("fill", "var(--alert-soft)").attr("opacity", 0).transition().duration(650).attr("opacity", 1);
      g.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", "var(--context)").attr("stroke-width", 2.2).attr("opacity", 0.65);

      const recentPath = g.append("path").datum(recent).attr("d", line).attr("fill", "none").attr("stroke", "var(--alert)").attr("stroke-width", 3.6);
      if (animate) {
        const len = recentPath.node().getTotalLength();
        recentPath.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(800).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
      }

      const d18 = data.find((d) => d.year === 2018);
      const d22 = data.find((d) => d.year === 2022);
      const d19 = data.find((d) => d.year === 2019);
      [d18, d22].forEach((pt) => g.append("circle").attr("cx", x(pt.year)).attr("cy", y(pt.flow)).attr("r", 5.5).attr("fill", "var(--alert)"));
      g.append("text").attr("class", "chart-anno").attr("x", x(2004)).attr("y", y(545)).attr("fill", "var(--alert)").text("Upstream dams & transfers");
      g.append("text").attr("class", "chart-anno-sub").attr("x", x(2004)).attr("y", y(545) + 17).text("Deficit below historical average");
      g.append("text").attr("class", "chart-anno").attr("x", x(d22.year) - 8).attr("y", y(d22.flow) + 26).attr("text-anchor", "end").attr("fill", "var(--alert)").text("2021–23 lows (~210–235 m³/s)");
      g.append("text").attr("class", "chart-anno-sub").attr("x", x(d19.year) - 8).attr("y", y(d19.flow) - 10).attr("text-anchor", "end").text("2019 spring flood");
    }

    attachChartHover(g, b, x, y, data, (d) => `${d.year}: ~${d.flow} m³/s`);
    g.append("text").attr("class", "chart-source").attr("x", b.x).attr("y", b.y + b.h + 44).text("Benchmarks: Ahvaz Hydrometric Station (Encyclopaedia Iranica, Salarijazi et al. 2012, KWPA)");
  }

  function renderIranFreshwaterChart(g, b, animate) {
    const allWB = DATA.worldBank.freshwaterPerCapita;
    const irn = allWB.filter((d) => d.iso === "IRN");
    const irq = allWB.filter((d) => d.iso === "IRQ");
    const syr = allWB.filter((d) => d.iso === "SYR");

    const x = d3.scaleLinear().domain([1961, 2022]).range([b.x, b.x + b.w]);
    const y = d3.scaleLinear().domain([0, 6200]).range([b.y + b.h, b.y]);

    g.append("text").attr("class", "chart-title").attr("x", b.x).attr("y", b.y - 46).text(showRegionalCompare ? "Renewable freshwater per person: Iran, Iraq & Syria" : "Iran's renewable freshwater per person fell by 75%");
    g.append("text").attr("class", "chart-subtitle").attr("x", b.x).attr("y", b.y - 22).text("Cubic meters per person per year (1961–2022) · World Bank / FAO AQUASTAT");

    const yTicks = [0, 1000, 2000, 3000, 4000, 5000, 6000];
    g.append("g").attr("class", "chart-axis").selectAll("line").data(yTicks).join("line").attr("x1", b.x).attr("x2", b.x + b.w).attr("y1", (d) => y(d)).attr("y2", (d) => y(d)).attr("stroke", "var(--grid)");
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(${b.x},0)`).call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d3.format(",d")).tickSize(0).tickPadding(10)).call((ax) => ax.select(".domain").remove());
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${b.y + b.h})`).call(d3.axisBottom(x).tickValues([1965, 1975, 1985, 1995, 2005, 2015, 2022]).tickFormat(d3.format("d")).tickSize(5)).call((ax) => ax.select(".domain").attr("stroke", "var(--border)"));

    g.append("line").attr("x1", b.x).attr("x2", b.x + b.w).attr("y1", y(1700)).attr("y2", y(1700)).attr("stroke", "var(--alert)").attr("stroke-dasharray", "6 5").attr("stroke-width", 1.6);
    g.append("text").attr("class", "chart-anno-sub").attr("x", b.x + 6).attr("y", y(1700) - 7).attr("fill", "var(--alert)").text("1,700 m³ — Water stress line");
    g.append("line").attr("x1", b.x).attr("x2", b.x + b.w).attr("y1", y(1000)).attr("y2", y(1000)).attr("stroke", "var(--alert)").attr("stroke-dasharray", "2 4").attr("stroke-width", 1.2).attr("opacity", 0.7);
    g.append("text").attr("class", "chart-anno-sub").attr("x", b.x + 6).attr("y", y(1000) - 6).attr("fill", "var(--ink-muted)").text("1,000 m³ — Scarcity");

    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);
    const endLabels = [];
    if (showRegionalCompare) {
      g.append("path").datum(irq).attr("d", line).attr("fill", "none").attr("stroke", "var(--context)").attr("stroke-width", 2.4);
      g.append("path").datum(syr).attr("d", line).attr("fill", "none").attr("stroke", "var(--alert)").attr("stroke-width", 2.8);
      const irqLast = irq[irq.length - 1];
      const syrLast = syr[syr.length - 1];
      endLabels.push({ y: y(irqLast.value), text: `Iraq (${Math.round(irqLast.value)} m³)`, color: "var(--ink-muted)" });
      endLabels.push({ y: y(syrLast.value), text: `Syria (${Math.round(syrLast.value)} m³)`, color: "var(--alert)" });
    }

    const irnPath = g.append("path").datum(irn).attr("d", line).attr("fill", "none").attr("stroke", showRegionalCompare ? "var(--river)" : "var(--alert)").attr("stroke-width", 3.6);
    if (animate) {
      const len = irnPath.node().getTotalLength();
      irnPath.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(850).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
    }

    const first = irn[0];
    const last = irn[irn.length - 1];
    g.append("circle").attr("cx", x(first.year)).attr("cy", y(first.value)).attr("r", 4.5).attr("fill", showRegionalCompare ? "var(--river)" : "var(--alert)");
    g.append("circle").attr("cx", x(last.year)).attr("cy", y(last.value)).attr("r", 5.5).attr("fill", showRegionalCompare ? "var(--river)" : "var(--alert)");
    g.append("text").attr("class", "chart-anno").attr("x", x(first.year) + 10).attr("y", y(first.value) + 4).text(`Iran 1961: ${Math.round(first.value).toLocaleString()} m³`);

    endLabels.push({ y: y(last.value), text: `Iran (${Math.round(last.value).toLocaleString()} m³)`, color: showRegionalCompare ? "var(--river)" : "var(--alert)" });
    spreadLabels(endLabels, 19);
    endLabels.forEach((lb) => g.append("text").attr("class", "chart-anno").attr("x", x(2022) + 8).attr("y", lb.y + 4).attr("fill", lb.color).attr("font-size", 13).text(lb.text));

    const cross = irn.find((d) => d.value < 1700);
    if (cross && !showRegionalCompare) {
      g.append("circle").attr("cx", x(cross.year)).attr("cy", y(cross.value)).attr("r", 5.5).attr("fill", "var(--alert)");
      g.append("text").attr("class", "chart-anno").attr("x", x(cross.year) - 6).attr("y", y(cross.value) - 22).attr("text-anchor", "end").attr("fill", "var(--alert)").text(`Crossed into water stress (${cross.year})`);
    }

    attachChartHover(g, b, x, y, irn.map((d) => ({ year: d.year, flow: d.value })), (d) => `Iran ${d.year}: ${Math.round(d.flow).toLocaleString()} m³ / person`);
    g.append("text").attr("class", "chart-source").attr("x", b.x).attr("y", b.y + b.h + 44).text("Data: World Bank WDI / FAO AQUASTAT (ER.H2O.INTR.PC, 1961–2022)");
  }

  // NEW: British Columbia Atmospheric River Rainfall vs Historical Normal (zero-based, direct labels, NO legend)
  function renderBcRainChart(g, b, animate) {
    const data = DATA.bcRain;
    const padLeft = 100;
    const x0 = b.x + padLeft;
    const plotW = b.w - padLeft - 44;

    const x = d3.scaleLinear().domain([0, 820]).range([x0, x0 + plotW]);
    const y = d3.scaleBand().domain(data.map((d) => d.city)).range([b.y + 10, b.y + b.h - 10]).padding(0.32);

    g.append("text").attr("class", "chart-title").attr("x", b.x).attr("y", b.y - 46).text("British Columbia rainfall: Nov 2021 vs. normal");
    g.append("text").attr("class", "chart-subtitle").attr("x", b.x).attr("y", b.y - 22).text("Total monthly precipitation in millimeters (mm) · Environment Canada (ECCC)");

    const xTicks = [0, 200, 400, 600, 800];
    g.append("g").attr("class", "chart-axis").selectAll("line").data(xTicks).join("line").attr("x1", (d) => x(d)).attr("x2", (d) => x(d)).attr("y1", b.y).attr("y2", b.y + b.h).attr("stroke", "var(--grid)");
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${b.y + b.h})`).call(d3.axisBottom(x).tickValues(xTicks).tickFormat((d) => `${d} mm`).tickSize(5)).call((ax) => ax.select(".domain").attr("stroke", "var(--border)"));

    const barH = y.bandwidth() * 0.48;

    data.forEach((d, idx) => {
      const cy = y(d.city);
      const mult = (d.nov2021 / d.normal).toFixed(1);

      // City label on left
      g.append("text").attr("class", "chart-anno").attr("x", x0 - 12).attr("y", cy + y.bandwidth() / 2 + 5).attr("text-anchor", "end").text(d.city);

      // Historical normal bar (muted gray context)
      const normBar = g
        .append("rect")
        .attr("x", x(0))
        .attr("y", cy + barH + 2)
        .attr("height", barH - 2)
        .attr("rx", 2)
        .attr("fill", "var(--context)")
        .attr("opacity", 0.72)
        .attr("width", animate ? 0 : x(d.normal) - x(0));
      if (animate) normBar.transition().duration(650).delay(idx * 55).attr("width", x(d.normal) - x(0));

      // Nov 2021 atmospheric river bar (bright water blue highlight)
      const wetBar = g
        .append("rect")
        .attr("x", x(0))
        .attr("y", cy)
        .attr("height", barH)
        .attr("rx", 2)
        .attr("fill", "var(--transfer)")
        .attr("width", animate ? 0 : x(d.nov2021) - x(0));
      if (animate) wetBar.transition().duration(750).delay(idx * 55 + 90).ease(d3.easeCubicOut).attr("width", x(d.nov2021) - x(0));

      // Direct labels (no legend!)
      g.append("text")
        .attr("class", "chart-anno")
        .attr("x", x(d.nov2021) + 8)
        .attr("y", cy + barH * 0.78)
        .attr("fill", "var(--transfer)")
        .attr("font-size", 13.5)
        .text(`${d.nov2021} mm (${mult}×)`);

      g.append("text")
        .attr("class", "chart-anno-sub")
        .attr("x", x(d.normal) + 8)
        .attr("y", cy + barH * 1.75)
        .attr("font-size", 12)
        .text(idx === 0 ? `${d.normal} mm normal` : `${d.normal} mm`);
    });

    // Direct callout on first row instead of legend
    g.append("text").attr("class", "chart-anno-sub").attr("x", x(730) + 8).attr("y", y("Hope") - 6).attr("fill", "var(--transfer)").text("Nov 2021 storm");
    g.append("text").attr("class", "chart-source").attr("x", b.x).attr("y", b.y + b.h + 44).text("Data: Environment and Climate Change Canada (Nov 2021 atmospheric river vs. historical normal)");
  }

  // British Columbia Annual Wildfires (2014–2024): Fire-Icon Unit Grid / Dot Plot
  // Each flame icon = 100 wildfires (or 100,000 ha), building year-by-year from 2014 to 2024
  let wildfireTimers = [];

  function clearWildfireTimers() {
    wildfireTimers.forEach((id) => clearTimeout(id));
    wildfireTimers = [];
  }

  function renderBcWildfiresChart(g, b, animate) {
    clearWildfireTimers();

    const data = DATA.bcWildfires;
    const isHa = bcWildfireMetric === "hectares";
    const unitSize = isHa ? 100000 : 100;

    // Clean vector flame icon path centered around (0,0) in a 16x20 box
    const FLAME_OUTER =
      "M 0,-9.5 C 2.4,-6.2 6.8,-3.1 6.8,2.1 C 6.8,6.2 3.8,9 0,9 C -3.8,9 -6.8,6.2 -6.8,2.1 C -6.8,-1.6 -4.6,-4.4 -3.1,-6.2 C -3.4,-3.8 -2.1,-2.6 -1.4,-2.2 C -2.1,-5.4 -1.2,-7.9 0,-9.5 Z";
    const FLAME_INNER =
      "M 0,-2.2 C 1.4,-0.2 3.1,1.3 3.1,3.9 C 3.1,6.1 1.7,7.5 0,7.5 C -1.7,7.5 -3.1,6.1 -3.1,3.9 C -3.1,1.6 -1.4,-0.1 0,-2.2 Z";

    const x = d3.scaleBand().domain(data.map((d) => d.year)).range([b.x, b.x + b.w]).padding(0.18);
    const colsPerYear = 2;
    const iconStepX = Math.min(20, Math.max(13, (x.bandwidth() - 4) / colsPerYear));
    const maxIcons = d3.max(data, (d) => Math.max(1, Math.round((isHa ? d.hectares : d.fires) / unitSize)));
    const maxRows = Math.ceil(maxIcons / colsPerYear);
    const iconStepY = Math.min(24, Math.max(15, (b.h - 42) / maxRows));
    const iconScale = Math.min(1.05, Math.max(0.68, Math.min(iconStepX / 17, iconStepY / 21)));

    // Title & direct unit key (NO legend box!)
    g.append("text")
      .attr("class", "chart-title")
      .attr("x", b.x)
      .attr("y", b.y - 48)
      .text(isHa ? "Area burned by wildfires in British Columbia" : "Wildfires in British Columbia (2014–2024)");

    // Inline flame icon directly in the subtitle line
    const subG = g.append("g").attr("transform", `translate(${b.x + 7},${b.y - 24})`);
    subG.append("path").attr("d", FLAME_OUTER).attr("transform", "scale(0.78)").attr("fill", "var(--alert)");
    subG.append("path").attr("d", FLAME_INNER).attr("transform", "scale(0.78)").attr("fill", "var(--boat)");
    g.append("text")
      .attr("class", "chart-subtitle")
      .attr("x", b.x + 19)
      .attr("y", b.y - 19)
      .text(
        isHa
          ? "= 100,000 hectares burned · each year builds one by one (2014 → 2024)"
          : "= 100 wildfires · each year builds one by one (2014 → 2024)"
      );

    // Subtle baseline & faint reference guide lines
    const baseY = b.y + b.h;
    g.append("line")
      .attr("x1", b.x)
      .attr("x2", b.x + b.w)
      .attr("y1", baseY)
      .attr("y2", baseY)
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 1.4);

    // Subtle unit guide lines (e.g., 1,000 / 2,000 fires or 1M / 2M ha)
    const refMarks = isHa ? [10, 20] : [10, 20]; // icon counts (10 icons = 1,000 fires or 1M ha)
    refMarks.forEach((cnt) => {
      const rowIdx = cnt / colsPerYear;
      const ry = baseY - rowIdx * iconStepY - 4;
      if (ry > b.y + 10) {
        g.append("line")
          .attr("x1", b.x)
          .attr("x2", b.x + b.w)
          .attr("y1", ry)
          .attr("y2", ry)
          .attr("stroke", "var(--grid)")
          .attr("stroke-dasharray", "4 4");
        g.append("text")
          .attr("class", "chart-anno-sub")
          .attr("x", b.x - 8)
          .attr("y", ry + 4)
          .attr("text-anchor", "end")
          .attr("font-size", 11.5)
          .text(isHa ? `${cnt / 10}M ha` : `${(cnt * 100).toLocaleString()}`);
      }
    });

    // Live active year counter badge (top-right during build)
    const yearBadge = g
      .append("text")
      .attr("class", "chart-anno")
      .attr("x", b.x + b.w)
      .attr("y", b.y + 12)
      .attr("text-anchor", "end")
      .attr("font-size", 16)
      .attr("fill", "var(--alert)")
      .text("");

    // Pre-create column groups for each year
    const colGroups = data.map((d) => {
      const cx = x(d.year) + x.bandwidth() / 2;
      const colG = g.append("g").attr("class", `wf-col-${d.year}`);

      // X-axis year label (faint until year activates)
      const yrText = colG
        .append("text")
        .attr("x", cx)
        .attr("y", baseY + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("font-weight", d.record ? 700 : 500)
        .attr("fill", d.record ? "var(--alert)" : "var(--ink-muted)")
        .attr("opacity", animate ? 0.25 : 1)
        .text(d.year);

      return { d, cx, colG, yrText };
    });

    // Direct 2023 record callout (appears when 2023 finishes building)
    const r23 = data.find((d) => d.year === 2023);
    const r23Icons = Math.max(1, Math.round((isHa ? r23.hectares : r23.fires) / unitSize));
    const r23TopY = baseY - Math.ceil(r23Icons / colsPerYear) * iconStepY - 12;
    const calloutG = g.append("g").attr("opacity", animate ? 0 : 1);
    calloutG
      .append("text")
      .attr("class", "chart-anno")
      .attr("x", x(2023) - 16)
      .attr("y", Math.max(b.y + 18, r23TopY + 12))
      .attr("text-anchor", "end")
      .attr("fill", "var(--alert)")
      .text("2023 record season");
    calloutG
      .append("text")
      .attr("class", "chart-anno-sub")
      .attr("x", x(2023) - 16)
      .attr("y", Math.max(b.y + 35, r23TopY + 29))
      .attr("text-anchor", "end")
      .text("2,293 fires · 2.84M ha burned");

    function drawYearColumn(entry, immediate) {
      const { d, cx, colG, yrText } = entry;
      const val = isHa ? d.hectares : d.fires;
      const count = Math.max(1, Math.round(val / unitSize));
      const outerFill = d.record ? "var(--alert)" : d.major ? "var(--industry)" : "var(--context)";
      const innerFill = d.record ? "var(--boat)" : d.major ? "#ffe6a7" : "var(--ink-muted)";

      yrText.transition().duration(220).attr("opacity", 1).attr("fill", d.record ? "var(--alert)" : "var(--ink)");

      for (let i = 0; i < count; i++) {
        const col = i % colsPerYear;
        const row = Math.floor(i / colsPerYear);
        const ix = cx + (col - (colsPerYear - 1) / 2) * iconStepX;
        const iy = baseY - (row + 0.55) * iconStepY;

        const ig = colG.append("g").attr("transform", `translate(${ix},${iy}) scale(${immediate ? iconScale : 0.01})`);
        ig.append("path").attr("d", FLAME_OUTER).attr("fill", outerFill).attr("opacity", d.major ? 0.96 : 0.72);
        ig.append("path").attr("d", FLAME_INNER).attr("fill", innerFill).attr("opacity", d.major ? 0.92 : 0.45);

        if (!immediate) {
          ig.transition()
            .duration(220)
            .delay(row * 26 + col * 14)
            .ease(d3.easeBackOut.overshoot(1.3))
            .attr("transform", `translate(${ix},${iy}) scale(${iconScale})`);
        }
      }

      // Direct numeric count right on top of each year's fire grid
      const topY = baseY - Math.ceil(count / colsPerYear) * iconStepY - 8;
      const labelTxt = isHa
        ? val >= 1000000
          ? `${(val / 1000000).toFixed(2)}M`
          : `${Math.round(val / 1000)}k`
        : val.toLocaleString();

      const lbl = colG
        .append("text")
        .attr("class", "chart-anno")
        .attr("x", cx)
        .attr("y", topY)
        .attr("text-anchor", "middle")
        .attr("font-size", d.record ? 13.5 : 11.5)
        .attr("fill", d.record ? "var(--alert)" : d.major ? "var(--ink)" : "var(--ink-muted)")
        .attr("opacity", immediate ? 1 : 0)
        .text(labelTxt);

      if (!immediate) {
        lbl.transition().duration(220).delay(Math.ceil(count / colsPerYear) * 26).attr("opacity", 1);
      }

      if (d.year === 2023 && !immediate) {
        calloutG.transition().duration(380).delay(Math.ceil(count / colsPerYear) * 26).attr("opacity", 1);
      }
    }

    if (!animate) {
      colGroups.forEach((entry) => drawYearColumn(entry, true));
    } else {
      // Reveal each year one by one (2014 -> 2024)
      const stepMs = 340;
      colGroups.forEach((entry, idx) => {
        const tid = setTimeout(() => {
          yearBadge.text(entry.d.year);
          drawYearColumn(entry, false);
          if (idx === colGroups.length - 1) {
            const doneId = setTimeout(() => yearBadge.transition().duration(400).attr("opacity", 0), 900);
            wildfireTimers.push(doneId);
          }
        }, idx * stepMs + 120);
        wildfireTimers.push(tid);
      });
    }

    g.append("text")
      .attr("class", "chart-source")
      .attr("x", b.x)
      .attr("y", b.y + b.h + 44)
      .text("Data: BC Wildfire Service, Government of British Columbia (2014–2024)");
  }

  function attachChartHover(g, b, x, y, series, formatter) {
    const hoverG = g.append("g").style("display", "none").style("pointer-events", "none");
    hoverG.append("line").attr("y1", b.y).attr("y2", b.y + b.h).attr("stroke", "var(--ink-faint)").attr("stroke-dasharray", "3 3");
    hoverG.append("circle").attr("r", 5.5).attr("fill", "var(--ink)").attr("stroke", "var(--bg)").attr("stroke-width", 2);
    const pill = hoverG.append("g");
    const rect = pill.append("rect").attr("rx", 4).attr("height", 26).attr("fill", "var(--bg-elevated)").attr("stroke", "var(--surface-border)");
    const txt = pill.append("text").attr("fill", "var(--ink)").attr("font-size", 12.5).attr("font-weight", 600).attr("y", 17).attr("x", 9);

    const bisect = d3.bisector((d) => d.year).center;
    g.append("rect")
      .attr("x", b.x)
      .attr("y", b.y)
      .attr("width", b.w)
      .attr("height", b.h)
      .attr("fill", "transparent")
      .on("mouseenter", () => hoverG.style("display", null))
      .on("mouseleave", () => hoverG.style("display", "none"))
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const yr = x.invert(mx);
        const idx = bisect(series, yr);
        const d = series[Math.max(0, Math.min(series.length - 1, idx))];
        const px = x(d.year);
        const py = y(d.flow);
        hoverG.select("line").attr("x1", px).attr("x2", px);
        hoverG.select("circle").attr("cx", px).attr("cy", py);
        txt.text(formatter(d));
        const tw = txt.node().getComputedTextLength() + 18;
        rect.attr("width", tw);
        const boxX = px + tw + 14 > b.x + b.w ? px - tw - 10 : px + 10;
        const boxY = Math.max(b.y, py - 30);
        pill.attr("transform", `translate(${boxX},${boxY})`);
      });
  }

  // =========================================================================
  // 7. MEDIA HELPERS (One-by-one Spotlight + Native Video Clips)
  // =========================================================================
  function hideSpotlight() {
    photoSpotlight.classList.remove("is-visible", "no-caption", "is-portrait", "is-anchored");
    photoSpotlight.style.left = "";
    photoSpotlight.style.top = "";
    activeSpotlightKey = null;
    activeSpotlightAnchor = null;
    screenSpace.select(".ss-leader").selectAll("*").remove();
  }

  function showSpotlight(photoKey, opts = {}) {
    const p = DATA.photos[photoKey];
    if (!p) return;
    const { hideCaption = false, portrait = false, anchorLonLat = null, anchorColor = "var(--alert)" } = opts;

    activeSpotlightKey = photoKey;
    spotlightImg.src = p.src;
    spotlightImg.alt = p.title;
    spotlightTitle.textContent = p.title;

    const creditParts = [p.artist, p.license].filter(Boolean).join(" · ");
    spotlightMeta.textContent = creditParts ? `${creditParts} · Click to enlarge` : "Click to enlarge";

    photoSpotlight.classList.toggle("no-caption", hideCaption);
    photoSpotlight.classList.toggle("is-portrait", portrait);

    if (anchorLonLat) {
      activeSpotlightAnchor = { lon: anchorLonLat[0], lat: anchorLonLat[1], color: anchorColor };
    } else {
      activeSpotlightAnchor = null;
      photoSpotlight.classList.remove("is-anchored");
      photoSpotlight.style.left = "";
      photoSpotlight.style.top = "";
      screenSpace.select(".ss-leader").selectAll("*").remove();
    }

    photoSpotlight.classList.add("is-visible");
    if (activeSpotlightAnchor && currentCamView) {
      positionAnchoredSpotlight(currentCamView);
    }
  }

  function clearVideo() {
    if (activeVideoEl) {
      try {
        activeVideoEl.pause();
      } catch (e) {}
      activeVideoEl = null;
    }
    videoSpotlight.classList.remove("is-visible");
    videoFrame.innerHTML = "";
    videoControls.innerHTML = "";
  }

  function showClipVideo({ src, ratioClass, title, meta, startSec = 0, endSec = null, externalUrl = null, externalLabel = null, playLabel = "Play with sound" }) {
    clearVideo();
    videoFrame.className = `video-frame ${ratioClass}`;
    videoTitle.textContent = title;
    videoMeta.textContent = meta;

    const vid = document.createElement("video");
    vid.src = src;
    vid.playsInline = true;
    vid.controls = true;
    vid.preload = "auto";
    vid.muted = true; // reliable autoplay on scroll; user clicks button to hear sound
    activeVideoEl = vid;

    function playClip(withSound) {
      if (withSound) vid.muted = false;
      try {
        vid.currentTime = startSec;
      } catch (e) {}
      const pr = vid.play();
      if (pr && pr.catch) pr.catch(() => {});
      updateMuteBtn();
    }

    vid.addEventListener("loadedmetadata", () => {
      try {
        vid.currentTime = startSec;
      } catch (e) {}
      const pr = vid.play();
      if (pr && pr.catch) pr.catch(() => {});
    });

    if (endSec !== null) {
      vid.addEventListener("timeupdate", () => {
        if (vid.currentTime >= endSec) {
          vid.pause();
          vid.currentTime = endSec;
        }
      });
    }

    videoFrame.appendChild(vid);

    const playSoundBtn = document.createElement("button");
    playSoundBtn.className = "video-btn";
    playSoundBtn.textContent = playLabel;
    playSoundBtn.addEventListener("click", () => playClip(true));

    const muteBtn = document.createElement("button");
    muteBtn.className = "video-btn secondary";
    function updateMuteBtn() {
      muteBtn.textContent = vid.muted ? "Unmute" : "Mute";
    }
    updateMuteBtn();
    muteBtn.addEventListener("click", () => {
      vid.muted = !vid.muted;
      if (vid.paused && (endSec === null || vid.currentTime >= endSec - 0.1)) {
        playClip(!vid.muted);
      }
      updateMuteBtn();
    });

    videoControls.appendChild(playSoundBtn);
    videoControls.appendChild(muteBtn);

    if (externalUrl) {
      const link = document.createElement("a");
      link.className = "video-btn secondary";
      link.style.textDecoration = "none";
      link.href = externalUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = externalLabel || "Open source ↗";
      videoControls.appendChild(link);
    }

    videoSpotlight.classList.add("is-visible");
  }

  // =========================================================================
  // 8. STEP ORCHESTRATOR
  // =========================================================================
  function setActiveStage(mode) {
    layerMap.classList.toggle("is-hidden", mode !== "map");
    layerElevation.classList.toggle("is-hidden", mode !== "elevation");
    layerChart.classList.toggle("is-hidden", mode !== "chart");
  }

  let karunDrawn = false;

  function setKarunState({ visible, narrowed = false, night = false }) {
    const ribbon = worldSpace.select(".karun-ribbon");
    const dryBank = worldSpace.select(".karun-bank-dry");
    const veil = worldSpace.select(".night-veil");

    if (!visible) {
      karunDrawn = false;
      ribbon.interrupt().attr("stroke-dasharray", `${karunTotalLen} ${karunTotalLen}`).transition().duration(550).attr("stroke-dashoffset", karunTotalLen).attr("opacity", 0).attr("stroke-width", 0.11);
      dryBank.attr("opacity", 0);
      veil.transition().duration(500).attr("opacity", 0);
      return;
    }

    if (!karunDrawn) {
      karunDrawn = true;
      ribbon
        .interrupt()
        .attr("opacity", 1)
        .attr("stroke-dasharray", `${karunTotalLen} ${karunTotalLen}`)
        .attr("stroke-dashoffset", karunTotalLen)
        .transition()
        .duration(1150)
        .ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0)
        .attr("stroke-width", narrowed ? 0.056 : 0.11)
        .attr("stroke", narrowed ? "var(--river-deep)" : "var(--river)")
        .on("end", () => ribbon.attr("stroke-dasharray", null));
    } else {
      ribbon.interrupt().attr("opacity", 1).attr("stroke-dasharray", null).transition().duration(850).ease(d3.easeCubicInOut).attr("stroke-width", narrowed ? 0.056 : 0.11).attr("stroke", narrowed ? "var(--river-deep)" : "var(--river)");
    }

    dryBank.attr("opacity", narrowed ? 0.88 : 0);
    veil.transition().duration(650).attr("opacity", night ? 0.44 : 0);
  }

  function setRegionalRivers({ karun = false, zayandeh = false, zayandehDry = false, euphrates = false, transfers = false }) {
    worldSpace.select(".reg-river-karun_basin").transition().duration(600).attr("opacity", karun ? 0.95 : 0);
    worldSpace.select(".reg-river-zayandeh_rud").transition().duration(600).attr("opacity", zayandeh ? 0.98 : 0).attr("stroke", zayandehDry ? "var(--river-dry)" : "var(--river)").attr("stroke-dasharray", zayandehDry ? "6 5" : "none");
    worldSpace.select(".reg-river-euphrates").transition().duration(600).attr("opacity", euphrates ? 0.98 : 0).attr("stroke", euphrates ? "var(--alert)" : "var(--river)");
    worldSpace.select(".reg-river-tigris").transition().duration(600).attr("opacity", euphrates ? 0.65 : 0).attr("stroke", "var(--context)");
    worldSpace.select(".g-transfers").transition().duration(700).attr("opacity", transfers ? 1 : 0);
  }

  function applyStep(stepId, index) {
    currentStepId = stepId;
    currentStepIndex = index;

    const numStr = String(index + 1).padStart(2, "0");
    hudStepLabel.textContent = `${numStr} / ${STEPS.length}`;
    document.querySelectorAll(".step").forEach((el, i) => el.classList.toggle("is-active", i === index));
    document.querySelectorAll(".step-dot").forEach((el, i) => el.classList.toggle("is-active", i === index));

    hideSpotlight();
    clearVideo();
    clearWildfireTimers();
    mapOverlayState = {
      ahvazPin: false,
      karunLabel: false,
      nightPhotoPin: false,
      iranDroughts: false,
      focusCity: null,
      globalFocus: null,
      policies: false,
      industry: false,
      worldClosing: false
    };

    switch (stepId) {
      // Start on pure Ahvaz street map, then show personal photos ONE BY ONE with NO subtitles
      case "ahvaz-city":
        setActiveStage("map");
        setBoatMode("hidden");
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.175), 1100);
        break;

      case "ahvaz-me":
        setActiveStage("map");
        setBoatMode("hidden");
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.175), 850);
        showSpotlight("ahvaz_palm", { hideCaption: true, portrait: true });
        break;

      case "ahvaz-photo-fish":
        setActiveStage("map");
        setBoatMode("hidden");
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.175), 850);
        showSpotlight("ahvaz_fish", { hideCaption: true, portrait: true });
        break;

      case "ahvaz-photo-boat":
        setActiveStage("map");
        setBoatMode("hidden");
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.175), 850);
        showSpotlight("ahvaz_boat", { hideCaption: true });
        break;

      case "iran-zoom-out":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.ahvazPin = true;
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(53.4, 32.3, 21.5), 1450);
        break;

      case "ahvaz-zoom-in":
        setActiveStage("map");
        setBoatMode("hidden");
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.175), 1400);
        break;

      // Karun photos shown ONE BY ONE WITH subtitles
      case "karun-overlay":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.karunLabel = true;
        setKarunState({ visible: true, narrowed: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.165), 950);
        showSpotlight("karun_visitiran");
        break;

      case "karun-boats-photo":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.karunLabel = true;
        setKarunState({ visible: true, narrowed: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.155), 850);
        showSpotlight("karun_tasnim");
        break;

      case "karun-my-photo":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.nightPhotoPin = true;
        setKarunState({ visible: true, narrowed: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.698, 31.335, 0.115), 950);
        showSpotlight("ahvaz_night", {
          portrait: true,
          anchorLonLat: [48.687778, 31.334833],
          anchorColor: "var(--boat)"
        });
        break;

      // Native local H.264 clip for Aghasi (0:35–0:50) — works reliably everywhere!
      case "karun-song":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.karunLabel = true;
        setKarunState({ visible: true, narrowed: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.682, 31.32, 0.155), 950);
        showClipVideo({
          src: "media/aghasi_karoon.mp4",
          ratioClass: "ratio-4-3",
          title: "Aghasi — Labe Karoon",
          meta: "0:35 to 0:50 · Southern Iranian folk song about the Karun River.",
          startSec: 0,
          endSec: 15,
          playLabel: "Play 0:35–0:50 with sound",
          externalUrl: "https://www.youtube.com/watch?v=JWoy45idGvE&t=35s",
          externalLabel: "YouTube ↗"
        });
        break;

      case "river-boat":
        setActiveStage("map");
        setKarunState({ visible: true, narrowed: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.68, 31.318, 0.125), 950);
        setBoatMode("gliding");
        break;

      case "fishing-nets":
        setActiveStage("map");
        setKarunState({ visible: true, narrowed: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.678, 31.316, 0.115), 850);
        setBoatMode("fishing");
        break;

      case "my-uncle":
        setActiveStage("map");
        setKarunState({ visible: true, narrowed: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.676, 31.315, 0.115), 850);
        setBoatMode("uncle");
        showClipVideo({
          src: "media/uncle.mp4",
          ratioClass: "ratio-square",
          title: "My uncle talking about fishing",
          meta: "0:08 to 0:12 · Talking about fishing with joy.",
          startSec: 8.0,
          endSec: 12.0,
          playLabel: "Play 0:08–0:12 with sound"
        });
        break;

      case "one-night":
        setActiveStage("map");
        setKarunState({ visible: true, narrowed: false, night: true });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.675, 31.314, 0.095), 900);
        setBoatMode("stuck");
        break;

      case "pollution-low-water":
        setActiveStage("map");
        setKarunState({ visible: true, narrowed: true, night: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.68, 31.318, 0.135), 950);
        setBoatMode("low-water");
        break;

      case "elevation-past":
        setActiveStage("elevation");
        setBoatMode("hidden");
        renderElevation("elevation-past", true);
        break;

      case "elevation-now":
        setActiveStage("elevation");
        setBoatMode("hidden");
        renderElevation("elevation-now", true);
        break;

      case "chart-karun-history":
        setActiveStage("chart");
        setBoatMode("hidden");
        renderChart("chart-karun-history", true);
        break;

      case "chart-karun-drop":
        setActiveStage("chart");
        setBoatMode("hidden");
        renderChart("chart-karun-drop", true);
        break;

      case "chart-iran-water":
        setActiveStage("chart");
        setBoatMode("hidden");
        renderChart("chart-iran-water", true);
        break;

      case "iran-droughts":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.iranDroughts = true;
        setKarunState({ visible: false });
        setRegionalRivers({ karun: true, zayandeh: true, zayandehDry: true });
        flyTo(cameraForLonLat(53.4, 32.6, 20.5), 1100);
        break;

      // Iran & Global examples — ONE BY ONE anchored adjacent to their locations
      case "zayandeh-rud":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.iranDroughts = true;
        mapOverlayState.focusCity = "zayandeh";
        setKarunState({ visible: false });
        setRegionalRivers({ karun: true, zayandeh: true, zayandehDry: true });
        flyTo(cameraForLonLat(53.6, 32.65, 11.5), 1100);
        showSpotlight("zayandeh", { anchorLonLat: [51.668, 32.6546], anchorColor: "var(--alert)" });
        break;

      case "kashmar-cities":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.iranDroughts = true;
        mapOverlayState.focusCity = "kashmar";
        setKarunState({ visible: false });
        setRegionalRivers({ karun: true, zayandeh: true, zayandehDry: true });
        flyTo(cameraForLonLat(60.2, 35.1, 13.5), 1100);
        showSpotlight("khorasan_qanat", { anchorLonLat: [58.4656, 35.2383], anchorColor: "var(--alert)" });
        break;

      case "iran-urmia":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.iranDroughts = true;
        mapOverlayState.focusCity = "urmia";
        setKarunState({ visible: false });
        setRegionalRivers({ karun: true, zayandeh: true, zayandehDry: true });
        flyTo(cameraForLonLat(47.8, 37.3, 13.5), 1100);
        showSpotlight("urmia", { anchorLonLat: [45.35, 37.65], anchorColor: "var(--alert)" });
        break;

      case "world-syria":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.globalFocus = {
          lon: 39.02,
          lat: 35.93,
          name: "Syria · Euphrates River",
          sub: "Lake Assad & historic low flows",
          color: "var(--alert)",
          syriaExtras: true
        };
        setKarunState({ visible: false });
        setRegionalRivers({ karun: true, euphrates: true });
        flyTo(cameraForLonLat(43.2, 35.2, 22.0), 1250);
        showSpotlight("euphrates", { anchorLonLat: [39.02, 35.93], anchorColor: "var(--alert)" });
        break;

      case "world-aral":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.globalFocus = {
          lon: 59.5,
          lat: 45.0,
          name: "Aral Sea, Central Asia",
          sub: "Lost ~90% of its water",
          color: "var(--alert)"
        };
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(64.5, 44.5, 24.0), 1250);
        showSpotlight("aral", { anchorLonLat: [59.5, 45.0], anchorColor: "var(--alert)" });
        break;

      case "world-chad":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.globalFocus = {
          lon: 14.0,
          lat: 13.0,
          name: "Lake Chad, Central Africa",
          sub: "Shrunk dramatically since 1973",
          color: "var(--alert)"
        };
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(19.5, 13.0, 28.0), 1350);
        showSpotlight("chad", { anchorLonLat: [14.0, 13.0], anchorColor: "var(--alert)" });
        break;

      case "world-po":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.globalFocus = {
          lon: 10.8,
          lat: 45.05,
          name: "Po River, Northern Italy",
          sub: "Severe 2022 river drought",
          color: "var(--alert)"
        };
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(14.5, 44.8, 18.0), 1250);
        showSpotlight("po", { anchorLonLat: [10.8, 45.05], anchorColor: "var(--alert)" });
        break;

      case "world-mead":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.globalFocus = {
          lon: -114.7,
          lat: 36.02,
          name: "Lake Mead · Colorado River",
          sub: "Multi-decade western US drought",
          color: "var(--alert)"
        };
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(-109.5, 36.2, 26.0), 1500);
        showSpotlight("mead", { anchorLonLat: [-114.7, 36.02], anchorColor: "var(--alert)" });
        break;

      // Transition to Canada (British Columbia): Rain & Wildfires
      case "canada-bc-rain":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.globalFocus = {
          lon: -122.4,
          lat: 49.25,
          name: "British Columbia, Canada",
          sub: "Nov 2021 atmospheric river floods",
          color: "var(--transfer)"
        };
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(-118.5, 51.0, 22.0), 1300);
        showSpotlight("bc_flood", { anchorLonLat: [-122.4, 49.25], anchorColor: "var(--transfer)" });
        break;

      case "chart-bc-rain":
        setActiveStage("chart");
        setBoatMode("hidden");
        renderChart("chart-bc-rain", true);
        break;

      case "canada-bc-wildfire":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.globalFocus = {
          lon: -120.8,
          lat: 51.2,
          name: "Interior British Columbia",
          sub: "Summer heat & extreme wildfires",
          color: "var(--alert)"
        };
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(-117.5, 52.0, 20.0), 1150);
        showSpotlight("bc_wildfire", { anchorLonLat: [-120.8, 51.2], anchorColor: "var(--alert)" });
        break;

      case "chart-bc-wildfires":
        setActiveStage("chart");
        setBoatMode("hidden");
        renderChart("chart-bc-wildfires", true);
        break;

      // Return to Iran: Policies & Industry
      case "iran-policies":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.policies = true;
        setKarunState({ visible: false });
        setRegionalRivers({ karun: true, zayandeh: true, zayandehDry: true, transfers: true });
        flyTo(cameraForLonLat(53.5, 31.5, 16.0), 1450);
        showSpotlight("karun3", { anchorLonLat: [50.11, 31.78], anchorColor: "var(--transfer)" });
        break;

      case "iran-industry":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.policies = true;
        mapOverlayState.industry = true;
        setKarunState({ visible: false });
        setRegionalRivers({ karun: true, zayandeh: true, zayandehDry: true, transfers: true });
        flyTo(cameraForLonLat(53.4, 31.6, 15.0), 1000);
        showSpotlight("mobarakeh", { anchorLonLat: [51.42, 32.28], anchorColor: "var(--industry)" });
        break;

      case "closing-ahvaz":
        setActiveStage("map");
        setKarunState({ visible: true, narrowed: true, night: false });
        setRegionalRivers({});
        flyTo(cameraForLonLat(48.685, 31.32, 0.165), 1450);
        setBoatMode("closing");
        break;

      // Final Slide: Broad World Map highlighting tagged climate events
      case "closing-world":
        setActiveStage("map");
        setBoatMode("hidden");
        mapOverlayState.worldClosing = true;
        setKarunState({ visible: false });
        setRegionalRivers({});
        flyTo(cameraForBroadWorld(), 1650);
        break;
    }

    if (currentCamView) {
      updateScreenSpacePositions(currentCamView);
      positionAnchoredSpotlight(currentCamView);
    }
  }

  // =========================================================================
  // 9. OBSERVERS, LIGHTBOX & FOOTER CREDITS
  // =========================================================================
  function setupObservers() {
    const stepEls = Array.from(document.querySelectorAll(".step"));

    function activateStepEl(el) {
      if (!el) return;
      const id = el.dataset.step;
      const idx = Number(el.dataset.index);
      if (id !== currentStepId) {
        applyStep(id, idx);
      }
    }

    // Require >55% of a 100vh step to be in view so micro-scrolls never flicker or skip
    const observer = new IntersectionObserver(
      (entries) => {
        let best = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) {
              best = entry;
            }
          }
        });
        if (best) activateStepEl(best.target);
      },
      { threshold: [0.55, 0.75] }
    );
    stepEls.forEach((el) => observer.observe(el));

    // Settle sync ensures dragging the scrollbar or fast snaps always land on the exact centered step
    function syncNearestStep() {
      const midY = window.innerHeight / 2;
      let nearest = null;
      let bestDist = Infinity;
      stepEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const dist = Math.abs((r.top + r.bottom) / 2 - midY);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = el;
        }
      });
      if (nearest) activateStepEl(nearest);
    }

    let settleTimer = null;
    window.addEventListener(
      "scroll",
      () => {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docH > 0 ? Math.min(100, Math.max(0, (window.scrollY / docH) * 100)) : 0;
        progressBar.style.width = `${pct}%`;

        clearTimeout(settleTimer);
        settleTimer = setTimeout(syncNearestStep, 110);
      },
      { passive: true }
    );
    window.addEventListener("scrollend", syncNearestStep, { passive: true });

    function goToIndex(idx) {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
      stepEls[clamped].scrollIntoView({ behavior: "smooth", block: "center" });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
        lightbox.classList.remove("is-open");
        return;
      }
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        goToIndex(currentStepIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        goToIndex(currentStepIndex - 1);
      }
    });
  }

  function openPhoto(key) {
    const p = DATA.photos[key];
    if (!p) return;
    lightboxImg.src = p.src;
    lightboxImg.alt = p.title;
    lightboxTitle.textContent = p.title;
    lightboxDesc.textContent = p.desc;
    const creditLine = [p.artist, p.date ? p.date.slice(0, 10) : "", p.license].filter(Boolean).join(" · ");
    if (p.source) {
      lightboxSource.style.display = "inline-block";
      lightboxSource.href = p.source;
      lightboxSource.textContent = `Verified source: ${creditLine} ↗`;
    } else {
      lightboxSource.style.display = "none";
    }
    lightbox.classList.add("is-open");
  }

  function setupPhotos() {
    photoSpotlight.addEventListener("click", () => {
      if (activeSpotlightKey) openPhoto(activeSpotlightKey);
    });
    document.getElementById("lightbox-close").addEventListener("click", () => {
      lightbox.classList.remove("is-open");
    });
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.classList.remove("is-open");
    });

    const list = document.getElementById("photo-sources-list");
    if (list) {
      list.innerHTML = "";
      Object.values(DATA.photos).forEach((p) => {
        const li = document.createElement("li");
        const meta = [p.artist, p.date ? p.date.slice(0, 10) : "", p.license].filter(Boolean).join(" · ");
        const linkHtml = p.source ? ` <a href="${p.source}" target="_blank" rel="noopener">Source link ↗</a>` : "";
        li.innerHTML = `<strong>${p.place} — ${p.title}:</strong> ${meta}.${linkHtml}`;
        list.appendChild(li);
      });
    }
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      width = window.innerWidth;
      height = window.innerHeight;
      elevBuilt = false;
      initMap();
      applyStep(currentStepId, currentStepIndex);
    }, 180);
  });

  // =========================================================================
  // 10. BOOT
  // =========================================================================
  buildNarrative();
  initMap();
  setupObservers();
  setupPhotos();
  applyStep(STEPS[0].id, 0);
  requestAnimationFrame(animateBoatLoop);
})();
