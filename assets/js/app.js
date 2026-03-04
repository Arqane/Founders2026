// assets/js/app.js
import { API_BASE, PLANETS, RELATIONSHIP_STYLES } from "./config.js";

const nav = document.getElementById("nav");
const app = document.getElementById("app");

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseRoute() {
  const hash = window.location.hash || "#/";
  const [pathPart, queryPart] = hash.slice(1).split("?");
  const path = pathPart || "/";
  const params = new URLSearchParams(queryPart || "");
  return { path, params };
}

function findPlanet(planetIdOrLabel) {
  if (!planetIdOrLabel) return null;
  const key = planetIdOrLabel.toLowerCase();
  return PLANETS.find(p => p.id === key) || PLANETS.find(p => p.label.toLowerCase() === key) || null;
}

function getDefaultPlanet() {
  return PLANETS.find(p => p.id === "test") || PLANETS[0] || null;
}

function setNav(planet = null, active = "overview") {
  const planetCrumb = planet
    ? `<a href="#/planet?planet=${encodeURIComponent(planet.id)}">${planet.label}</a>`
    : "";

  const tabs = planet ? `
    <span class="navTabs">
      <a class="navTab ${active==="overview"?"active":""}" href="#/planet?planet=${encodeURIComponent(planet.id)}">Overview</a>
      <a class="navTab ${active==="trade"?"active":""}" href="#/trade?planet=${encodeURIComponent(planet.id)}">Trade</a>
      <a class="navTab ${active==="resources"?"active":""}" href="#/resources?planet=${encodeURIComponent(planet.id)}">Resources</a>
    </span>
  ` : "";

  nav.innerHTML = `
    <a href="#/">Choose Planet</a>
    ${planetCrumb}
    ${tabs}
  `;
}

/* ---------- API ---------- */

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchApiHealth() {
  return fetchJson(`${API_BASE}?nocache=1`);
}

async function fetchPlanetOverview(planetId) {
  return fetchJson(`${API_BASE}?view=planet&planet=${encodeURIComponent(planetId)}&nocache=1`);
}

async function fetchPlanetTrade(planetId) {
  return fetchJson(`${API_BASE}?view=trade&planet=${encodeURIComponent(planetId)}&nocache=1`);
}

async function fetchPlanetResources(planetId) {
  return fetchJson(`${API_BASE}?view=resources&planet=${encodeURIComponent(planetId)}&nocache=1`);
}

/* ---------- Formatting ---------- */

