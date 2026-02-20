import { API_BASE, PLANETS } from "./config.js";

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
      <p class="small"><code>${escapeHtml(String(err?.stack || ""))}</code></p>
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
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  if (path === "/country") {
    // Step 4 will implement this with API view=country
    setNav(findPlanet(params.get("planet")) || getDefaultPlanet());
    app.innerHTML = `
      <section class="card">
        <h2 class="heroTitle">Country page (next step)</h2>
        <p class="small">Step 4 will make this live: demonym, motto, flagPublicUrl, resources (Y:BN), diplomacy, etc.</p>
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
