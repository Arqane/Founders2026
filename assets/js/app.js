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

function setNav(planet = null) {
  const planetCrumb = planet
    ? `<a href="#/planet?planet=${encodeURIComponent(planet.id)}">${planet.label}</a>`
    : "";
  nav.innerHTML = `
    <a href="#/">Choose Planet</a>
    ${planetCrumb}
  `;
}

/* ---------- API ---------- */

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchApiHealth() {
  return fetchJson(API_BASE);
}

async function fetchPlanetLive(planetId) {
  const url = `${API_BASE}?view=planet&planet=${encodeURIComponent(planetId)}`;
  return fetchJson(url);
}

/* ---------- Formatting ---------- */

function fmtBillion(n) {
  if (n === null || n === undefined || n === "") return "—";
  return `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} B`;
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

/* ---------- Diplomacy Web + Tooltip ---------- */

function legendHtml() {
  const items = Object.entries(RELATIONSHIP_STYLES).map(([, v]) =>
    `<div class="legendItem"><span class="legendSwatch" style="background:${v.color}"></span>${v.label}</div>`
  ).join("");
  return `<div class="graphLegend">${items}</div>`;
}

function edgeTooltipText(edge) {
  const rel = String(edge?.relationship || "").trim();
  const st = String(edge?.status || "").trim();
  if (!rel && !st) return "";
  if (rel && st) return `${rel} (${st})`;
  return rel || st;
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
      x1="${A.x.toFixed(2)}" y1="${A.y.toFixed(2)}"
      x2="${B.x.toFixed(2)}" y2="${B.y.toFixed(2)}"
      stroke="${style.color}" stroke-width="3" opacity="0.85" />`;
  }).join("");

  const nodeDots = nodes.map(n => `
    <circle class="nodeCircle" cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="18" fill="rgba(255,255,255,0.08)"></circle>
    <circle cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="12" fill="rgba(255,255,255,0.85)"></circle>
    <text class="nodeLabel" x="${n.x.toFixed(2)}" y="${(n.y + 34).toFixed(2)}" text-anchor="middle">${escapeHtml(n.name)}</text>
  `).join("");

  return `
    <div class="graphWrap" id="dipWrap">
      <svg id="dipSvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diplomacy web">
        ${edgeLines}
        ${nodeDots}
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
    tip.textContent = text;
    tip.classList.add("show");

    const rect = wrap.getBoundingClientRect();
    tip.style.left = `${e.clientX - rect.left}px`;
    tip.style.top = `${e.clientY - rect.top}px`;
  }

  function hideTip() {
    tip.classList.remove("show");
  }

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
  const sheetList = Array.isArray(payload?.sheets) ? payload.sheets : [];
  const firstFew = sheetList.slice(0, 12);
  const more = sheetList.length > firstFew.length ? ` (+${sheetList.length - firstFew.length} more)` : "";

  return `
    <div class="card" style="box-shadow:none; border:1px solid #e5e7eb;">
      <h3 style="margin:0 0 6px 0;">Live data connected ✅</h3>
      <div class="small">Project: <strong>${escapeHtml(payload.project || "—")}</strong></div>
      <div class="small">Timestamp: ${escapeHtml(payload.timestamp || "—")}</div>
      <div style="margin-top:10px;">
        <div class="small"><strong>Sheets detected</strong>${more}:</div>
        <div class="small" style="margin-top:6px;">${escapeHtml(firstFew.join(", "))}</div>
      </div>
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

function viewPlanetLive(planet, payload) {
  const countries = Array.isArray(payload?.countries) ? payload.countries : [];
  const rankings = payload?.rankings || {};
  const edges = payload?.diplomacy?.edges || [];

  const countryLinks = countries.length
    ? countries.map(c => {
        const href = `#/country?planet=${encodeURIComponent(planet.id)}&country=${encodeURIComponent(c.id)}`;
        return `<li><a class="inline" href="${href}">${escapeHtml(c.name)}</a></li>`;
      }).join("")
    : `<li class="small">No countries found.</li>`;

  return `
    <section class="card">
      <div class="hstack" style="justify-content:space-between;">
        <div>
          <h2 class="heroTitle">${escapeHtml(planet.label)}</h2>
          <div class="small">Live from API • Year ${escapeHtml(payload.year)}</div>
        </div>
        <div class="buttonRow">
          <button onclick="location.hash='#/'">Change Planet</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Diplomacy Web</h3>
      <p class="small">Hover a line to see the relationship type.</p>
      ${diplomacyWebSvgFromEdges(countries, edges)}
    </section>

    <section class="card">
      <h3 class="sectionTitle">Countries</h3>
      <ul>${countryLinks}</ul>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Rankings</h3>
      <div class="grid2">
        ${rankingsTable("Real GDP (rGDP, $B)", rankings.rGDP, fmtBillion)}
        ${rankingsTable("Unemployment Rate (%)", rankings.unemployment, fmtPct)}
        ${rankingsTable("Inflation Rate (%)", rankings.inflation, fmtPct)}
        ${rankingsTable("Trade Balance ($B)", rankings.tradeBalance, fmtSignedBillion)}
      </div>
    </section>
  `;
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
    setNav(planet);
    app.innerHTML = viewLoading(`Loading ${planet.label}`);
    try {
      const payload = await fetchPlanetLive(planet.id);
      if (!payload?.ok) throw new Error(payload?.error || "API returned ok=false");
      app.innerHTML = viewPlanetLive(planet, payload);
      attachDiplomacyTooltipHandlers();
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  if (path === "/country") {
    setNav(findPlanet(params.get("planet")) || getDefaultPlanet());
    app.innerHTML = `
      <section class="card">
        <h2 class="heroTitle">Country page (next step)</h2>
        <p class="small">Next: live flagPublicUrl, resources (Y:BN), demonym, motto, etc.</p>
        <p><a class="inline" href="#/">Back</a></p>
      </section>
    `;
    return;
  }

  setNav(null);
  app.innerHTML = viewChoosePlanetSkeleton();
}

window.addEventListener("hashchange", () => render());
render();