// Always return non-wrapping money for tables.
function fmtUsdB(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}B`;
}

function fmtUsd(n, digits = 0) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}

function fmtPct(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtNum(n, digits = 0) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

/* ---------- Diplomacy Web + Tooltip + Focus ---------- */

function legendHtml() {
  const items = Object.entries(RELATIONSHIP_STYLES).map(([, v]) =>
    `<div class="legendItem"><span class="legendSwatch" style="background:${v.color}"></span>${v.label}</div>`
  ).join("");
  return `<div class="graphLegend">${items}</div>`;
}

function edgeTooltipText(edge) {
  const aName = String(edge?.aName || edge?.aId || "").trim();
  const bName = String(edge?.bName || edge?.bId || "").trim();
  const rel = String(edge?.relationship || "").trim();
  const st = String(edge?.status || "").trim();

  const line1 = (aName && bName) ? `${aName} → ${bName}` : "";
  const line2 = rel ? (st ? `${rel} (${st})` : rel) : (st ? st : "");

  if (line1 && line2) return `${line1}\n${line2}`;
  return line1 || line2 || "";
}

function diplomacyWebSvgFromEdges(countries, edges) {
  const n = countries.length;
  if (n < 2) return `<div class="small">No diplomacy data yet for this planet.</div>`;

  const W = 900;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) * 0.36;

  const nodes = countries.map((c, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { ...c, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const edgeLines = (edges || []).map(e => {
    const A = nodeMap.get(e.aId);
    const B = nodeMap.get(e.bId);
    if (!A || !B) return "";
    const style = RELATIONSHIP_STYLES[e.key] || RELATIONSHIP_STYLES.neutral;

    const tip = edgeTooltipText(e);
    const tipAttr = tip ? `data-tip="${escapeHtml(tip)}"` : "";

    return `<line class="dipEdge" ${tipAttr}
      data-aid="${escapeHtml(e.aId)}" data-bid="${escapeHtml(e.bId)}"
      x1="${A.x.toFixed(2)}" y1="${A.y.toFixed(2)}"
      x2="${B.x.toFixed(2)}" y2="${B.y.toFixed(2)}"
      stroke="${style.color}" stroke-width="3" opacity="0.85" />`;
  }).join("");

  const nodeGroups = nodes.map(n => `
    <g class="dipNode" data-id="${escapeHtml(n.id)}">
      <circle class="nodeCircle" cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="18" fill="rgba(255,255,255,0.08)"></circle>
      <circle class="nodeDot" cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="12" fill="rgba(255,255,255,0.85)"></circle>
      <text class="nodeLabel" x="${n.x.toFixed(2)}" y="${(n.y + 34).toFixed(2)}" text-anchor="middle">${escapeHtml(n.name)}</text>
    </g>
  `).join("");

  return `
    <div class="graphWrap" id="dipWrap">
      <svg id="dipSvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diplomacy web">
        ${edgeLines}
        ${nodeGroups}
      </svg>
      <div class="dipTooltip" id="dipTooltip"></div>
    </div>
    ${legendHtml()}
  `;
}

function attachDiplomacyTooltipHandlers() {
  const wrap = document.getElementById("dipWrap");
  const svg = document.getElementById("dipSvg");
  const tip = document.getElementById("dipTooltip");
  if (!wrap || !svg || !tip) return;

  function showTip(e, text) {
    tip.innerHTML = escapeHtml(text).replaceAll("\n", "<br/>");
    tip.classList.add("show");
    const rect = wrap.getBoundingClientRect();
    tip.style.left = `${e.clientX - rect.left}px`;
    tip.style.top = `${e.clientY - rect.top}px`;
  }

  function hideTip() { tip.classList.remove("show"); }

  svg.addEventListener("mousemove", (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("dipEdge") && t.dataset?.tip) {
      showTip(e, t.dataset.tip);
    } else {
      hideTip();
    }
  });

  svg.addEventListener("mouseleave", hideTip);
}

function attachDiplomacyFocusHandlers() {
  const svg = document.getElementById("dipSvg");
  if (!svg) return;

  let focusedId = null;

  function applyFocus() {
    const edges = Array.from(svg.querySelectorAll(".dipEdge"));
    const nodes = Array.from(svg.querySelectorAll(".dipNode"));

    if (!focusedId) {
      edges.forEach(el => el.classList.remove("dim"));
      nodes.forEach(el => el.classList.remove("dim", "focused"));
      return;
    }

    const neighbors = new Set([focusedId]);
    edges.forEach(el => {
      const a = el.dataset.aid;
      const b = el.dataset.bid;
      if (a === focusedId) neighbors.add(b);
      if (b === focusedId) neighbors.add(a);
    });

    edges.forEach(el => {
      const a = el.dataset.aid;
      const b = el.dataset.bid;
      el.classList.toggle("dim", !(a === focusedId || b === focusedId));
    });

    nodes.forEach(el => {
      const id = el.dataset.id;
      const keep = neighbors.has(id);
      el.classList.toggle("dim", !keep);
      el.classList.toggle("focused", id === focusedId);
    });
  }

  svg.addEventListener("click", (e) => {
    const g = e.target?.closest?.(".dipNode");
    if (!g) return;
    const id = g.dataset.id;
    focusedId = (focusedId === id) ? null : id;
    applyFocus();
  });
}

/* ---------- Tables ---------- */

function rankingsTable(title, rows, fmtFn) {
  const body = rows?.length
    ? rows.slice(0, 20).map((r, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${escapeHtml(r.name)}</td>
          <td class="num">${fmtFn(r.value)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="3" class="small">No data.</td></tr>`;

  return `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <h4 style="margin:0 0 10px 0;">${escapeHtml(title)}</h4>
      <table class="table">
        <thead><tr><th class="num">#</th><th>Country</th><th class="num">Value</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function listTable(title, rows, fmtFn) {
  const body = rows?.length
    ? rows.slice(0, 40).map((r) => `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td class="num">${fmtFn(r.value)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="2" class="small">No data.</td></tr>`;

  return `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <h4 style="margin:0 0 10px 0;">${escapeHtml(title)}</h4>
      <table class="table">
        <thead><tr><th>Country</th><th class="num">Value</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

/* ---------- Trade visualization (Top-N bar charts) ---------- */

function topN(items, key, n = 10) {
  const list = (items || [])
    .map(x => ({ ...x, _v: Number(x[key]) }))
    .filter(x => Number.isFinite(x._v))
    .sort((a, b) => b._v - a._v)
    .slice(0, n);
  return list;
}

function barChartHtml(title, items, key, fmtFn) {
  const top = topN(items, key, 10);
  if (!top.length) return `<div class="small">No data for ${escapeHtml(title)}.</div>`;

  const max = Math.max(...top.map(x => x._v), 1);

  const rows = top.map(x => {
    const pct = Math.max(0, Math.min(100, (x._v / max) * 100));
    return `
      <div class="barRow">
        <div class="small">${escapeHtml(x.name)}</div>
        <div class="barTrack"><div class="barFill" style="width:${pct.toFixed(1)}%"></div></div>
        <div class="small num">${fmtFn(x._v)}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <h4 style="margin:0 0 10px 0;">${escapeHtml(title)}</h4>
      <div class="barChart">${rows}</div>
    </div>
  `;
}

/* ---------- Resources Pie (SVG with VALUE labels) ---------- */

function pieSvg(breakdown, title) {
  const data = (breakdown || []).filter(x => Number(x.value) > 0);
  const total = data.reduce((s, x) => s + Number(x.value || 0), 0);
  if (!data.length || total <= 0) return `<div class="small">No countries possess this resource (or all values are 0).</div>`;

  const W = 520, H = 360;
  const cx = 180, cy = 180, r = 120;

  function colorFor(i, n) {
    const hue = Math.round((360 * i) / Math.max(1, n));
    return `hsl(${hue} 70% 55%)`;
  }

  let start = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const v = Number(d.value);
    const ang = (v / total) * Math.PI * 2;
    const end = start + ang;

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = ang > Math.PI ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;

    const mid = (start + end) / 2;
    const lx = cx + (r + 24) * Math.cos(mid);
    const ly = cy + (r + 24) * Math.sin(mid);

    const label = `${escapeHtml(d.name)}: ${fmtNum(v, 0)}`;

    start = end;
    return { path, fill: colorFor(i, data.length), label, lx, ly };
  });

  return `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <h4 style="margin:0 0 10px 0;">${escapeHtml(title)}</h4>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Resource pie chart">
        ${slices.map(s => `<path d="${s.path}" fill="${s.fill}" opacity="0.95"></path>`).join("")}
        ${slices.map(s => `<text x="${s.lx}" y="${s.ly}" font-size="11" text-anchor="middle">${escapeHtml(s.label)}</text>`).join("")}
      </svg>
    </div>
  `;
}

/* ---------- Views ---------- */

function viewChoosePlanetSkeleton() {
  const buttons = PLANETS.map(p =>
    `<button onclick="location.hash='#/planet?planet=${encodeURIComponent(p.id)}'">${p.label}</button>`
  ).join("");

  return `
    <section class="card">
      <h2 class="heroTitle">Choose a Planet</h2>
      <p class="small">Connecting to live data…</p>
      <div class="buttonRow">${buttons}</div>
      <div id="apiStatus" style="margin-top:14px;"></div>
    </section>
  `;
}

function renderApiStatusOk(payload) {
  const planets = Array.isArray(payload?.availablePlanets) ? payload.availablePlanets : [];
  return `
    <div class="card" style="box-shadow:none; border:1px solid #e5e7eb;">
      <h3 style="margin:0 0 6px 0;">Live data connected ✅</h3>
      <div class="small">Project: <strong>${escapeHtml(payload.project || "—")}</strong></div>
      <div class="small">Build: <code>${escapeHtml(payload.build || "—")}</code></div>
      <div class="small">Timestamp: ${escapeHtml(payload.timestamp || "—")}</div>
      <div class="small">Planets: ${escapeHtml(planets.join(", ") || "—")}</div>
    </div>
  `;
}

function renderApiStatusFail(err) {
  return `
    <div class="card" style="box-shadow:none; border:1px solid #ef4444;">
      <h3 style="margin:0 0 6px 0;">Live data NOT connected ❌</h3>
      <div class="small">API_BASE:</div>
      <div class="small"><code>${escapeHtml(API_BASE)}</code></div>
      <div class="small" style="margin-top:10px;"><strong>Error:</strong> ${escapeHtml(err?.message || String(err))}</div>
    </div>
  `;
}

function planetHeader(planet, payload) {
  return `
    <section class="card">
      <div class="hstack" style="justify-content:space-between;">
        <div>
          <h2 class="heroTitle">${escapeHtml(planet.label)}</h2>
          <div class="small">Live from API • ${escapeHtml(payload.yearTokenDisplay || "")} • ${escapeHtml(payload.yearSheet || "")}</div>
          <div class="small" style="margin-top:6px;">
            SheetId: <code>${escapeHtml(payload.spreadsheetId || "—")}</code>
          </div>
          <div class="small" style="margin-top:6px;">Tip: click a country node to highlight only its connections. Click again to reset.</div>
        </div>
        <div class="buttonRow">
          <button onclick="location.hash='#/'">Change Planet</button>
        </div>
      </div>
    </section>
  `;
}

function diplomacySectionFromPayload(payload) {
  const countries = Array.isArray(payload?.countries) ? payload.countries : [];
  const edges = payload?.diplomacy?.edges || [];
  return `
    <section class="card">
      <h3 class="sectionTitle">Diplomacy Web</h3>
      <p class="small">Hover a line to see: Source → Target + relationship type.</p>
      ${diplomacyWebSvgFromEdges(countries, edges)}
    </section>
  `;
}

function viewPlanetOverview(planet, payload) {
  const r = payload?.rankings || {};
  return `
    ${planetHeader(planet, payload)}
    ${diplomacySectionFromPayload(payload)}

    <section class="card">
      <h3 class="sectionTitle">Current-Year Rankings</h3>
      <div class="grid2">
        ${rankingsTable("Real GDP", r.rGDP, fmtUsdB)}
        ${rankingsTable("Real GDP per Capita", r.rGDPpc, (n) => fmtUsd(n, 0))}
        ${rankingsTable("Real GDP Growth Rate", r.rGDPGrowth, fmtPct)}
        ${rankingsTable("Unemployment Rate", r.unemployment, fmtPct)}
        ${rankingsTable("Inflation Rate", r.inflation, fmtPct)}
        ${rankingsTable("Budget Deficit/Surplus", r.budgetDeficit, fmtUsdB)}
        ${rankingsTable("National Debt/Fund", r.nationalDebt, fmtUsdB)}
        ${rankingsTable("Federal Funds Rate", r.fedFundsRate, fmtPct)}
        ${rankingsTable("Total Population", r.population, (n) => fmtNum(n, 0))}
        ${listTable("Economic System", r.economicSystem, (v) => escapeHtml(v))}
      </div>
    </section>
  `;
}

function viewTrade(planet, overviewPayload, tradePayload) {
  const items = tradePayload?.trade?.items || [];

  const body = items.length ? items.map(x => `
    <tr>
      <td>${escapeHtml(x.name)}</td>
      <td class="num">${fmtUsd(x.frequency, 0)}</td>
      <td class="num">${fmtUsd(x.volume, 0)}</td>
      <td class="num">${fmtUsdB(x.exportValue)}</td>
      <td class="num">${fmtUsdB(x.importValue)}</td>
    </tr>
  `).join("") : `<tr><td colspan="5" class="small">No trade data.</td></tr>`;

  return `
    ${planetHeader(planet, tradePayload)}
    ${diplomacySectionFromPayload(overviewPayload)}

    <section class="card">
      <h3 class="sectionTitle">Trade Overview</h3>
      <p class="small">Visualization (top 10 per metric).</p>
      <div class="grid2">
        ${barChartHtml("Trade Frequency (Top 10)", items, "frequency", (v) => fmtUsd(v, 0))}
        ${barChartHtml("Trade Volume (Top 10)", items, "volume", (v) => fmtUsd(v, 0))}
        ${barChartHtml("Export Value ($B, Top 10)", items, "exportValue", fmtUsdB)}
        ${barChartHtml("Import Value ($B, Top 10)", items, "importValue", fmtUsdB)}
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Trade Table</h3>
      <p class="small">From the Trade tab, row 18.</p>
      <table class="table">
        <thead>
          <tr>
            <th>Country</th>
            <th class="num">$ Frequency</th>
            <th class="num">$ Volume</th>
            <th class="num">$ Export Value (B)</th>
            <th class="num">$ Import Value (B)</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `;
}

function viewResources(planet, overviewPayload, resPayload) {
  const worldTotals = resPayload?.resources?.worldTotals || [];
  const breakdownByResource = resPayload?.resources?.breakdownByResource || {};
  const resources = worldTotals.map(x => x.resource);
  const options = resources.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");

  return `
    ${planetHeader(planet, resPayload)}
    ${diplomacySectionFromPayload(overviewPayload)}

    <section class="card">
      <h3 class="sectionTitle">Resources</h3>
      <div class="hstack" style="gap:12px; align-items:center;">
        <div class="small"><strong>Select a resource:</strong></div>
        <select id="resSelect">${options}</select>
      </div>

      <div id="resTotals" class="small" style="margin-top:10px;"></div>
      <div id="resPie" style="margin-top:12px;"></div>
    </section>
  `;
}

function attachResourcesHandlers(payload) {
  const sel = document.getElementById("resSelect");
  const totalsEl = document.getElementById("resTotals");
  const pieEl = document.getElementById("resPie");
  if (!sel || !totalsEl || !pieEl) return;

  const worldTotals = payload?.resources?.worldTotals || [];
  const breakdownByResource = payload?.resources?.breakdownByResource || {};
  const totalMap = new Map(worldTotals.map(x => [x.resource, x.total]));

  function render(resource) {
    const total = totalMap.get(resource);
    totalsEl.innerHTML = `World total: <strong>${fmtNum(total, 0)}</strong>`;
    const breakdown = breakdownByResource[resource] || [];
    pieEl.innerHTML = pieSvg(breakdown, `${resource} holdings by country (labels show values)`);
  }

  render(sel.value);
  sel.addEventListener("change", () => render(sel.value));
}

function viewLoading(msg) {
  return `<section class="card"><h2 class="heroTitle">${escapeHtml(msg)}</h2><p class="small">Loading…</p></section>`;
}

function viewError(err) {
  return `
    <section class="card">
      <h2>Page error</h2>
      <p class="small">${escapeHtml(err?.message || String(err))}</p>
      <p><a class="inline" href="#/">Back</a></p>
    </section>
  `;
}

/* ---------- Router ---------- */

async function render() {
  const { path, params } = parseRoute();
  if (!nav || !app) return;

  if (path === "/" || path === "") {
    setNav(null);
    app.innerHTML = viewChoosePlanetSkeleton();
    const statusEl = document.getElementById("apiStatus");
    try {
      const payload = await fetchApiHealth();
      statusEl.innerHTML = renderApiStatusOk(payload);
    } catch (err) {
      statusEl.innerHTML = renderApiStatusFail(err);
      console.error(err);
    }
    return;
  }

  if (path === "/planet") {
    const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
    setNav(planet, "overview");
    app.innerHTML = viewLoading(`Loading ${planet.label}`);
    try {
      const payload = await fetchPlanetOverview(planet.id);
      if (!payload?.ok) throw new Error(payload?.error || "API returned ok=false");
      app.innerHTML = viewPlanetOverview(planet, payload);
      attachDiplomacyTooltipHandlers();
      attachDiplomacyFocusHandlers();
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  if (path === "/trade") {
    const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
    setNav(planet, "trade");
    app.innerHTML = viewLoading(`Loading Trade • ${planet.label}`);
    try {
      // Need overview for diplomacy web + trade payload for table/viz
      const [overviewPayload, tradePayload] = await Promise.all([
        fetchPlanetOverview(planet.id),
        fetchPlanetTrade(planet.id),
      ]);
      if (!overviewPayload?.ok) throw new Error(overviewPayload?.error || "Overview ok=false");
      if (!tradePayload?.ok) throw new Error(tradePayload?.error || "Trade ok=false");

      app.innerHTML = viewTrade(planet, overviewPayload, tradePayload);
      attachDiplomacyTooltipHandlers();
      attachDiplomacyFocusHandlers();
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  if (path === "/resources") {
    const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
    setNav(planet, "resources");
    app.innerHTML = viewLoading(`Loading Resources • ${planet.label}`);
    try {
      const [overviewPayload, resPayload] = await Promise.all([
        fetchPlanetOverview(planet.id),
        fetchPlanetResources(planet.id),
      ]);
      if (!overviewPayload?.ok) throw new Error(overviewPayload?.error || "Overview ok=false");
      if (!resPayload?.ok) throw new Error(resPayload?.error || "Resources ok=false");

      app.innerHTML = viewResources(planet, overviewPayload, resPayload);
      attachDiplomacyTooltipHandlers();
      attachDiplomacyFocusHandlers();
      attachResourcesHandlers(resPayload);
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  // Country profiles later
  if (path === "/country") {
    const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
    setNav(planet, "overview");
    app.innerHTML = `
      <section class="card">
        <h2 class="heroTitle">Country profile (coming later)</h2>
        <p class="small">We’ll build profiles after Overview/Trade/Resources are done.</p>
        <p><a class="inline" href="#/planet?planet=${encodeURIComponent(planet.id)}">Back to planet</a></p>
      </section>
    `;
    return;
  }

  setNav(null);
  app.innerHTML = viewChoosePlanetSkeleton();
}

window.addEventListener("hashchange", () => render());
render();
