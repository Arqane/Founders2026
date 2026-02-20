import { PLANETS, RELATIONSHIP_STYLES } from "./config.js";

const nav = document.getElementById("nav");
const app = document.getElementById("app");

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
  // Navigation begins with planet choice (per your spec)
  const planetCrumb = planet
    ? `<a href="#/planet?planet=${encodeURIComponent(planet.id)}">${planet.label}</a>`
    : "";

  nav.innerHTML = `
    <a href="#/">Choose Planet</a>
    ${planetCrumb}
  `;
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

/* ---------- Data helpers ---------- */

function planetCountries(planet) {
  // If no data yet (real planets), return empty array
  return Array.isArray(planet?.countries) ? planet.countries : [];
}

function countryById(planet, id) {
  return planetCountries(planet).find(c => c.id === id) || null;
}

function buildRankings(planet, key, direction = "desc") {
  const countries = planetCountries(planet);
  const rows = countries
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

function diplomacyWebSvg(planet) {
  const countries = planetCountries(planet);
  const n = countries.length;

  if (n < 2) {
    return `<div class="small">No diplomacy data yet for this planet.</div>`;
  }

  // layout
  const W = 900;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) * 0.36;

  const nodes = countries.map((c, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      ...c,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Build undirected unique edges (avoid double drawing)
  const seen = new Set();
  const edges = [];
  for (const a of countries) {
    const rels = a.diplomacy || {};
    for (const [bId, rel] of Object.entries(rels)) {
      if (!nodeMap.has(bId)) continue;
      const key = [a.id, bId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: a.id, b: bId, rel });
    }
  }

  const edgeLines = edges.map(e => {
    const A = nodeMap.get(e.a);
    const B = nodeMap.get(e.b);
    const style = RELATIONSHIP_STYLES[e.rel] || { color: "#a3a3a3" };
    return `<line x1="${A.x.toFixed(2)}" y1="${A.y.toFixed(2)}" x2="${B.x.toFixed(2)}" y2="${B.y.toFixed(2)}" stroke="${style.color}" stroke-width="3" opacity="0.85" />`;
  }).join("");

  const nodeDots = nodes.map(n => {
    return `
      <circle class="nodeCircle" cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="18" fill="rgba(255,255,255,0.08)"></circle>
      <circle cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="12" fill="rgba(255,255,255,0.85)"></circle>
      <text class="nodeLabel" x="${n.x.toFixed(2)}" y="${(n.y + 34).toFixed(2)}" text-anchor="middle">${escapeHtml(n.name)}</text>
    `;
  }).join("");

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
  const items = Object.entries(RELATIONSHIP_STYLES).map(([k, v]) => {
    return `<div class="legendItem"><span class="legendSwatch" style="background:${v.color}"></span>${v.label}</div>`;
  }).join("");
  return `<div class="graphLegend">${items}</div>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ---------- Views ---------- */

function viewChoosePlanet() {
  const buttons = PLANETS.map(p =>
    `<button onclick="location.hash='#/planet?planet=${encodeURIComponent(p.id)}'">${p.label}</button>`
  ).join("");

  return `
    <section class="card">
      <h2 class="heroTitle">Choose a Planet</h2>
      <p class="small">Navigation begins with planet selection. TEST is fully populated right now; the others will be wired after.</p>
      <div class="buttonRow">${buttons}</div>
    </section>
  `;
}

function viewPlanet(planet) {
  const countries = planetCountries(planet);

  const countryLinks = countries.length
    ? countries.map(c => {
        const href = `#/country?planet=${encodeURIComponent(planet.id)}&country=${encodeURIComponent(c.id)}`;
        return `<li><a class="inline" href="${href}">${escapeHtml(c.name)}</a></li>`;
      }).join("")
    : `<li class="small">No data yet. This planet will populate after TEST integration is done.</li>`;

  const rankings = rankingsPanelsHtml(planet);

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
      ${diplomacyWebSvg(planet)}
    </section>

    <section class="card">
      <h3 class="sectionTitle">Countries</h3>
      <ul>${countryLinks}</ul>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Rankings</h3>
      <p class="small">Each ranking lists the country and the value for the indicator.</p>
      ${rankings}
    </section>
  `;
}

function rankingsPanelsHtml(planet) {
  const blocks = [
    { key: "rGDP", label: "Real GDP (rGDP, $B)", fmt: fmtBillion, dir: "desc" },
    { key: "rGDPpc", label: "Real GDP per Capita ($)", fmt: fmtDollars, dir: "desc" },
    { key: "unemployment", label: "Unemployment Rate (%)", fmt: fmtPct, dir: "asc" },
    { key: "inflation", label: "Inflation Rate (%)", fmt: fmtPct, dir: "asc" },
    { key: "tradeBalance", label: "Trade Balance ($B)", fmt: fmtSignedBillion, dir: "desc" },
  ];

  const panels = blocks.map(b => {
    const rows = buildRankings(planet, b.key, b.dir);
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
          <thead>
            <tr><th class="num">#</th><th>Country</th><th class="num">Value</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  }).join("");

  return `<div class="grid2">${panels}</div>`;
}

function viewCountry(planet, country) {
  if (!country) {
    return `
      <section class="card">
        <h2>Country not found</h2>
        <p class="small">That country ID does not exist for this planet (yet).</p>
        <p><a class="inline" href="#/planet?planet=${encodeURIComponent(planet.id)}">Back to ${planet.label}</a></p>
      </section>
    `;
  }

  const resourcesRows = (country.resources || [])
    .map(r => `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.type)}</td><td class="num">${Number(r.share).toFixed(0)}%</td></tr>`)
    .join("") || `<tr><td colspan="3" class="small">No resources available yet.</td></tr>`;

  const diplomacyRows = diplomacyTableRows(planet, country);

  const ind = country.indicators || {};
  return `
    <section class="card">
      <div class="hstack" style="justify-content:space-between;">
        <div class="hstack">
          <img class="flag" src="${country.flagUrl}" alt="Flag of ${escapeHtml(country.name)}" />
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
      <p class="small">We’ll expand this list as we map more columns from your Data Log sheets.</p>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Resource Distribution</h3>
      <table class="table">
        <thead><tr><th>Resource</th><th>Type</th><th class="num">Share</th></tr></thead>
        <tbody>${resourcesRows}</tbody>
      </table>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Diplomatic Relationships</h3>
      <table class="table">
        <thead><tr><th>Partner</th><th>Relationship</th></tr></thead>
        <tbody>${diplomacyRows}</tbody>
      </table>
      <p class="small">Later this will reflect the live diplomacy matrix from your collector data.</p>
    </section>
  `;
}

function diplomacyTableRows(planet, country) {
  const rels = country.diplomacy || {};
  const rows = Object.entries(rels).map(([targetId, relKey]) => {
    const target = countryById(planet, targetId);
    const style = RELATIONSHIP_STYLES[relKey] || { label: relKey, color: "#a3a3a3" };
    const partnerName = target ? target.name : targetId;
    return `<tr><td>${escapeHtml(partnerName)}</td><td><span class="badge" style="background:${style.color}; color:#fff;">${escapeHtml(style.label || relKey)}</span></td></tr>`;
  }).join("");

  return rows || `<tr><td colspan="2" class="small">No diplomacy data available yet.</td></tr>`;
}

/* ---------- Router ---------- */

function render() {
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
    app.innerHTML = viewPlanet(planet);
    return;
  }

  if (path === "/country") {
    const planetParam = params.get("planet");
    const countryId = params.get("country"); // country stored as id
    const planet = findPlanet(planetParam) || getDefaultPlanet();
    const country = countryById(planet, countryId);
    setNav(planet);
    app.innerHTML = viewCountry(planet, country);
    return;
  }

  // fallback -> choose planet
  setNav(null);
  app.innerHTML = viewChoosePlanet();
}

window.addEventListener("hashchange", render);
render();
