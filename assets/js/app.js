// assets/js/app.js
import { API_BASE, PLANETS } from "./config.js";

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
  const planetCrumb = planet
    ? `<a href="#/planet?planet=${encodeURIComponent(planet.id)}">${planet.label}</a>`
    : "";

  nav.innerHTML = `
    <a href="#/">Choose Planet</a>
    ${planetCrumb}
  `;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ---------- Live API (Step 2) ---------- */

async function fetchApiHealth() {
  const res = await fetch(API_BASE, { cache: "no-store" });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  return res.json();
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
      <div class="small">Spreadsheet ID: <code>${escapeHtml(payload.spreadsheetId || "—")}</code></div>
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
      <div class="small" style="margin-top:10px;">
        If this persists, check Apps Script deployment access (must allow "Anyone" or "Anyone with link").
      </div>
    </div>
  `;
}

function viewPlanetPlaceholder(planet) {
  return `
    <section class="card">
      <div class="hstack" style="justify-content:space-between;">
        <div>
          <h2 class="heroTitle">${escapeHtml(planet.label)}</h2>
          <div class="small">Planet pages will be powered by the live API next.</div>
        </div>
        <div class="buttonRow">
          <button onclick="location.hash='#/'">Change Planet</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Next step</h3>
      <p class="small">
        We’ll implement API endpoints like:
        <code>?planet=test&amp;view=planet</code> and <code>?planet=test&amp;view=country&amp;country=...</code>
        then swap this placeholder to real live data.
      </p>
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
    app.innerHTML = viewPlanetPlaceholder(planet);
    return;
  }

  // Fallback
  setNav(null);
  app.innerHTML = viewChoosePlanetSkeleton();
}

window.addEventListener("hashchange", () => render());
render();
