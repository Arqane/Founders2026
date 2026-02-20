import { PLANETS } from "./config.js";

const nav = document.getElementById("nav");
const app = document.getElementById("app");

const DEFAULT_PLANET_ID = "test";

function setNav() {
  nav.innerHTML = `
    <a href="#/">Home</a>
    <a href="#/diplomacy">Diplomacy</a>
    <a href="#/planets">Planets</a>
  `;
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
  return PLANETS.find(p => p.id === DEFAULT_PLANET_ID) || PLANETS[0] || null;
}

/* ---------- Views ---------- */

function viewHome() {
  const def = getDefaultPlanet();
  return `
    <section class="card">
      <h2>Welcome</h2>
      <p>This site will display the diplomacy matrix and (soon) country profiles pulled from each planet’s Data Log.</p>
      <p class="small">
        Current integration target: <span class="badge">${def ? def.label : "None"}</span>
      </p>
      <p>
        Start here:
        <a class="inline" href="#/diplomacy?planet=${encodeURIComponent(def?.id || "")}">Diplomacy (TEST)</a> or
        <a class="inline" href="#/planet?planet=${encodeURIComponent(def?.id || "")}">Planet Hub (TEST)</a>.
      </p>
    </section>
  `;
}

function viewPlanets() {
  const buttons = PLANETS.map(p =>
    `<button onclick="location.hash='#/planet?planet=${encodeURIComponent(p.id)}'">${p.label}</button>`
  ).join("");

  return `
    <section class="card">
      <h2>Planets</h2>
      <p>Select a planet hub. We’ll integrate TEST first, then roll it out to the real planets.</p>
      <div class="buttonRow">${buttons}</div>
    </section>
  `;
}

function viewPlanetHub(planet) {
  // Placeholder list: later we’ll populate from planet data log
  const demoCountries = ["Country A", "Country B", "Country C", "Country D"];
  const countryLinks = demoCountries.map(c => {
    const href = `#/country?planet=${encodeURIComponent(planet.id)}&country=${encodeURIComponent(c)}`;
    return `<li><a class="inline" href="${href}">${c}</a></li>`;
  }).join("");

  return `
    <section class="card">
      <h2>Planet Hub: ${planet.label}</h2>
      <p class="small">Planet ID: <span class="badge">${planet.id}</span></p>

      <div class="buttonRow" style="margin:12px 0;">
        <button onclick="location.hash='#/diplomacy?planet=${encodeURIComponent(planet.id)}'">View Diplomacy</button>
        <button onclick="location.hash='#/planets'">Back to Planets</button>
      </div>

      <h3>Countries (placeholder)</h3>
      <ul>
        ${countryLinks}
      </ul>
      <p class="small">
        ${planet.id === "test"
          ? "TEST is where we will wire live data first."
          : "Next: replace this placeholder list with live countries from the Data Log collector sheet for this planet."
        }
      </p>
    </section>
  `;
}

function viewDiplomacy(planet) {
  // Placeholder “matrix” until we connect real data
  const countries = ["Country A", "Country B", "Country C", "Country D"];

  let html = `
    <section class="card">
      <h2>Diplomacy</h2>
      <p class="small">Planet: <span class="badge">${planet ? planet.label : "Unknown"}</span> (placeholder)</p>
      <p class="small">Next: replace “Neutral” with the real relationship values from your diplomacy collector endpoint.</p>
    </section>
    <section class="card">
      <table class="table">
        <thead>
          <tr><th></th>${countries.map(c => `<th>${c}</th>`).join("")}</tr>
        </thead>
        <tbody>
  `;

  for (const r of countries) {
    html += `<tr><th>${r}</th>`;
    for (const c of countries) {
      html += `<td>${r === c ? "—" : "Neutral"}</td>`;
    }
    html += `</tr>`;
  }

  html += `
        </tbody>
      </table>
    </section>
  `;

  return html;
}

function viewCountryProfile(planet, countryName) {
  return `
    <section class="card">
      <h2>Country Profile (placeholder)</h2>
      <p><span class="badge">${planet ? planet.label : "Unknown planet"}</span> — <strong>${countryName || "Unknown country"}</strong></p>

      <h3>Planned Data (from Data Log)</h3>
      <ul>
        <li>Population, unemployment, inflation, rGDP, rGDP per capita</li>
        <li>Resources + values</li>
        <li>Trade posture and diplomacy relationships</li>
        <li>“Last updated” timestamp</li>
      </ul>

      <p class="small">
        Next: wire this page to the planet’s Data Log spreadsheet so it automatically fills these fields.
      </p>

      <div class="buttonRow" style="margin-top:12px;">
        ${planet ? `<button onclick="location.hash='#/planet?planet=${encodeURIComponent(planet.id)}'">Back to ${planet.label}</button>` : ""}
        <button onclick="history.back()">Back</button>
      </div>
    </section>
  `;
}

/* ---------- Router ---------- */

function render() {
  const { path, params } = parseRoute();

  if (path === "/" || path === "") {
    app.innerHTML = viewHome();
    return;
  }

  if (path === "/planets") {
    app.innerHTML = viewPlanets();
    return;
  }

  if (path === "/planet") {
    const planetParam = params.get("planet");
    const planet = findPlanet(planetParam);
    if (!planet) {
      app.innerHTML = `<section class="card"><h2>Planet not found</h2><p>Missing/invalid planet parameter.</p><p><a class="inline" href="#/planets">Go to Planets</a></p></section>`;
      return;
    }
    app.innerHTML = viewPlanetHub(planet);
    return;
  }

  if (path === "/diplomacy") {
    const planetParam = params.get("planet");
    const planet = findPlanet(planetParam) || getDefaultPlanet();
    app.innerHTML = viewDiplomacy(planet);
    return;
  }

  if (path === "/country") {
    const planetParam = params.get("planet");
    const country = params.get("country");
    const planet = findPlanet(planetParam) || getDefaultPlanet();
    app.innerHTML = viewCountryProfile(planet, country);
    return;
  }

  // fallback
  app.innerHTML = `<section class="card"><h2>Not Found</h2><p>No page at <span class="badge">${path}</span>.</p><p><a class="inline" href="#/">Go Home</a></p></section>`;
}

setNav();
window.addEventListener("hashchange", render);
render();
