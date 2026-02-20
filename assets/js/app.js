import { PLANETS, RELATIONSHIP_STYLES } from "./config.js";

const nav = document.getElementById("nav");
const app = document.getElementById("app");

const planetDataCache = new Map();

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

function setNav(planet = null) {
  const planetCrumb = planet
    ? `<a href="#/planet?planet=${encodeURIComponent(planet.id)}">${planet.label}</a>`
    : "";

  nav.innerHTML = `
    <a href="#/">Choose Planet</a>
    ${planetCrumb}
  `;
}

/* ---------- Load data ---------- */

async function ensurePlanetLoaded(planet) {
  if (!planet) return null;

  if (planetDataCache.has(planet.id)) return planetDataCache.get(planet.id);

  if (!planet.dataFile) {
    const empty = { countries: [] };
    planetDataCache.set(planet.id, empty);
    return empty;
  }

  const res = await fetch(planet.dataFile, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${planet.dataFile}: ${res.status}`);
  const json = await res.json();

  // Prefer flagPublicUrl if present (your new Column H output)
  json.countries = (json.countries || []).map(c => {
    const rawFlag =
      c.flagPublicUrl ||
      c.flagUrl ||
      c.flag ||
      c.flagLink ||
      "";

    return {
      ...c,
      flagUrl: normalizeDriveImageUrl(rawFlag),
    };
  });

  planetDataCache.set(planet.id, json);
  return json;
}

function normalizeDriveImageUrl(url) {
  if (!url) return url;
  const s = String(url).trim();

  let id = null;

  let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)\//i);
  if (m?.[1]) id = m[1];

  if (!id) {
    m = s.match(/[?&]id=([^&]+)/i);
    if (m?.[1]) id = m[1];
  }

  if (!id && /drive\.google\.com\/drive\/folders\//i.test(s)) return s;

  if (!id && /^[a-zA-Z0-9_-]{20,}$/.test(s)) id = s;

  if (!id) return s;

  return `https://drive.google.com/uc?export=view&id=${id}`;
}

/* ---------- Formatting helpers ---------- */

function fmtBillion(n) {
  if (n === null || n === undefined || n === "") return "—";
  return `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} B`;
}
function fmtDollars(n) {
  if (n === null || n === undefined || n === "") return "—";
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtPct(n) {
  if (n === null || n === undefined || n === "") return "—";
  return `${Number(n).toFixed(1)}%`;
}
function fmtSignedBillion(n) {
  if (n === null || n === undefined || n === "") return "—";
  const val = Number(n);
  const sign = val > 0 ? "+" : (val < 0 ? "−" : "");
  return `${sign}${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })} B`;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ---------- Data helpers ---------- */

function planetCountries(planetData) {
  return Array.isArray(planetData?.countries) ? planetData.countries : [];
}
function countryById(planetData, id) {
  return planetCountries(planetData).find(c => c.id === id) || null;
}
function buildRankings(planetData, key, direction = "desc") {
  const rows = planetCountries(planetData)
    .map(c => ({ id: c.id, name: c.name, value: c.indicators?.[key] }))
    .filter(r => r.value !== null && r.value !== undefined && r.value !== "");

  rows.sort((a, b) => {
    const av = Number(a.value), bv = Number(b.value);
    if (direction === "asc") return av - bv;
    return bv - av;
  });

  return rows;
}

/* ---------- Diplomacy web (SVG) ---------- */

function diplomacyWebSvg(planetData) {
  const countries = planetCountries(planetData);
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

  const seen = new Set();
  const edges = [];
  for (const a of countries) {
    const rels = a.diplomacy || {};
    for (const [bId, meta] of Object.entries(rels)) {
      if (!nodeMap.has(bId)) continue;
      const key = [a.id, bId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const relKey = meta?.key || "neutral";
      edges.push({ a: a.id, b: bId, relKey });
    }
  }

  const edgeLines = edges.map(e => {
    const A = nodeMap.get(e.a);
    const B = nodeMap.get(e.b);
    const style = RELATIONSHIP_STYLES[e.relKey] || RELATIONSHIP_STYLES.neutral;
    return `<line x1="${A.x.toFixed(2)}" y1="${A.y.toFixed(2)}" x2="${B.x.toFixed(2)}" y2="${B.y.toFixed(2)}"
      stroke="${style.color}" stroke-width="3" opacity="0.85" />`;
  }).join("");

  const nodeDots = nodes.map(n => `
    <circle class="nodeCircle" cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="18" fill="rgba(255,255,255,0.08)"></circle>
    <circle cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="12" fill="rgba(255,255,255,0.85)"></circle>
    <text class="nodeLabel" x="${n.x.toFixed(2)}" y="${(n.y + 34).toFixed(2)}" text-anchor="middle">${escapeHtml(n.name)}</text>
  `).join("");

  return `
    <div class="graphWrap">
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diplomacy web">
        ${edgeLines}
        ${nodeDots}
      </svg>
    </div>
    ${legendHtml()}
  `;
}

function legendHtml() {
  const items = Object.entries(RELATIONSHIP_STYLES).map(([, v]) =>
    `<div class="legendItem"><span class="legendSwatch" style="background:${v.color}"></span>${v.label}</div>`
  ).join("");
  return `<div class="graphLegend">${items}</div>`;
}

/* ---------- Pie chart (quantity > 0, legend names only, tooltip quantity) ---------- */

function resourcePieChartHtml(country) {
  const resList = Array.isArray(country?.resources) ? country.resources : [];
  if (!resList.length) return `<div class="small">No resource distribution available.</div>`;

  const values = resList
    .map(r => ({ name: r.name, quantity: Number(r.quantity || 0) }))
    .filter(x => x.quantity > 0);

  if (!values.length) return `<div class="small">No resources with quantity above 0.</div>`;

  const total = values.reduce((a, b) => a + b.quantity, 0);

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 100;

  const palette = ["#2563eb","#16a34a","#f59e0b","#ef4444","#8b5cf6","#0ea5e9","#22c55e","#a3a3a3","#e11d48","#14b8a6"];

  let start = -Math.PI / 2;

  const paths = values.map((v, idx) => {
    const frac = v.quantity / total;
    const end = start + frac * Math.PI * 2;
    const d = arcPath(cx, cy, radius, start, end);
    const fill = palette[idx % palette.length];
    const tooltipText = `${v.name}: ${v.quantity.toLocaleString()}`;
    start = end;
    return `<path d="${d}" fill="${fill}" data-tip="${escapeHtml(tooltipText)}"></path>`;
  }).join("");

  const legend = values.map((v, idx) => {
    const fill = palette[idx % palette.length];
    return `<div class="legendItem"><span class="legendSwatch" style="background:${fill}"></span>${escapeHtml(v.name)}</div>`;
  }).join("");

  return `
    <div class="pieWrap" id="pieWrap">
      <svg id="pieSvg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Resource pie chart">
        ${paths}
      </svg>
      <div class="pieTooltip" id="pieTooltip"></div>
      <div class="small pieHint">Hover slices to see quantities.</div>
    </div>
    <div class="graphLegend" style="margin-top:12px;">
      ${legend}
    </div>
  `;
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);

  return [
    `M ${cx} ${cy}`,
    `L ${x1.toFixed(3)} ${y1.toFixed(3)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
    "Z"
  ].join(" ");
}

function attachPieTooltipHandlers() {
  const wrap = document.getElementById("pieWrap");
  const svg = document.getElementById("pieSvg");
  const tip = document.getElementById("pieTooltip");
  if (!wrap || !svg || !tip) return;

  function showTip(e, text) {
    tip.textContent = text;
    tip.classList.add("show");

    const wrapRect = wrap.getBoundingClientRect();
    const x = e.clientX - wrapRect.left;
    const y = e.clientY - wrapRect.top;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }

  function hideTip() {
    tip.classList.remove("show");
  }

  svg.addEventListener("mousemove", (e) => {
    const t = e.target;
    if (t && t.tagName === "path" && t.dataset && t.dataset.tip) showTip(e, t.dataset.tip);
    else hideTip();
  });

  svg.addEventListener("mouseleave", hideTip);
}

/* ---------- Views ---------- */

function viewChoosePlanet() {
  const buttons = PLANETS.map(p =>
    `<button onclick="location.hash='#/planet?planet=${encodeURIComponent(p.id)}'">${p.label}</button>`
  ).join("");

  return `
    <section class="card">
      <h2 class="heroTitle">Choose a Planet</h2>
      <p class="small">TEST is loaded from JSON. After copying flags to Column H, regenerate JSON to use the new public URLs.</p>
      <div class="buttonRow">${buttons}</div>
    </section>
  `;
}

function rankingsPanelsHtml(planetData) {
  const blocks = [
    { key: "rGDP", label: "Real GDP (rGDP, $B)", fmt: fmtBillion, dir: "desc" },
    { key: "rGDPpc", label: "Real GDP per Capita ($)", fmt: fmtDollars, dir: "desc" },
    { key: "unemployment", label: "Unemployment Rate (%)", fmt: fmtPct, dir: "asc" },
    { key: "inflation", label: "Inflation Rate (%)", fmt: fmtPct, dir: "asc" },
    { key: "tradeBalance", label: "Trade Balance ($B)", fmt: fmtSignedBillion, dir: "desc" },
  ];

  const panels = blocks.map(b => {
    const rows = buildRankings(planetData, b.key, b.dir);
    const tableRows = rows.length
      ? rows.map((r, i) => `
          <tr>
            <td class="num">${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td class="num">${b.fmt(r.value)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="3" class="small">No data yet for this indicator.</td></tr>`;

    return `
      <div class="card" style="box-shadow:none; border:1px solid #eee;">
        <h4 style="margin:0 0 10px 0;">${escapeHtml(b.label)}</h4>
        <table class="table">
          <thead><tr><th class="num">#</th><th>Country</th><th class="num">Value</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  }).join("");

  return `<div class="grid2">${panels}</div>`;
}

function viewPlanet(planet, planetData) {
  const countries = planetCountries(planetData);

  const countryLinks = countries.length
    ? countries.map(c => {
        const href = `#/country?planet=${encodeURIComponent(planet.id)}&country=${encodeURIComponent(c.id)}`;
        return `<li><a class="inline" href="${href}">${escapeHtml(c.name)}</a></li>`;
      }).join("")
    : `<li class="small">No data yet.</li>`;

  return `
    <section class="card">
      <div class="hstack" style="justify-content:space-between;">
        <div>
          <h2 class="heroTitle">${planet.label}</h2>
          <div class="small">Planet ID: <span class="badge">${planet.id}</span></div>
        </div>
        <div class="buttonRow">
          <button onclick="location.hash='#/'">Change Planet</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Diplomacy Web</h3>
      ${diplomacyWebSvg(planetData)}
    </section>

    <section class="card">
      <h3 class="sectionTitle">Countries</h3>
      <ul>${countryLinks}</ul>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Rankings</h3>
      <p class="small">Each ranking lists the country and the value for the indicator.</p>
      ${rankingsPanelsHtml(planetData)}
    </section>
  `;
}

function planetCountries(planetData) {
  return Array.isArray(planetData?.countries) ? planetData.countries : [];
}

function diplomacyTableRows(planetData, country) {
  const rels = country.diplomacy || {};
  const rows = Object.entries(rels).map(([targetId, meta]) => {
    const target = countryById(planetData, targetId);
    const relKey = meta?.key || "neutral";
    const style = RELATIONSHIP_STYLES[relKey] || RELATIONSHIP_STYLES.neutral;
    const partnerName = target ? target.name : targetId;

    const label = meta?.relationship || style.label;
    const status = meta?.status ? ` <span class="small">(${escapeHtml(meta.status)})</span>` : "";

    return `<tr>
      <td>${escapeHtml(partnerName)}</td>
      <td><span class="badge" style="background:${style.color}; color:#fff;">${escapeHtml(label)}</span>${status}</td>
    </tr>`;
  }).join("");

  return rows || `<tr><td colspan="2" class="small">No diplomacy data available yet.</td></tr>`;
}

function viewCountry(planet, planetData, country) {
  if (!country) {
    return `
      <section class="card">
        <h2>Country not found</h2>
        <p class="small">That country ID does not exist for this planet (yet).</p>
        <p><a class="inline" href="#/planet?planet=${encodeURIComponent(planet.id)}">Back to ${planet.label}</a></p>
      </section>
    `;
  }

  const ind = country.indicators || {};

  const resourcesRows = (country.resources || [])
    .map(r => {
      const qty = (r.quantity !== null && r.quantity !== undefined) ? Number(r.quantity) : null;
      const qtyCell = (qty !== null && !Number.isNaN(qty)) ? qty.toLocaleString() : "—";
      return `<tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.type)}</td>
        <td class="num">${(Number(r.share) || 0).toFixed(1)}%</td>
        <td class="num">${qtyCell}</td>
      </tr>`;
    })
    .join("") || `<tr><td colspan="4" class="small">No resources available yet.</td></tr>`;

  return `
    <section class="card">
      <div class="hstack" style="justify-content:space-between;">
        <div class="hstack">
          <img class="flag"
               src="${country.flagUrl || ""}"
               alt="Flag of ${escapeHtml(country.name)}"
               onerror="this.style.display='none'; document.getElementById('flagError').style.display='block';" />
          <div>
            <h2 class="heroTitle" style="margin-bottom:4px;">${escapeHtml(country.name)}</h2>
            <div class="small"><span class="badge">${planet.label}</span> • Demonym: <strong>${escapeHtml(country.demonym || "—")}</strong></div>
            <div class="small">Motto: <em>${escapeHtml(country.motto || "—")}</em></div>
          </div>
        </div>
        <div class="buttonRow">
          <button onclick="location.hash='#/planet?planet=${encodeURIComponent(planet.id)}'">Back to ${planet.label}</button>
        </div>
      </div>

      <div id="flagError" style="display:none; margin-top:10px;">
        <p class="small">
          <strong>Flag didn’t load.</strong> Once your Column H has the copied public URL,
          regenerate your JSON to include <code>flagPublicUrl</code> and the site will use it automatically.
        </p>
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Key Indicators</h3>
      <table class="table">
        <tbody>
          <tr><th>Real GDP (rGDP)</th><td class="num">${fmtBillion(ind.rGDP)}</td></tr>
          <tr><th>Real GDP per Capita</th><td class="num">${fmtDollars(ind.rGDPpc)}</td></tr>
          <tr><th>Unemployment Rate</th><td class="num">${fmtPct(ind.unemployment)}</td></tr>
          <tr><th>Inflation Rate</th><td class="num">${fmtPct(ind.inflation)}</td></tr>
          <tr><th>Trade Balance</th><td class="num">${fmtSignedBillion(ind.tradeBalance)}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Resource Distribution</h3>
      <div class="hstack" style="align-items:flex-start;">
        <div>
          ${resourcePieChartHtml(country)}
        </div>
        <div style="flex:1; min-width: 280px;">
          <table class="table">
            <thead><tr><th>Resource</th><th>Type</th><th class="num">Share</th><th class="num">Quantity</th></tr></thead>
            <tbody>${resourcesRows}</tbody>
          </table>
        </div>
      </div>
      <p class="small">Pie chart includes only resources with quantity above 0. Hover slices to see quantities.</p>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Diplomatic Relationships</h3>
      <table class="table">
        <thead><tr><th>Partner</th><th>Relationship</th></tr></thead>
        <tbody>${diplomacyTableRows(planetData, country)}</tbody>
      </table>
    </section>
  `;
}

/* ---------- Router (async) ---------- */

async function render() {
  const { path, params } = parseRoute();

  if (path === "/" || path === "") {
    setNav(null);
    app.innerHTML = viewChoosePlanet();
    return;
  }

  if (path === "/planet") {
    const planetParam = params.get("planet");
    const planet = findPlanet(planetParam) || getDefaultPlanet();
    setNav(planet);

    app.innerHTML = `<section class="card"><h2 class="heroTitle">Loading ${planet.label}…</h2><p class="small">Fetching planet data.</p></section>`;
    const planetData = await ensurePlanetLoaded(planet);

    app.innerHTML = viewPlanet(planet, planetData);
    return;
  }

  if (path === "/country") {
    const planetParam = params.get("planet");
    const countryId = params.get("country");
    const planet = findPlanet(planetParam) || getDefaultPlanet();
    setNav(planet);

    app.innerHTML = `<section class="card"><h2 class="heroTitle">Loading ${planet.label}…</h2><p class="small">Fetching planet data.</p></section>`;
    const planetData = await ensurePlanetLoaded(planet);

    const country = countryById(planetData, countryId);
    app.innerHTML = viewCountry(planet, planetData, country);

    attachPieTooltipHandlers();
    return;
  }

  setNav(null);
  app.innerHTML = viewChoosePlanet();
}

window.addEventListener("hashchange", () => { render().catch(err => showError(err)); });
render().catch(err => showError(err));

function showError(err) {
  console.error(err);
  app.innerHTML = `
    <section class="card">
      <h2>Load error</h2>
      <p class="small">${escapeHtml(err?.message || String(err))}</p>
      <p><a class="inline" href="#/">Back to Choose Planet</a></p>
    </section>
  `;
}
