import { PLANETS } from "./config.js";

const planetButtons = document.getElementById("planetButtons");
const viewTitle = document.getElementById("viewTitle");
const view = document.getElementById("view");

let currentPlanet = PLANETS[0];

function renderPlanetButtons() {
  planetButtons.innerHTML = "";
  for (const p of PLANETS) {
    const btn = document.createElement("button");
    btn.textContent = p.label;
    btn.onclick = () => {
      currentPlanet = p;
      render();
    };
    planetButtons.appendChild(btn);
  }
}

function renderPlaceholderDiplomacy() {
  // Placeholder “matrix” until we connect real data
  const countries = ["Country A", "Country B", "Country C", "Country D"];
  let html = `<div class="small">Planet: <span class="badge">${currentPlanet.label}</span> (placeholder diplomacy)</div>`;
  html += `<table class="table"><thead><tr><th></th>${countries.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>`;
  for (const r of countries) {
    html += `<tr><th>${r}</th>`;
    for (const c of countries) {
      html += `<td>${r === c ? "—" : "Neutral"}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  view.innerHTML = html;
}

function render() {
  viewTitle.textContent = "Diplomacy";
  renderPlaceholderDiplomacy();
}

renderPlanetButtons();
render();
