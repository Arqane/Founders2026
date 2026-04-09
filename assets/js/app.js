// assets/js/app.js
// Updated: 2026-04-09 (Add FOREX chart + exchange calculator on Trade page)

import { API_BASE, PLANETS, RELATIONSHIP_STYLES } from "./config.js";

const nav = document.getElementById("nav");
const app = document.getElementById("app");

/* =========================================================
   Utils
========================================================= */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  return (
    PLANETS.find((p) => p.id === key) ||
    PLANETS.find((p) => p.label.toLowerCase() === key) ||
    null
  );
}

function getDefaultPlanet() {
  return PLANETS.find((p) => p.id === "test") || PLANETS[0] || null;
}

function yearTitleFromPayload(payload) {
  const y = payload?.year;
  if (Number.isFinite(Number(y))) return `Year ${Number(y)}`;
  const ys = String(payload?.yearSheet || "").trim();
  const m = ys.match(/Year\s+(\d+)/i);
  if (m) return `Year ${Number(m[1])}`;
  const yt = String(payload?.yearTokenDisplay || "").trim();
  const m2 = yt.match(/Y(\d+)/i);
  if (m2) return `Year ${Number(m2[1])}`;
  return "Year";
}

function normalizeId(s) {
  return String(s ?? "").trim().toLowerCase();
}

function ordinal(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  const mod100 = v % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${v}th`;
  switch (v % 10) {
    case 1:
      return `${v}st`;
    case 2:
      return `${v}nd`;
    case 3:
      return `${v}rd`;
    default:
      return `${v}th`;
  }
}

/* =========================================================
   Modal (used by pies)
========================================================= */

function ensureOneModalExists() {
  if (document.getElementById("pieModalOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "pieModalOverlay";
  overlay.className = "modalOverlay";
  overlay.innerHTML = `
    <div class="modalCard" role="dialog" aria-modal="true" aria-label="Chart details">
      <div class="modalHeader">
        <div class="modalTitleWrap">
          <div class="modalTitle" id="pieModalTitle">Chart</div>
          <div class="modalSubtitle" id="pieModalSubtitle">Details</div>
        </div>
        <button class="modalClose" id="pieModalClose" aria-label="Close">✕</button>
      </div>
      <div class="modalBody">
        <div class="modalGrid">
          <div class="modalPie" id="pieModalPie"></div>
          <div class="modalLegend" id="pieModalLegend"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document
    .getElementById("pieModalClose")
    .addEventListener("click", () => hideModal());

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
  });
}

function showModal({ key, title, subtitle, pieHtml, legendHtml }) {
  ensureOneModalExists();
  const overlay = document.getElementById("pieModalOverlay");
  document.getElementById("pieModalTitle").textContent = title || "";
  document.getElementById("pieModalSubtitle").textContent = subtitle || "";
  document.getElementById("pieModalPie").innerHTML = pieHtml || "";
  document.getElementById("pieModalLegend").innerHTML = legendHtml || "";
  overlay.setAttribute("data-key", key || "");
  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideModal() {
  const overlay = document.getElementById("pieModalOverlay");
  if (!overlay) return;
  overlay.classList.remove("show");
  overlay.removeAttribute("data-key");
  document.body.style.overflow = "";
}

/* =========================================================
   Header/Nav
========================================================= */

function tabStyle(isActive) {
  return isActive
    ? "background:#e5e7eb;color:#111827;border:1px solid #e5e7eb;"
    : "background:#111827;color:#e5e7eb;border:1px solid #374151;";
}

// Tabs order: Overview, Trends, Trade, Resources, Countries
function setNav(planet = null, active = "overview") {
  const left = `
    <a class="siteTitle" href="#/" style="font-weight:800; letter-spacing:0.2px; text-decoration:none;">
      Founders
    </a>
  `;

  const tabs = planet
    ? `
    <div class="navTabs" style="display:flex; gap:10px; align-items:center;">
      <a class="navTab" href="#/planet?planet=${encodeURIComponent(planet.id)}"
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(
           active === "overview"
         )}">
        Overview
      </a>

      <a class="navTab" href="#/trends?planet=${encodeURIComponent(planet.id)}"
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(
           active === "trends"
         )}">
        Trends
      </a>

      <a class="navTab" href="#/trade?planet=${encodeURIComponent(planet.id)}"
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(
           active === "trade"
         )}">
        Trade
      </a>

      <a class="navTab" href="#/resources?planet=${encodeURIComponent(planet.id)}"
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(
           active === "resources"
         )}">
        Resources
      </a>

      <a class="navTab" href="#/countries?planet=${encodeURIComponent(planet.id)}"
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(
           active === "countries"
         )}">
        Countries
      </a>
    </div>
  `
    : "";

  nav.innerHTML = `
    <div class="headerBar" style="display:flex; justify-content:space-between; align-items:center; gap:14px;">
      <div class="headerLeft" style="display:flex; align-items:center; gap:10px;">
        ${left}
      </div>
      <div class="headerRight">
        ${tabs}
      </div>
    </div>
  `;
}

/* =========================================================
   API
========================================================= */

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchApiHealth() {
  return fetchJson(`${API_BASE}?nocache=1`);
}

async function fetchPlanetOverview(planetId) {
  return fetchJson(
    `${API_BASE}?view=planet&planet=${encodeURIComponent(planetId)}&nocache=1`
  );
}

async function fetchPlanetTrade(planetId) {
  return fetchJson(
    `${API_BASE}?view=trade&planet=${encodeURIComponent(planetId)}&nocache=1`
  );
}

async function fetchPlanetResources(planetId) {
  return fetchJson(
    `${API_BASE}?view=resources&planet=${encodeURIComponent(planetId)}&nocache=1`
  );
}

async function fetchPlanetTrends(planetId) {
  return fetchJson(
    `${API_BASE}?view=trends&planet=${encodeURIComponent(planetId)}&nocache=1`
  );
}

/* =========================================================
   Formatting
========================================================= */

function fmtUsdB(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}B`;
}

function fmtUsdTFromBillions(n) {
  if (n === null || n === undefined || n === "") return "—";
  const b = Number(n);
  if (!Number.isFinite(b)) return "—";
  const t = b / 1000;
  return `$${t.toLocaleString(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}T`;
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

// Forex value formatter (USD per 1 unit), show more precision
function fmtUsdPerUnit(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  // Adaptive precision: small values get more digits
  const abs = Math.abs(v);
  const digits = abs >= 1 ? 3 : abs >= 0.1 ? 4 : 6;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}

function fmtFxRate(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const digits = abs >= 10 ? 3 : abs >= 1 ? 4 : 6;
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

// Trend axis/value formatter selector (adds $ / % where appropriate)
function trendValueFormatterForKey(indicatorKey) {
  const k = normalizeId(indicatorKey);

  // % indicators
  if (
    k.includes("rate") ||
    k.includes("infl") ||
    k.includes("unemp") ||
    k.includes("growth") ||
    k.includes("ffr") ||
    k.includes("fedfund") ||
    k.includes("fed_fund")
  ) {
    return (v) => fmtPct(v);
  }

  // $ indicators
  if (
    k.includes("rgdp") ||
    k.includes("gdp") ||
    k.includes("budget") ||
    k.includes("debt") ||
    k.includes("export") ||
    k.includes("import") ||
    k.includes("tradebalance")
  ) {
    // rGDPpc is not billions in most datasets
    if (k.includes("pc") || k.includes("percap")) return (v) => fmtUsd(v, 0);
    return (v) => fmtUsdB(v);
  }

  // default numeric
  return (v) => fmtNum(v, 1);
}

/* =========================================================
   Country profile helpers
========================================================= */

function findCountryInPayload(payload, countryIdOrName) {
  const countries = Array.isArray(payload?.countries) ? payload.countries : [];
  const key = normalizeId(countryIdOrName);

  return (
    countries.find((c) => normalizeId(c?.id) === key) ||
    countries.find((c) => normalizeId(c?.name) === key) ||
    null
  );
}

function getCountryEconomicSystem(country, payload) {
  if (country?.economicSystem) return String(country.economicSystem);

  const rows = Array.isArray(payload?.rankings?.economicSystem)
    ? payload.rankings.economicSystem
    : [];

  const match = rows.find(
    (r) =>
      normalizeId(r?.id) === normalizeId(country?.id) ||
      normalizeId(r?.name) === normalizeId(country?.name)
  );

  return match?.value ?? "—";
}

function getCountryRank(rankRows, country) {
  const rows = Array.isArray(rankRows) ? rankRows : [];
  const idx = rows.findIndex(
    (r) =>
      normalizeId(r?.id) === normalizeId(country?.id) ||
      normalizeId(r?.name) === normalizeId(country?.name)
  );
  return idx >= 0 ? idx + 1 : null;
}

function getTradeItemForCountry(tradePayload, country) {
  const items = Array.isArray(tradePayload?.trade?.items)
    ? tradePayload.trade.items
    : [];
  return (
    items.find((x) => normalizeId(x?.id) === normalizeId(country?.id)) ||
    items.find((x) => normalizeId(x?.name) === normalizeId(country?.name)) ||
    null
  );
}

function getTradeRank(tradePayload, country, key, dir = "desc", useAbs = false) {
  const items = Array.isArray(tradePayload?.trade?.items)
    ? tradePayload.trade.items
    : [];

  const ranked = items
    .map((x) => {
      const raw = Number(x?.[key]);
      if (!Number.isFinite(raw)) return null;
      return {
        id: x?.id,
        name: x?.name,
        value: raw,
        sortValue: useAbs ? Math.abs(raw) : raw,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      dir === "asc" ? a.sortValue - b.sortValue : b.sortValue - a.sortValue
    );

  const idx = ranked.findIndex(
    (x) =>
      normalizeId(x?.id) === normalizeId(country?.id) ||
      normalizeId(x?.name) === normalizeId(country?.name)
  );

  return idx >= 0 ? idx + 1 : null;
}

function getCountryResourcesFromPayload(resourcesPayload, country) {
  const breakdownByResource = resourcesPayload?.resources?.breakdownByResource || {};
  const resources = [];

  Object.entries(breakdownByResource).forEach(([resourceName, breakdown]) => {
    const arr = Array.isArray(breakdown) ? breakdown : [];
    const hit = arr.find(
      (x) =>
        normalizeId(x?.id) === normalizeId(country?.id) ||
        normalizeId(x?.name) === normalizeId(country?.name)
    );

    const value = Number(hit?.value);
    if (Number.isFinite(value) && value > 0) {
      resources.push({ name: resourceName, quantity: value });
    }
  });

  resources.sort((a, b) => b.quantity - a.quantity);

  const total = resources.reduce((s, r) => s + r.quantity, 0);
  return resources.map((r) => ({
    ...r,
    share: total > 0 ? (r.quantity / total) * 100 : null,
  }));
}

function buildCountryStatRows(country, overviewPayload, tradePayload) {
  const indicators = country?.indicators || {};
  const tradeItem = getTradeItemForCountry(tradePayload, country);

  const overviewCountryCount = Array.isArray(overviewPayload?.countries)
    ? overviewPayload.countries.length
    : 0;
  const tradeItems = Array.isArray(tradePayload?.trade?.items)
    ? tradePayload.trade.items
    : [];
  const tradeCountryCount = tradeItems.length;

  const exportValue = Number(tradeItem?.exportValue);
  const importValue = Number(tradeItem?.importValue);
  const tradeBalance =
    Number.isFinite(exportValue) && Number.isFinite(importValue)
      ? exportValue - importValue
      : null;

  const rows = [
    {
      label: "Real GDP",
      valueText: fmtUsdB(indicators.rGDP),
      rank: getCountryRank(overviewPayload?.rankings?.rGDP, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Real GDP per Capita",
      valueText: fmtUsd(indicators.rGDPpc, 0),
      rank: getCountryRank(overviewPayload?.rankings?.rGDPpc, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Real GDP Growth Rate",
      valueText: fmtPct(indicators.rGDPGrowth),
      rank: getCountryRank(overviewPayload?.rankings?.rGDPGrowth, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Unemployment Rate",
      valueText: fmtPct(indicators.unemployment),
      rank: getCountryRank(overviewPayload?.rankings?.unemployment, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Inflation Rate",
      valueText: fmtPct(indicators.inflation),
      rank: getCountryRank(overviewPayload?.rankings?.inflation, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Budget Deficit/Surplus",
      valueText: fmtUsdB(indicators.budgetDeficit),
      rank: getCountryRank(overviewPayload?.rankings?.budgetDeficit, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "National Debt/Fund",
      valueText: fmtUsdB(indicators.nationalDebt),
      rank: getCountryRank(overviewPayload?.rankings?.nationalDebt, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Federal Funds Rate",
      valueText: fmtPct(indicators.fedFundsRate),
      rank: getCountryRank(overviewPayload?.rankings?.fedFundsRate, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Population",
      valueText: fmtNum(indicators.population, 0),
      rank: getCountryRank(overviewPayload?.rankings?.population, country),
      rankBase: overviewCountryCount,
    },
    {
      label: "Trade Frequency",
      valueText: fmtNum(tradeItem?.frequency, 0),
      rank: getTradeRank(tradePayload, country, "frequency", "desc", false),
      rankBase: tradeCountryCount,
    },
    {
      label: "Trade Volume",
      valueText: fmtNum(tradeItem?.volume, 0),
      rank: getTradeRank(tradePayload, country, "volume", "desc", false),
      rankBase: tradeCountryCount,
    },
    {
      label: "Exports",
      valueText: fmtUsdB(tradeItem?.exportValue),
      rank: getTradeRank(tradePayload, country, "exportValue", "desc", false),
      rankBase: tradeCountryCount,
    },
    {
      label: "Imports",
      valueText: fmtUsdB(tradeItem?.importValue),
      rank: getTradeRank(tradePayload, country, "importValue", "desc", true),
      rankBase: tradeCountryCount,
    },
    { label: "Trade Balance", valueText: fmtUsdB(tradeBalance), rank: null, rankBase: null },
  ];

  return rows.map((row) => ({
    ...row,
    rankingText:
      row.rank && row.rankBase ? `${ordinal(row.rank)} out of ${row.rankBase}` : "—",
  }));
}

/* =========================================================
   Generic Pie (SVG) + tooltip (home + trade + modal)
========================================================= */

function pieColorForIndex(i, n) {
  const hue = Math.round((360 * i) / Math.max(1, n));
  return `hsl(${hue} 70% 55%)`;
}

function ensurePieTooltipIn(el) {
  if (!el) return null;
  let tip = el.querySelector(".pieTooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "pieTooltip";
    el.appendChild(tip);
  }
  return tip;
}

function attachPieTooltipHandlers(container) {
  if (!container) return;
  const wrap = container.querySelector(".pieWrap");
  const svg = container.querySelector("svg[data-pie='1']");
  if (!wrap || !svg) return;

  const tip = ensurePieTooltipIn(wrap);

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
    const path = e.target;
    if (path && path.tagName === "path" && path.dataset && path.dataset.tip) {
      showTip(e, path.dataset.tip);
    } else {
      hideTip();
    }
  });
  svg.addEventListener("mouseleave", hideTip);
}

function pieSvgHtml({ data, total, size, ariaLabel }) {
  if (!Array.isArray(data) || !data.length || !(total > 0))
    return `<div class="small">No data.</div>`;

  const W = size === "large" ? 720 : 420;
  const H = size === "large" ? 520 : 320;
  const cx = W / 2;
  const cy = H / 2 + (size === "large" ? 0 : 6);
  const r = size === "large" ? 200 : 120;

  let start = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const sv = Number.isFinite(Number(d.sortValue)) ? Number(d.sortValue) : Number(d.value);
    const ang = (sv / total) * Math.PI * 2;
    const end = start + ang;

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = ang > Math.PI ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const color = pieColorForIndex(i, data.length);

    start = end;

    const tip = `${d.name} — ${d.displayValueText ?? String(d.value)}`;

    return { path, color, tip };
  });

  return `
    <div class="pieWrap">
      <svg class="homePieSvg"
           data-pie="1"
           style="display:block; max-width:100%; height:auto;"
           width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
           role="img" aria-label="${escapeHtml(ariaLabel || "Pie chart")}">
        ${slices
          .map(
            (s) =>
              `<path d="${s.path}" fill="${s.color}" opacity="0.95" data-tip="${escapeHtml(
                s.tip
              )}"></path>`
          )
          .join("")}
      </svg>
    </div>
  `;
}

function legendTableHtml(data) {
  if (!Array.isArray(data) || !data.length) return "";

  const rows = data
    .map((d, i) => {
      const color = pieColorForIndex(i, data.length);
      return `
        <tr>
          <td class="legendSwatchCell">
            <span class="legendSwatchBox" style="background:${color};"></span>
          </td>
          <td class="legendName">${escapeHtml(d.name)}</td>
          <td class="legendVal">${escapeHtml(d.displayValueText ?? String(d.value))}</td>
        </tr>
      `;
    })
    .join("");

  return `<table class="legendTable"><tbody>${rows}</tbody></table>`;
}

/* =========================================================
   Diplomacy Web
========================================================= */

function legendHtml() {
  const items = Object.entries(RELATIONSHIP_STYLES)
    .map(
      ([_, v]) =>
        `<div class="legendItem"><span class="legendSwatch" style="background:${v.color}"></span>${v.label}</div>`
    )
    .join("");
  return `<div class="graphLegendWrap"><div class="graphLegend">${items}</div></div>`;
}

function edgeTooltipText(edge) {
  const aName = String(edge?.aName || edge?.aId || "").trim();
  const bName = String(edge?.bName || edge?.bId || "").trim();
  const rel = String(edge?.relationship || "").trim();
  const st = String(edge?.status || "").trim();

  const line1 = aName && bName ? `${aName} → ${bName}` : "";
  const line2 = rel ? (st ? `${rel} (${st})` : rel) : st ? st : "";

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

  const nodeMap = new Map(nodes.map((nn) => [nn.id, nn]));

  const edgeLines = (edges || [])
    .filter((e) => {
      const relText = String(e?.relationship || "").trim().toLowerCase();
      const keyText = String(e?.key || "").trim().toLowerCase();
      return relText !== "none" && keyText !== "none";
    })
    .map((e) => {
      const A = nodeMap.get(e.aId);
      const B = nodeMap.get(e.bId);
      if (!A || !B) return "";

      const keyText = String(e?.key || "").trim().toLowerCase();
      const style = RELATIONSHIP_STYLES[keyText] || RELATIONSHIP_STYLES.neutral;

      const tip = edgeTooltipText(e);
      const tipAttr = tip ? `data-tip="${escapeHtml(tip)}"` : "";

      return `<line class="dipEdge" ${tipAttr}
        data-aid="${escapeHtml(e.aId)}" data-bid="${escapeHtml(e.bId)}"
        x1="${A.x.toFixed(2)}" y1="${A.y.toFixed(2)}"
        x2="${B.x.toFixed(2)}" y2="${B.y.toFixed(2)}"
        stroke="${style.color}" stroke-width="3" opacity="0.85" />`;
    })
    .join("");

  const nodeGroups = nodes
    .map(
      (nn) => `
      <g class="dipNode" data-id="${escapeHtml(nn.id)}">
        <circle class="nodeCircle" cx="${nn.x.toFixed(2)}" cy="${nn.y.toFixed(2)}" r="18" fill="rgba(255,255,255,0.08)"></circle>
        <circle class="nodeDot" cx="${nn.x.toFixed(2)}" cy="${nn.y.toFixed(2)}" r="12" fill="rgba(255,255,255,0.85)"></circle>
        <text class="nodeLabel" x="${nn.x.toFixed(2)}" y="${(nn.y + 34).toFixed(
        2
      )}" text-anchor="middle">${escapeHtml(nn.name)}</text>
      </g>
    `
    )
    .join("");

  return `
    <div class="graphWrap" id="dipWrap" style="display:flex; justify-content:center;">
      <div style="position:relative; display:inline-block;">
        <svg id="dipSvg"
             style="display:block; margin:0 auto; max-width:100%; height:auto;"
             width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
             role="img" aria-label="Diplomacy web">
          ${edgeLines}
          ${nodeGroups}
        </svg>
        <div class="dipTooltip" id="dipTooltip"></div>
      </div>
    </div>

    <div class="small" style="margin-top:8px; text-align:center;">
      Hover a line to see: Source → Target + relationship type.
    </div>
    <div class="small" style="margin-top:6px; text-align:center;">
      Tip: click a country node to highlight only its connections. Click again to reset.
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

  function hideTip() {
    tip.classList.remove("show");
  }

  svg.addEventListener("mousemove", (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("dipEdge") && t.dataset?.tip) {
      if (t.classList.contains("dim")) {
        hideTip();
        return;
      }
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
      edges.forEach((el) => el.classList.remove("dim"));
      nodes.forEach((el) => el.classList.remove("dim", "focused"));
      return;
    }

    const neighbors = new Set([focusedId]);
    edges.forEach((el) => {
      const a = el.dataset.aid;
      const b = el.dataset.bid;
      if (a === focusedId) neighbors.add(b);
      if (b === focusedId) neighbors.add(a);
    });

    edges.forEach((el) => {
      const a = el.dataset.aid;
      const b = el.dataset.bid;
      el.classList.toggle("dim", !(a === focusedId || b === focusedId));
    });

    nodes.forEach((el) => {
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
    focusedId = focusedId === id ? null : id;
    applyFocus();
  });
}

/* =========================================================
   Expandable tables (rankings)
========================================================= */

const TABLE_EXPANDED = new Set();

function isExpanded(id) {
  return TABLE_EXPANDED.has(id);
}

function setExpanded(id, expanded) {
  if (expanded) TABLE_EXPANDED.add(id);
  else TABLE_EXPANDED.delete(id);
}

function expandableRankingsTable({
  id,
  title,
  rows,
  fmtFn,
  hintOn = "Click to expand",
  hintOff = "Click to collapse",
}) {
  const expanded = isExpanded(id);
  const list = Array.isArray(rows) ? rows : [];
  const hasExtra = list.length > 10;

  const body =
    list.length > 0
      ? list
          .map((r, i) => {
            const extra = i >= 10;
            const hiddenStyle = extra && !expanded ? 'style="display:none;"' : "";
            const extraClass = extra ? "extraRow" : "";
            return `
              <tr class="${extraClass}" ${hiddenStyle}>
                <td class="num">${i + 1}</td>
                <td>${escapeHtml(r.name)}</td>
                <td class="num">${fmtFn(r.value)}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="3" class="small">No data.</td></tr>`;

  const hintText = !hasExtra ? "" : expanded ? hintOff : hintOn;

  return `
    <div class="card expTable ${expanded ? "expanded" : ""}" data-exp="${escapeHtml(id)}"
      data-hinton="${escapeHtml(hintOn)}" data-hintoff="${escapeHtml(hintOff)}"
      style="box-shadow:none; border:1px solid #eee; ${hasExtra ? "cursor:pointer;" : ""}">
      <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
        <h4 style="margin:0 0 10px 0;">${escapeHtml(title)}</h4>
        <div class="small expHint">${escapeHtml(hintText)}</div>
      </div>
      <table class="table">
        <thead><tr><th class="num">#</th><th>Country</th><th class="num">Value</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function attachExpandableTableHandlers() {
  const cards = Array.from(document.querySelectorAll(".expTable[data-exp]"));
  cards.forEach((card) => {
    const id = card.getAttribute("data-exp");
    if (!id) return;

    const hasExtra = card.querySelector("tr.extraRow") != null;
    if (!hasExtra) return;

    card.addEventListener("click", () => {
      const nowExpanded = !card.classList.contains("expanded");
      card.classList.toggle("expanded", nowExpanded);
      setExpanded(id, nowExpanded);

      const extras = Array.from(card.querySelectorAll("tr.extraRow"));
      extras.forEach((tr) => {
        tr.style.display = nowExpanded ? "" : "none";
      });

      const hintEl = card.querySelector(".expHint");
      const onText = card.getAttribute("data-hinton") || "Click to expand";
      const offText = card.getAttribute("data-hintoff") || "Click to collapse";
      if (hintEl) hintEl.textContent = nowExpanded ? offText : onText;
    });
  });
}

/* =========================================================
   Trade ranking helpers
========================================================= */

function rankFromTradeItems(items, key, dir = "desc", useAbs = false) {
  const list = (items || [])
    .map((x) => {
      const v = Number(x[key]);
      if (!Number.isFinite(v)) return null;
      return { name: x.name, value: v, sortValue: useAbs ? Math.abs(v) : v };
    })
    .filter(Boolean);

  list.sort((a, b) => (dir === "asc" ? a.sortValue - b.sortValue : b.sortValue - a.sortValue));
  return list.map(({ name, value }) => ({ name, value }));
}

function buildTradePieData(items, key, formatter, useAbsForSize = false, useAbsForDisplay = false) {
  const data = (items || [])
    .map((x) => {
      const raw = Number(x[key]);
      if (!Number.isFinite(raw)) return null;
      const size = useAbsForSize ? Math.abs(raw) : raw;
      if (!(size > 0)) return null;
      const displayVal = useAbsForDisplay ? Math.abs(raw) : raw;
      return {
        name: String(x.name || "").trim(),
        value: raw,
        sortValue: size,
        displayValueText: formatter(displayVal),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.sortValue ?? 0) - (a.sortValue ?? 0));

  const total = data.reduce(
    (s, d) => s + (Number.isFinite(Number(d.sortValue)) ? Number(d.sortValue) : Number(d.value)),
    0
  );
  return { data, total };
}

function pieCardHtml({ cardKey, title, subtitle, data, total, size }) {
  const pie = pieSvgHtml({ data, total, size, ariaLabel: title });
  const legend = legendTableHtml(data);

  return `
    <div class="chartCard" data-chartkey="${escapeHtml(cardKey)}" style="cursor:pointer;">
      <div class="chartHeader">
        <h4 class="chartTitle">${escapeHtml(title)}</h4>
        <div class="chartSubtitle">${escapeHtml(subtitle || "")}</div>
      </div>

      <div class="chartRow">
        <div class="chartPieBox">${pie}</div>
        <div class="chartLegendBox">${legend}</div>
      </div>

      <div class="small" style="text-align:center; margin-top:8px;">Click to enlarge</div>
    </div>
  `;
}

/* =========================================================
   Home page GDP pies
========================================================= */

function getCountryGdpFromCountryObj(c) {
  const candidates = [
    "realGdp",
    "rgdp",
    "real_gdp",
    "gdp",
    "realGDP",
    "RealGDP",
    "Real Gdp",
    "indicators.rGDP",
  ];
  for (const k of candidates) {
    if (k === "indicators.rGDP") {
      const v = Number(c?.indicators?.rGDP);
      if (Number.isFinite(v)) return v;
      continue;
    }
    const v = Number(c?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return 0;
}

function gdpBreakdownFromPlanetPayload(payload) {
  const r = payload?.rankings?.rGDP;
  const list = Array.isArray(r) ? r : null;

  let rows = [];
  if (list && list.length) {
    rows = list
      .map((x) => ({ name: String(x.name || "").trim(), value: Number(x.value) }))
      .filter((x) => x.name && Number.isFinite(x.value) && x.value > 0);
  } else {
    const countries = Array.isArray(payload?.countries) ? payload.countries : [];
    rows = countries
      .map((c) => ({
        name: String(c?.name || c?.country || c?.id || "").trim(),
        value: getCountryGdpFromCountryObj(c),
      }))
      .filter((x) => x.name && Number.isFinite(x.value) && x.value > 0);
  }

  rows.sort((a, b) => b.value - a.value);
  const total = rows.reduce((s, x) => s + x.value, 0);

  const data = rows.map((r) => ({
    name: r.name,
    value: r.value,
    sortValue: r.value,
    displayValueText: fmtUsdTFromBillions(r.value),
  }));

  return { total, data };
}

async function renderHomeGdpPies() {
  const grid = document.getElementById("homeGdpGrid");
  if (!grid) return;

  const planetsForGrid = PLANETS.filter((p) => p.id !== "test").slice(0, 4);

  grid.innerHTML = `<div class="small">Loading GDP pies…</div>`;

  try {
    const payloads = await Promise.all(
      planetsForGrid.map((p) =>
        fetchPlanetOverview(p.id).catch((err) => ({ ok: false, error: err?.message || String(err) }))
      )
    );

    const modalCache = new Map();

    const cards = payloads.map((pl, idx) => {
      const planet = planetsForGrid[idx];
      const planetLabel = planet?.label || "Planet";

      if (!pl?.ok) {
        return `
          <div class="homePlanetCard" style="border:1px solid #ef4444;">
            <div class="homePlanetHeader">
              <h4 class="homePlanetTitle">${escapeHtml(planetLabel)}</h4>
              <div class="homePlanetSubtitle">Error</div>
            </div>
            <div class="small">Couldn’t load GDP.</div>
            <div class="small" style="margin-top:8px;"><strong>Error:</strong> ${escapeHtml(
              pl?.error || "Unknown error"
            )}</div>
          </div>
        `;
      }

      const yLabel = yearTitleFromPayload(pl);
      const { total, data } = gdpBreakdownFromPlanetPayload(pl);

      const key = `home:gdp:${planet.id}`;
      modalCache.set(key, { planetLabel, yearLabel: yLabel, total, data });

      const pieSmall = pieSvgHtml({ data, total, size: "small", ariaLabel: `${planetLabel} GDP` });

      return `
        <div class="homePlanetCard" data-chartkey="${escapeHtml(key)}" style="cursor:pointer;">
          <div class="homePlanetHeader">
            <h4 class="homePlanetTitle">${escapeHtml(planetLabel)}</h4>
            <div class="homePlanetSubtitle">${escapeHtml(yLabel)}</div>
          </div>
          <div class="small" style="margin-bottom:10px;">
            Global GDP: <strong>${escapeHtml(fmtUsdTFromBillions(total))}</strong>
          </div>

          <div class="homePieRow">
            <div class="homePieBox">${pieSmall}</div>
            <div class="homeLegendBox">${legendTableHtml(data)}</div>
          </div>

          <div class="small" style="text-align:center; margin-top:8px;">Click to enlarge</div>
        </div>
      `;
    });

    grid.innerHTML = `<div class="homeGrid2x2">${cards.join("")}</div>`;

    Array.from(grid.querySelectorAll(".homePlanetCard")).forEach((card) => {
      attachPieTooltipHandlers(card);
    });

    Array.from(grid.querySelectorAll("[data-chartkey]")).forEach((cardEl) => {
      cardEl.addEventListener("click", () => {
        const key = cardEl.getAttribute("data-chartkey");
        if (!key) return;

        const overlay = document.getElementById("pieModalOverlay");
        const alreadyOpen = overlay && overlay.classList.contains("show");
        const currentKey = overlay?.getAttribute("data-key");
        if (alreadyOpen && currentKey === key) {
          hideModal();
          return;
        }

        const cached = modalCache.get(key);
        if (!cached || !(cached.total > 0) || !cached.data?.length) return;

        const pieLarge = pieSvgHtml({
          data: cached.data,
          total: cached.total,
          size: "large",
          ariaLabel: `${cached.planetLabel} GDP enlarged`,
        });

        const legendHtml = `
          <div class="legendCard">
            <h4 class="legendTitle">All countries</h4>
            ${legendTableHtml(cached.data)}
          </div>
        `;

        showModal({
          key,
          title: cached.planetLabel,
          subtitle: `${cached.yearLabel} • Global GDP: ${fmtUsdTFromBillions(cached.total)}`,
          pieHtml: pieLarge,
          legendHtml,
        });

        const modalPie = document.getElementById("pieModalPie");
        attachPieTooltipHandlers(modalPie);
      });
    });
  } catch (err) {
    grid.innerHTML = `
      <div class="card" style="box-shadow:none; border:1px solid #ef4444;">
        <h4 style="margin:0 0 6px 0;">GDP pies failed</h4>
        <div class="small">${escapeHtml(err?.message || String(err))}</div>
      </div>
    `;
  }
}

/* =========================================================
   Trends (SVG line charts)
========================================================= */

function trendColorForIndex(i, n) {
  return pieColorForIndex(i, n);
}

function computeMinMaxFromSeriesMap(seriesMap, countries, yearsCount) {
  let min = Infinity;
  let max = -Infinity;

  for (const c of countries) {
    const arr = seriesMap?.[c] || [];
    for (let i = 0; i < yearsCount; i++) {
      const v = Number(arr[i]);
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, hasData: false };
  if (min === max) return { min: min - 1, max: max + 1, hasData: true };
  return { min, max, hasData: true };
}

function buildTrendSvg({
  indicatorKey,
  title,
  years,
  countries,
  seriesMap,
  focusedCountry,
  valueFormatter,
  width = 940,
  height = 360,
}) {
  const padR = 16;
  const padT = 18;
  const padB = 42;

  const W = width;
  const H = height;

  const yearsCount = Array.isArray(years) ? years.length : 0;
  if (yearsCount < 2) return `<div class="small">Not enough years to chart.</div>`;

  const { min, max, hasData } = computeMinMaxFromSeriesMap(seriesMap, countries, yearsCount);
  if (!hasData) return `<div class="small">No data yet for this indicator.</div>`;

  const fmtY = typeof valueFormatter === "function" ? valueFormatter : (v) => fmtNum(v, 1);

  // Dynamic left padding so Y-axis labels never clip
  const gridLabelLens = [];
  for (let g = 0; g <= 4; g++) {
    const t = g / 4;
    const val = min + t * (max - min);
    gridLabelLens.push(String(fmtY(val)).length);
  }
  const maxLabelLen = Math.max(...gridLabelLens, 4);
  const padL = Math.min(160, Math.max(54, 18 + maxLabelLen * 7));

  const x0 = padL;
  const x1 = W - padR;
  const y0 = H - padB;
  const y1 = padT;

  const xForIdx = (i) => x0 + (i * (x1 - x0)) / (yearsCount - 1);
  const yForVal = (v) => {
    const t = (v - min) / (max - min);
    return y0 - t * (y0 - y1);
  };

  // gridlines: 4 horizontal
  const gridLines = [];
  for (let g = 0; g <= 4; g++) {
    const t = g / 4;
    const y = y0 - t * (y0 - y1);
    const val = min + t * (max - min);
    gridLines.push({ y, val });
  }

  const xTicks = years.map((y, i) => ({ label: `Y${y}`, x: xForIdx(i) }));

  const paths = countries.map((c, i) => {
    const arr = seriesMap?.[c] || [];
    const pts = [];
    for (let k = 0; k < yearsCount; k++) {
      const v = Number(arr[k]);
      if (!Number.isFinite(v)) pts.push(null);
      else pts.push({ x: xForIdx(k), y: yForVal(v) });
    }

    let d = "";
    let started = false;
    pts.forEach((p) => {
      if (!p) {
        started = false;
        return;
      }
      if (!started) {
        d += `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
        started = true;
      } else {
        d += `L ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
      }
    });

    const color = trendColorForIndex(i, countries.length);

    const isFocused = focusedCountry && normalizeId(c) === normalizeId(focusedCountry);
    const isDim = focusedCountry && !isFocused;

    const stroke = isDim ? "rgba(120,120,120,0.25)" : color;
    const sw = isFocused ? 4 : 2.5;
    const op = isDim ? 0.35 : 0.9;

    return `
      <path class="trendLine ${isDim ? "dim" : ""} ${isFocused ? "focused" : ""}"
            data-country="${escapeHtml(c)}"
            data-ind="${escapeHtml(indicatorKey)}"
            d="${d.trim()}"
            fill="none"
            stroke="${stroke}"
            stroke-width="${sw}"
            opacity="${op}"
            style="cursor:pointer;"
      />`;
  });

  // If a country is focused, draw dots + value labels on its line (with edge-safe placement)
  let focusedPointLabels = "";
  if (focusedCountry) {
    const focusKey = normalizeId(focusedCountry);
    const focusIdx = countries.findIndex((c) => normalizeId(c) === focusKey);
    const focusName = focusIdx >= 0 ? countries[focusIdx] : null;

    if (focusName) {
      const color = trendColorForIndex(focusIdx, countries.length);
      const arr = seriesMap?.[focusName] || [];

      const dots = [];
      const labels = [];

      for (let k = 0; k < yearsCount; k++) {
        const v = Number(arr[k]);
        if (!Number.isFinite(v)) continue;

        const x = xForIdx(k);
        const y = yForVal(v);

        // dot
        dots.push(
          `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.2"
                   fill="${color}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`
        );

        // label: keep inside chart bounds (flip near edges)
        const txt = fmtY(v);

        // approximate pixel width of label text (good enough for clamping)
        const approxCharW = 7;
        const textW = Math.max(24, String(txt).length * approxCharW);

        const margin = 10;

        const nearRight = x > W - padR - textW - margin;
        const nearTop = y < padT + 18;

        const dx = nearRight ? -8 : 8;
        const dy = nearTop ? 14 : -10;

        const anchor = nearRight ? "end" : "start";

        let lx = x + dx;
        let ly = y + dy;

        lx = Math.max(padL + margin, Math.min(W - padR - margin, lx));
        ly = Math.max(padT + margin, Math.min(H - padB - margin, ly));

        labels.push(
          `<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}"
                 text-anchor="${anchor}"
                 font-size="12"
                 fill="rgba(255,255,255,0.92)"
                 stroke="rgba(0,0,0,0.55)"
                 stroke-width="3"
                 paint-order="stroke"
                 dominant-baseline="middle">
             ${escapeHtml(txt)}
           </text>`
        );
      }

      focusedPointLabels = `
        <g class="trendPointLabels" pointer-events="none">
          ${dots.join("")}
          ${labels.join("")}
        </g>
      `;
    }
  }

  const yLabels = gridLines
    .map(
      (g) => `
        <text x="${padL - 12}" y="${g.y.toFixed(2)}" text-anchor="end" dominant-baseline="middle"
              font-size="12" fill="rgba(255,255,255,0.75)">
          ${escapeHtml(fmtY(g.val))}
        </text>`
    )
    .join("");

  const grid = gridLines
    .map(
      (g) =>
        `<line x1="${x0}" y1="${g.y.toFixed(2)}" x2="${x1}" y2="${g.y.toFixed(2)}"
               stroke="rgba(255,255,255,0.10)" stroke-width="1" />`
    )
    .join("");

  const xAxis = `
    <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="rgba(255,255,255,0.22)" stroke-width="1" />
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="rgba(255,255,255,0.22)" stroke-width="1" />
  `;

  const xTickHtml = xTicks
    .map(
      (t) => `
        <line x1="${t.x.toFixed(2)}" y1="${y0}" x2="${t.x.toFixed(2)}" y2="${y0 + 6}"
              stroke="rgba(255,255,255,0.22)" stroke-width="1" />
        <text x="${t.x.toFixed(2)}" y="${y0 + 22}" text-anchor="middle"
              font-size="12" fill="rgba(255,255,255,0.80)">${escapeHtml(t.label)}</text>
      `
    )
    .join("");

  // Legend list (left side): black text, smaller font
  const legendItems = countries
    .map((c, i) => {
      const color = trendColorForIndex(i, countries.length);
      const isFocused = focusedCountry && normalizeId(c) === normalizeId(focusedCountry);
      const isDim = focusedCountry && !isFocused;
      const swatch = isDim ? "rgba(120,120,120,0.25)" : color;

      return `
        <button class="trendLegendItem ${isDim ? "dim" : ""} ${isFocused ? "focused" : ""}"
                data-country="${escapeHtml(c)}"
                data-ind="${escapeHtml(indicatorKey)}"
                type="button"
                style="display:flex; align-items:center; gap:8px; width:100%;
                       padding:6px 8px; border-radius:10px;
                       border:1px solid #e5e7eb;
                       background:#fff; color:#111;
                       cursor:pointer; font-size:12px; text-align:left;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:${swatch}; flex:0 0 auto;"></span>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(c)}</span>
        </button>
      `;
    })
    .join("");

  return `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
        <h4 style="margin:0 0 10px 0;">${escapeHtml(title)}</h4>
        <div class="small">Click a line (or a country in the list) to highlight. Click again to reset.</div>
      </div>

      <div style="display:flex; gap:12px; align-items:stretch;">
        <div class="trendLegend"
             style="width:220px; max-width:220px; border:1px solid #eee; border-radius:12px;
                    padding:8px; background:#fafafa; overflow:auto; max-height:${H}px;">
          <div class="small" style="margin-bottom:8px;"><strong>Countries</strong></div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${legendItems}
          </div>
        </div>

        <div style="flex:1; overflow:auto;">
          <svg class="trendSvg" data-ind="${escapeHtml(indicatorKey)}"
               width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               style="display:block; max-width:100%; height:auto;
                      background: radial-gradient(circle at 50% 40%, #1a1a1a, #0b0b0b);
                      border:1px solid #eee; border-radius:12px;">
            ${grid}
            ${xAxis}
            ${yLabels}
            ${xTickHtml}
            ${paths.join("")}
            ${focusedPointLabels}
          </svg>
        </div>
      </div>
    </div>
  `;
}

function viewTrends(planet, trendsPayload) {
  const years = Array.isArray(trendsPayload?.years) ? trendsPayload.years : [];
  const countries = Array.isArray(trendsPayload?.countries) ? trendsPayload.countries : [];

  // Remove Population graph
  const allIndicators = Array.isArray(trendsPayload?.indicators) ? trendsPayload.indicators : [];
  const indicators = allIndicators.filter((ind) => String(ind?.key || "").trim() !== "population");

  const yLabel = years.length ? `Year 1 → Year ${years[years.length - 1]}` : "Year 1 → Current Year";
  const focused = app?.dataset?.trendFocus || "";

  const charts = indicators
    .map((ind) => {
      const key = String(ind?.key || "").trim();
      const label = String(ind?.label || key || "Indicator").trim();
      const series = ind?.series || {};
      return buildTrendSvg({
        indicatorKey: key,
        title: label,
        years,
        countries,
        seriesMap: series,
        focusedCountry: focused || "",
        valueFormatter: trendValueFormatterForKey(key),
      });
    })
    .join("");

  return `
    ${planetHeader(planet, trendsPayload)}

    <section class="card">
      <h3 class="sectionTitle">Trends</h3>
      <div class="small">
        ${escapeHtml(yLabel)} • One chart per indicator • Click to highlight a country across all charts.
      </div>
      <div class="small" style="margin-top:8px;">
        Highlighted country: <strong id="trendFocusName">${escapeHtml(focused || "None")}</strong>
        <button id="trendClearBtn" type="button"
                style="margin-left:10px; padding:6px 10px; border-radius:10px; border:1px solid #ddd;
                       background:#fff; color:#111; cursor:pointer;">
          Clear
        </button>
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">All indicators</h3>
      <div style="display:grid; gap:14px; margin-top:12px;">
        ${charts || `<div class="small">No indicators found.</div>`}
      </div>
    </section>
  `;
}

function attachTrendHandlers(trendsPayload, planet) {
  if (!app) return;

  function setFocus(countryNameOrBlank) {
    app.dataset.trendFocus = countryNameOrBlank ? String(countryNameOrBlank) : "";
    app.innerHTML = viewTrends(planet, trendsPayload);
    attachTrendHandlers(trendsPayload, planet);
  }

  const clearBtn = document.getElementById("trendClearBtn");
  if (clearBtn) clearBtn.addEventListener("click", () => setFocus(""));

  document.querySelectorAll(".trendLine[data-country]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const c = el.getAttribute("data-country") || "";
      const now = normalizeId(app.dataset.trendFocus || "");
      const next = now && normalizeId(c) === now ? "" : c;
      setFocus(next);
    });
  });

  document.querySelectorAll(".trendLegendItem[data-country]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const c = btn.getAttribute("data-country") || "";
      const now = normalizeId(app.dataset.trendFocus || "");
      const next = now && normalizeId(c) === now ? "" : c;
      setFocus(next);
    });
  });
}

/* =========================================================
   NEW: Forex chart + calculator (Trade page)
========================================================= */

function getForexFromTradePayload(tradePayload) {
  // Apps Script returns forex at tradePayload.forex when ok
  const fx = tradePayload?.forex || null;
  const items = Array.isArray(fx?.items) ? fx.items : [];
  const currencies = Array.isArray(fx?.currencies) ? fx.currencies : [];
  const currencyMap = fx?.currencyMap && typeof fx.currencyMap === "object" ? fx.currencyMap : {};
  return { fx, items, currencies, currencyMap };
}

function buildForexSeriesMap(items) {
  const seriesMap = {};
  const countries = [];
  (items || []).forEach((it) => {
    const name = String(it?.name || "").trim();
    const series = Array.isArray(it?.series) ? it.series : [];
    if (!name) return;
    countries.push(name);
    seriesMap[name] = series.map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    });
  });
  countries.sort((a, b) => String(a).localeCompare(String(b)));
  return { countries, seriesMap };
}

function viewForexSection(tradePayload) {
  const yNum = Number(tradePayload?.year);
  const currentYear = Number.isFinite(yNum) ? Math.max(1, Math.min(6, yNum)) : 1;
  const years = Array.from({ length: currentYear }, (_, i) => i + 1);

  const { fx, items, currencies } = getForexFromTradePayload(tradePayload);

  if (!fx) {
    const err = tradePayload?.forexError ? String(tradePayload.forexError) : "";
    return `
      <section class="card">
        <h3 class="sectionTitle">Foreign Exchange</h3>
        <div class="small">No FOREX data found for this planet.</div>
        ${err ? `<div class="small" style="margin-top:8px;"><strong>Error:</strong> ${escapeHtml(err)}</div>` : ""}
      </section>
    `;
  }

  if (!items.length) {
    return `
      <section class="card">
        <h3 class="sectionTitle">Foreign Exchange</h3>
        <div class="small">FOREX tab is present, but it has no country rows yet.</div>
      </section>
    `;
  }

  const focused = app?.dataset?.fxFocus || "";
  const yLabel = `Year 1 → Year ${currentYear}`;

  const { countries, seriesMap } = buildForexSeriesMap(items);

  const chartHtml = buildTrendSvg({
    indicatorKey: "forex-usd-per-unit",
    title: "Currency Value vs USD (USD per 1 unit)",
    years,
    countries,
    seriesMap,
    focusedCountry: focused,
    valueFormatter: fmtUsdPerUnit,
    width: 940,
    height: 360,
  });

  // Calculator options
  const opts = currencies
    .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
    .join("");

  return `
    <section class="card">
      <h3 class="sectionTitle">Foreign Exchange</h3>
      <div class="small">
        ${escapeHtml(yLabel)} • Click a country to highlight its currency value trend.
      </div>

      <div class="small" style="margin-top:8px;">
        Highlighted country: <strong id="fxFocusName">${escapeHtml(focused || "None")}</strong>
        <button id="fxClearBtn" type="button"
                style="margin-left:10px; padding:6px 10px; border-radius:10px; border:1px solid #ddd;
                       background:#fff; color:#111; cursor:pointer;">
          Clear
        </button>
      </div>

      <div style="margin-top:12px;">
        ${chartHtml}
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Exchange Rate Calculator</h3>
      <div class="small">Uses the <strong>current year</strong> forex values for this planet.</div>

      <div class="hstack" style="gap:12px; align-items:center; margin-top:12px; flex-wrap:wrap;">
        <div class="small"><strong>Convert:</strong></div>

        <select id="fxFrom" style="padding:8px 10px; border-radius:10px; border:1px solid #ddd;">
          ${opts}
        </select>

        <div class="small">to</div>

        <select id="fxTo" style="padding:8px 10px; border-radius:10px; border:1px solid #ddd;">
          ${opts}
        </select>

        <button id="fxSwapBtn" type="button"
                style="padding:8px 12px; border-radius:10px; border:1px solid #ddd;
                       background:#fff; color:#111; cursor:pointer;">
          Swap
        </button>
      </div>

      <div id="fxResult" class="card" style="margin-top:12px; box-shadow:none; border:1px solid #eee;">
        <div class="small">Select two currencies to see the current exchange rate.</div>
      </div>
    </section>
  `;
}

function attachForexHandlers(tradePayload) {
  if (!app) return;

  const { fx, currencyMap } = getForexFromTradePayload(tradePayload);
  if (!fx) return;

  function setFxFocus(countryNameOrBlank) {
    app.dataset.fxFocus = countryNameOrBlank ? String(countryNameOrBlank) : "";
    // Re-render ONLY the trade page content (we are on trade route)
    // The router will rebind handlers after we call renderTradeView_ below.
    renderTradeView_(tradePayload);
  }

  const clearBtn = document.getElementById("fxClearBtn");
  if (clearBtn) clearBtn.addEventListener("click", () => setFxFocus(""));

  // Note: buildTrendSvg uses .trendLine + .trendLegendItem
  // Since Trade page also contains pies, this selector is safe:
  document.querySelectorAll(".trendSvg[data-ind='forex-usd-per-unit'] .trendLine[data-country]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const c = el.getAttribute("data-country") || "";
      const now = normalizeId(app.dataset.fxFocus || "");
      const next = now && normalizeId(c) === now ? "" : c;
      setFxFocus(next);
    });
  });

  document.querySelectorAll(".trendLegendItem[data-ind='forex-usd-per-unit'][data-country]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const c = btn.getAttribute("data-country") || "";
      const now = normalizeId(app.dataset.fxFocus || "");
      const next = now && normalizeId(c) === now ? "" : c;
      setFxFocus(next);
    });
  });

  // Calculator
  const fromSel = document.getElementById("fxFrom");
  const toSel = document.getElementById("fxTo");
  const swapBtn = document.getElementById("fxSwapBtn");
  const out = document.getElementById("fxResult");
  if (!fromSel || !toSel || !out) return;

  function computeRate(fromId, toId) {
    const A = currencyMap?.[fromId];
    const B = currencyMap?.[toId];
    const aUsd = Number(A?.usdPerUnit);
    const bUsd = Number(B?.usdPerUnit);
    if (!Number.isFinite(aUsd) || !Number.isFinite(bUsd) || bUsd === 0) return null;
    return aUsd / bUsd;
  }

  function renderRate() {
    const fromId = fromSel.value;
    const toId = toSel.value;
    if (!fromId || !toId) return;

    const A = currencyMap?.[fromId];
    const B = currencyMap?.[toId];
    const rate = computeRate(fromId, toId);

    if (!A || !B || rate === null) {
      out.innerHTML = `<div class="small">Could not compute rate (missing forex values).</div>`;
      return;
    }

    const inv = rate !== 0 ? 1 / rate : null;

    out.innerHTML = `
      <div class="small" style="margin-bottom:6px;">
        <strong>Current exchange rate</strong> (Year ${escapeHtml(String(A.year ?? tradePayload?.year ?? ""))})
      </div>

      <div style="font-size:18px; font-weight:800; margin-bottom:6px;">
        1 ${escapeHtml(A.currencyName || A.countryName)} = ${escapeHtml(fmtFxRate(rate))} ${escapeHtml(
          B.currencyName || B.countryName
        )}
      </div>

      <div class="small" style="opacity:0.9;">
        USD per 1 unit:
        <strong>${escapeHtml(A.label)}</strong> = ${escapeHtml(fmtUsdPerUnit(A.usdPerUnit))} •
        <strong>${escapeHtml(B.label)}</strong> = ${escapeHtml(fmtUsdPerUnit(B.usdPerUnit))}
      </div>

      ${
        inv !== null
          ? `<div class="small" style="margin-top:6px; opacity:0.9;">
               Inverse: 1 ${escapeHtml(B.currencyName || B.countryName)} = ${escapeHtml(
              fmtFxRate(inv)
            )} ${escapeHtml(A.currencyName || A.countryName)}
             </div>`
          : ""
      }
    `;
  }

  fromSel.addEventListener("change", renderRate);
  toSel.addEventListener("change", renderRate);

  if (swapBtn) {
    swapBtn.addEventListener("click", () => {
      const a = fromSel.value;
      fromSel.value = toSel.value;
      toSel.value = a;
      renderRate();
    });
  }

  // Reasonable default: first two currencies if present
  if (fromSel.options.length > 0 && toSel.options.length > 1) {
    fromSel.selectedIndex = 0;
    toSel.selectedIndex = 1;
    renderRate();
  } else if (fromSel.options.length > 0) {
    fromSel.selectedIndex = 0;
    toSel.selectedIndex = 0;
    renderRate();
  }
}

/* =========================================================
   Views (pages)
========================================================= */

function viewChoosePlanetSkeleton() {
  const buttons = PLANETS.map(
    (p) => `<button onclick="location.hash='#/planet?planet=${encodeURIComponent(p.id)}'">${p.label}</button>`
  ).join("");

  return `
    <section class="card">
      <h2 class="heroTitle">Choose a Planet</h2>
      <p class="small">Connecting to live data…</p>
      <div class="buttonRow">${buttons}</div>
      <div id="apiStatus" style="margin-top:14px;"></div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Global GDP by Planet</h3>
      <div id="homeGdpGrid" style="margin-top:12px;"></div>
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
      <div class="small" style="margin-top:10px;"><strong>Error:</strong> ${escapeHtml(
        err?.message || String(err)
      )}</div>
    </div>
  `;
}

function planetHeader(planet, payload) {
  return `
    <section class="card">
      <div class="hstack" style="justify-content:space-between;">
        <div>
          <h2 class="heroTitle">${escapeHtml(planet.label)}</h2>
          <div class="small">Live from API • ${escapeHtml(payload.yearTokenDisplay || "")} • ${escapeHtml(
    payload.yearSheet || ""
  )}</div>
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
      ${diplomacyWebSvgFromEdges(countries, edges)}
    </section>
  `;
}

function viewPlanetOverview(planet, payload) {
  const r = payload?.rankings || {};
  const yTitle = yearTitleFromPayload(payload);
  return `
    ${planetHeader(planet, payload)}
    ${diplomacySectionFromPayload(payload)}

    <section class="card">
      <h3 class="sectionTitle">${escapeHtml(yTitle)} Rankings</h3>
      <p class="small">Click any table to expand/collapse full rankings (no page refresh).</p>
      <div class="grid2">
        ${expandableRankingsTable({ id: "overview:rgdp", title: "Real GDP", rows: r.rGDP, fmtFn: fmtUsdB })}
        ${expandableRankingsTable({ id: "overview:rgdppc", title: "Real GDP per Capita", rows: r.rGDPpc, fmtFn: (n) => fmtUsd(n, 0) })}
        ${expandableRankingsTable({ id: "overview:rgdpgrowth", title: "Real GDP Growth Rate", rows: r.rGDPGrowth, fmtFn: fmtPct })}
        ${expandableRankingsTable({ id: "overview:unemp", title: "Unemployment Rate", rows: r.unemployment, fmtFn: fmtPct })}
        ${expandableRankingsTable({ id: "overview:infl", title: "Inflation Rate", rows: r.inflation, fmtFn: fmtPct })}
        ${expandableRankingsTable({ id: "overview:budget", title: "Budget Deficit/Surplus", rows: r.budgetDeficit, fmtFn: fmtUsdB })}
        ${expandableRankingsTable({ id: "overview:debt", title: "National Debt/Fund", rows: r.nationalDebt, fmtFn: fmtUsdB })}
        ${expandableRankingsTable({ id: "overview:ffr", title: "Federal Funds Rate", rows: r.fedFundsRate, fmtFn: fmtPct })}
        ${expandableRankingsTable({ id: "overview:pop", title: "Total Population", rows: r.population, fmtFn: (n) => fmtNum(n, 0) })}
        ${expandableRankingsTable({ id: "overview:system", title: "Economic System", rows: r.economicSystem, fmtFn: (v) => escapeHtml(v) })}
      </div>
    </section>
  `;
}

function viewTrade(planet, overviewPayload, tradePayload) {
  const items = tradePayload?.trade?.items || [];
  const yTitle = yearTitleFromPayload(tradePayload);

  const freqRank = rankFromTradeItems(items, "frequency", "desc", false);
  const volRank = rankFromTradeItems(items, "volume", "desc", false);
  const expRank = rankFromTradeItems(items, "exportValue", "desc", false);
  const impRankAbs = rankFromTradeItems(items, "importValue", "desc", true);

  const freqPie = buildTradePieData(items, "frequency", (v) => fmtNum(v, 0), false, false);
  const volPie = buildTradePieData(items, "volume", (v) => fmtNum(v, 0), false, false);
  const expPie = buildTradePieData(items, "exportValue", (v) => fmtUsdB(v), false, false);
  const impPie = buildTradePieData(items, "importValue", (v) => fmtUsdB(v), true, true);

  const keyBase = `trade:${planet.id}:${tradePayload?.year ?? ""}`;

  const piesHtml = `
    <section class="card">
      <h3 class="sectionTitle">${escapeHtml(yTitle)} Trade Charts</h3>
      <div class="grid2">
        ${pieCardHtml({ cardKey: `${keyBase}:frequency`, title: "Trade Frequency", subtitle: "Hover slices for values", data: freqPie.data, total: freqPie.total, size: "small" })}
        ${pieCardHtml({ cardKey: `${keyBase}:volume`, title: "Trade Volume", subtitle: "Hover slices for values", data: volPie.data, total: volPie.total, size: "small" })}
        ${pieCardHtml({ cardKey: `${keyBase}:exports`, title: "Export Value ($B)", subtitle: "Hover slices for values", data: expPie.data, total: expPie.total, size: "small" })}
        ${pieCardHtml({ cardKey: `${keyBase}:imports`, title: "Import Value ($B)", subtitle: "ABS used for ranking + slice sizes", data: impPie.data, total: impPie.total, size: "small" })}
      </div>
    </section>
  `;

  const tablesHtml = `
    <section class="card">
      <h3 class="sectionTitle">${escapeHtml(yTitle)} Trade Overview</h3>
      <p class="small">Click any table to expand/collapse full rankings (no page refresh).</p>

      <div class="grid2">
        ${expandableRankingsTable({ id: "trade:freq", title: "Trade Frequency", rows: freqRank, fmtFn: (n) => fmtNum(n, 0) })}
        ${expandableRankingsTable({ id: "trade:vol", title: "Trade Volume", rows: volRank, fmtFn: (n) => fmtNum(n, 0) })}
        ${expandableRankingsTable({ id: "trade:exports", title: "Export Value ($B)", rows: expRank, fmtFn: fmtUsdB })}
        ${expandableRankingsTable({ id: "trade:imports", title: "Import Value ($B)", rows: impRankAbs, fmtFn: (v) => fmtUsdB(Math.abs(v)) })}
      </div>
    </section>
  `;

  const forexHtml = viewForexSection(tradePayload);

  return `
    ${planetHeader(planet, tradePayload)}
    ${diplomacySectionFromPayload(overviewPayload)}
    ${piesHtml}
    ${tablesHtml}
    ${forexHtml}
  `;
}

/**
 * Helper to re-render Trade page without re-fetching.
 * Used for fast forex focus updates.
 */
function renderTradeView_(tradePayloadCached) {
  const { path, params } = parseRoute();
  const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
  if (!planet) return;

  // We still need overview payload for diplomacy web
  // If we don't have it cached, fall back to full render() which fetches.
  const overviewJson = app?.dataset?.tradeOverviewJson;
  if (!overviewJson) {
    render();
    return;
  }

  let overviewPayload = null;
  try {
    overviewPayload = JSON.parse(overviewJson);
  } catch {
    render();
    return;
  }

  app.innerHTML = viewTrade(planet, overviewPayload, tradePayloadCached);

  attachDiplomacyTooltipHandlers();
  attachDiplomacyFocusHandlers();
  attachExpandableTableHandlers();

  document.querySelectorAll(".chartCard").forEach((card) => attachPieTooltipHandlers(card));

  // re-bind pie modal click
  document.querySelectorAll(".chartCard[data-chartkey]").forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.getAttribute("data-chartkey");
      if (!key) return;

      const overlay = document.getElementById("pieModalOverlay");
      const alreadyOpen = overlay && overlay.classList.contains("show");
      const currentKey = overlay?.getAttribute("data-key");
      if (alreadyOpen && currentKey === key) {
        hideModal();
        return;
      }

      const title = card.querySelector(".chartTitle")?.textContent || "Chart";
      const subtitle = `${yearTitleFromPayload(tradePayloadCached)} • ${planet.label}`;

      const items = tradePayloadCached?.trade?.items || [];

      let metric = null;
      if (key.endsWith(":frequency"))
        metric = { k: "frequency", fmt: (v) => fmtNum(v, 0), absSize: false, absDisp: false };
      if (key.endsWith(":volume"))
        metric = { k: "volume", fmt: (v) => fmtNum(v, 0), absSize: false, absDisp: false };
      if (key.endsWith(":exports"))
        metric = { k: "exportValue", fmt: (v) => fmtUsdB(v), absSize: false, absDisp: false };
      if (key.endsWith(":imports"))
        metric = { k: "importValue", fmt: (v) => fmtUsdB(v), absSize: true, absDisp: true };
      if (!metric) return;

      const pieData = buildTradePieData(items, metric.k, metric.fmt, metric.absSize, metric.absDisp);

      const pieLarge = pieSvgHtml({
        data: pieData.data,
        total: pieData.total,
        size: "large",
        ariaLabel: `${title} enlarged`,
      });

      const legendHtml = `
        <div class="legendCard">
          <h4 class="legendTitle">All countries</h4>
          ${legendTableHtml(pieData.data)}
        </div>
      `;

      showModal({ key, title, subtitle, pieHtml: pieLarge, legendHtml });

      const modalPie = document.getElementById("pieModalPie");
      attachPieTooltipHandlers(modalPie);
    });
  });

  // Forex handlers (focus + calculator)
  attachForexHandlers(tradePayloadCached);
}

function viewResources(planet, resPayload) {
  const worldTotals = resPayload?.resources?.worldTotals || [];
  const resources = worldTotals.map((x) => x.resource);
  const options = resources.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");

  return `
    ${planetHeader(planet, resPayload)}

    <section class="card">
      <h3 class="sectionTitle">Resources</h3>
      <div class="hstack" style="gap:12px; align-items:center;">
        <div class="small"><strong>Select a resource:</strong></div>
        <select id="resSelect">${options}</select>
      </div>

      <div id="resTotals" class="small" style="margin-top:10px;"></div>

      <div class="resourcesLayout" style="margin-top:12px;">
        <div class="resourcesPieBox"><div id="resPie"></div></div>
        <div class="resourcesLegendBox"><div id="resLegend"></div></div>
      </div>
    </section>
  `;
}

function attachResourcesHandlers(resPayload) {
  const sel = document.getElementById("resSelect");
  const totalsEl = document.getElementById("resTotals");
  const pieEl = document.getElementById("resPie");
  const legendEl = document.getElementById("resLegend");
  if (!sel || !totalsEl || !pieEl || !legendEl) return;

  const worldTotals = resPayload?.resources?.worldTotals || [];
  const breakdownByResource = resPayload?.resources?.breakdownByResource || {};
  const totalMap = new Map(worldTotals.map((x) => [x.resource, x.total]));

  function render(resource) {
    const total = totalMap.get(resource);
    totalsEl.innerHTML = `World total: <strong>${fmtNum(total, 0)}</strong>`;

    const breakdown = breakdownByResource[resource] || [];
    const data = (breakdown || [])
      .map((x) => ({ name: String(x.name || ""), value: Number(x.value) }))
      .filter((x) => x.name && Number.isFinite(x.value) && x.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalRes = data.reduce((s, x) => s + x.value, 0);
    if (!data.length || totalRes <= 0) {
      pieEl.innerHTML = `<div class="small">No countries possess this resource (or all values are 0).</div>`;
      legendEl.innerHTML = "";
      return;
    }

    const W = 720;
    const H = 480;
    const cx = W / 2;
    const cy = H / 2;
    const r = 185;
    let start = -Math.PI / 2;

    const slices = data.map((d, i) => {
      const ang = (d.value / totalRes) * Math.PI * 2;
      const end = start + ang;

      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = ang > Math.PI ? 1 : 0;

      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;

      const mid = (start + end) / 2;
      const lx = cx + (r + 34) * Math.cos(mid);
      const ly = cy + (r + 34) * Math.sin(mid);
      const label = `${d.name}: ${fmtNum(d.value, 0)}`;

      const color = pieColorForIndex(i, data.length);

      start = end;
      return { path, color, lx, ly, label };
    });

    pieEl.innerHTML = `
      <div class="card" style="box-shadow:none; border:1px solid #eee;">
        <h4 style="margin:0 0 10px 0; text-align:center;">${escapeHtml(
          resource
        )} holdings by country (labels show values)</h4>
        <div style="display:flex; justify-content:center;">
          <svg style="display:block; max-width:100%; height:auto;"
               width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               role="img" aria-label="Resource pie chart">
            ${slices.map((s) => `<path d="${s.path}" fill="${s.color}" opacity="0.95"></path>`).join("")}
            ${slices
              .map(
                (s) => `<text x="${s.lx}" y="${s.ly}" font-size="12" text-anchor="middle">${escapeHtml(s.label)}</text>`
              )
              .join("")}
          </svg>
        </div>
      </div>
    `;

    const legendRows = data
      .map((d, i) => {
        const color = pieColorForIndex(i, data.length);
        return `
          <tr>
            <td class="legendSwatchCell"><span class="legendSwatchBox" style="background:${color};"></span></td>
            <td class="legendName">${escapeHtml(d.name)}</td>
            <td class="legendVal">${escapeHtml(fmtNum(d.value, 0))}</td>
          </tr>
        `;
      })
      .join("");

    legendEl.innerHTML = `
      <div class="legendCard">
        <h4 class="legendTitle">Legend</h4>
        <table class="legendTable"><tbody>${legendRows}</tbody></table>
      </div>
    `;
  }

  render(sel.value);
  sel.addEventListener("change", () => render(sel.value));
}

function viewCountriesList(planet, payload) {
  const countries = Array.isArray(payload?.countries) ? [...payload.countries] : [];
  countries.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

  const cards = countries
    .map((c) => {
      const econ = getCountryEconomicSystem(c, payload);
      const rgdp = c?.indicators?.rGDP;
      const pop = c?.indicators?.population;

      return `
        <a class="countryListCard" href="#/country?planet=${encodeURIComponent(
          planet.id
        )}&country=${encodeURIComponent(c.id || c.name)}">
          <div class="countryListHeader">
            <h4 class="countryListTitle">${escapeHtml(c?.name || "Unnamed Country")}</h4>
            <div class="countryListMeta">${escapeHtml(econ || "—")}</div>
          </div>
          <div class="small"><strong>Demonym:</strong> ${escapeHtml(c?.demonym || "—")}</div>
          <div class="small"><strong>Motto:</strong> ${escapeHtml(c?.motto || "—")}</div>
          <div class="small" style="margin-top:8px;"><strong>Real GDP:</strong> ${escapeHtml(fmtUsdB(rgdp))}</div>
          <div class="small"><strong>Population:</strong> ${escapeHtml(fmtNum(pop, 0))}</div>
        </a>
      `;
    })
    .join("");

  return `
    ${planetHeader(planet, payload)}

    <section class="card">
      <h3 class="sectionTitle">Countries</h3>
      <p class="small">Select a country to open its profile page.</p>
      <div class="countryListGrid">
        ${cards || `<div class="small">No countries found.</div>`}
      </div>
    </section>
  `;
}

function viewCountryProfile(planet, overviewPayload, tradePayload, resourcesPayload, country) {
  const yTitle = yearTitleFromPayload(overviewPayload);
  const economicSystem = getCountryEconomicSystem(country, overviewPayload);
  const stats = buildCountryStatRows(country, overviewPayload, tradePayload);
  const resources = getCountryResourcesFromPayload(resourcesPayload, country);

  const statRowsHtml = stats
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="num">${escapeHtml(row.valueText)}</td>
        <td class="num">${escapeHtml(row.rankingText)}</td>
      </tr>
    `
    )
    .join("");

  const resList =
    resources.length > 0
      ? `<ul>${resources
          .slice(0, 12)
          .map(
            (r) =>
              `<li class="small">${escapeHtml(r.name)} — <strong>${escapeHtml(
                fmtNum(r.quantity, 0)
              )}</strong></li>`
          )
          .join("")}</ul>`
      : `<div class="small">No resources listed.</div>`;

  return `
    ${planetHeader(planet, overviewPayload)}

    <section class="card">
      <div class="countryProfileTop">
        <div>
          <div class="small" style="margin-bottom:8px;">
            <a class="inline" href="#/countries?planet=${encodeURIComponent(planet.id)}">← Back to Countries</a>
          </div>
          <h2 class="heroTitle" style="margin-bottom:10px;">${escapeHtml(country?.name || "Country")}</h2>
          <div class="countryMetaGrid">
            <div class="countryMetaItem">
              <div class="countryMetaLabel">Economic System</div>
              <div class="countryMetaValue">${escapeHtml(economicSystem)}</div>
            </div>
            <div class="countryMetaItem">
              <div class="countryMetaLabel">Demonym</div>
              <div class="countryMetaValue">${escapeHtml(country?.demonym || "—")}</div>
            </div>
            <div class="countryMetaItem countryMetaWide">
              <div class="countryMetaLabel">Motto</div>
              <div class="countryMetaValue">${escapeHtml(country?.motto || "—")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 class="sectionTitle">Top Resources</h3>
      ${resList}
    </section>

    <section class="card">
      <h3 class="sectionTitle">${escapeHtml(yTitle)} Key Economic Data</h3>
      <p class="small">Each row shows the country value and its global ranking for the current year when available.</p>
      <table class="table">
        <thead>
          <tr>
            <th>Metric</th>
            <th class="num">Value</th>
            <th class="num">Global Rank</th>
          </tr>
        </thead>
        <tbody>
          ${statRowsHtml}
        </tbody>
      </table>
    </section>
  `;
}

/* =========================================================
   Loading / error
========================================================= */

function viewLoading(msg) {
  return `<section class="card"><h2 class="heroTitle">${escapeHtml(
    msg
  )}</h2><p class="small">Loading…</p></section>`;
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

/* =========================================================
   Router
========================================================= */

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

    renderHomeGdpPies();
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
      attachExpandableTableHandlers();
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  if (path === "/trends") {
    const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
    setNav(planet, "trends");
    app.innerHTML = viewLoading(`Loading Trends • ${planet.label}`);

    try {
      const trendsPayload = await fetchPlanetTrends(planet.id);
      if (!trendsPayload?.ok) throw new Error(trendsPayload?.error || "Trends ok=false");

      if (!app.dataset.trendFocus) app.dataset.trendFocus = "";

      app.innerHTML = viewTrends(planet, trendsPayload);
      attachTrendHandlers(trendsPayload, planet);
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
      const [overviewPayload, tradePayload] = await Promise.all([
        fetchPlanetOverview(planet.id),
        fetchPlanetTrade(planet.id),
      ]);

      if (!overviewPayload?.ok) throw new Error(overviewPayload?.error || "Overview ok=false");
      if (!tradePayload?.ok) throw new Error(tradePayload?.error || "Trade ok=false");

      // Initialize forex focus storage
      if (!app.dataset.fxFocus) app.dataset.fxFocus = "";

      // Cache overview in dataset so forex focus can re-render without re-fetching
      app.dataset.tradeOverviewJson = JSON.stringify(overviewPayload);

      app.innerHTML = viewTrade(planet, overviewPayload, tradePayload);

      attachDiplomacyTooltipHandlers();
      attachDiplomacyFocusHandlers();
      attachExpandableTableHandlers();

      document.querySelectorAll(".chartCard").forEach((card) => attachPieTooltipHandlers(card));

      document.querySelectorAll(".chartCard[data-chartkey]").forEach((card) => {
        card.addEventListener("click", () => {
          const key = card.getAttribute("data-chartkey");
          if (!key) return;

          const overlay = document.getElementById("pieModalOverlay");
          const alreadyOpen = overlay && overlay.classList.contains("show");
          const currentKey = overlay?.getAttribute("data-key");
          if (alreadyOpen && currentKey === key) {
            hideModal();
            return;
          }

          const title = card.querySelector(".chartTitle")?.textContent || "Chart";
          const subtitle = `${yearTitleFromPayload(tradePayload)} • ${planet.label}`;

          const items = tradePayload?.trade?.items || [];

          let metric = null;
          if (key.endsWith(":frequency"))
            metric = { k: "frequency", fmt: (v) => fmtNum(v, 0), absSize: false, absDisp: false };
          if (key.endsWith(":volume"))
            metric = { k: "volume", fmt: (v) => fmtNum(v, 0), absSize: false, absDisp: false };
          if (key.endsWith(":exports"))
            metric = { k: "exportValue", fmt: (v) => fmtUsdB(v), absSize: false, absDisp: false };
          if (key.endsWith(":imports"))
            metric = { k: "importValue", fmt: (v) => fmtUsdB(v), absSize: true, absDisp: true };
          if (!metric) return;

          const pieData = buildTradePieData(items, metric.k, metric.fmt, metric.absSize, metric.absDisp);

          const pieLarge = pieSvgHtml({
            data: pieData.data,
            total: pieData.total,
            size: "large",
            ariaLabel: `${title} enlarged`,
          });

          const legendHtml = `
            <div class="legendCard">
              <h4 class="legendTitle">All countries</h4>
              ${legendTableHtml(pieData.data)}
            </div>
          `;

          showModal({ key, title, subtitle, pieHtml: pieLarge, legendHtml });

          const modalPie = document.getElementById("pieModalPie");
          attachPieTooltipHandlers(modalPie);
        });
      });

      // Forex (focus + calculator)
      attachForexHandlers(tradePayload);
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
      const resPayload = await fetchPlanetResources(planet.id);
      if (!resPayload?.ok) throw new Error(resPayload?.error || "Resources ok=false");

      app.innerHTML = viewResources(planet, resPayload);
      attachResourcesHandlers(resPayload);
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  if (path === "/countries") {
    const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
    setNav(planet, "countries");
    app.innerHTML = viewLoading(`Loading Countries • ${planet.label}`);

    try {
      const payload = await fetchPlanetOverview(planet.id);
      if (!payload?.ok) throw new Error(payload?.error || "API returned ok=false");

      app.innerHTML = viewCountriesList(planet, payload);
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  if (path === "/country") {
    const planet = findPlanet(params.get("planet")) || getDefaultPlanet();
    const countryKey = params.get("country");

    setNav(planet, "countries");
    app.innerHTML = viewLoading(`Loading Country • ${planet.label}`);

    try {
      const [overviewPayload, tradePayload, resourcesPayload] = await Promise.all([
        fetchPlanetOverview(planet.id),
        fetchPlanetTrade(planet.id),
        fetchPlanetResources(planet.id),
      ]);

      if (!overviewPayload?.ok) throw new Error(overviewPayload?.error || "Overview ok=false");
      if (!tradePayload?.ok) throw new Error(tradePayload?.error || "Trade ok=false");
      if (!resourcesPayload?.ok) throw new Error(resourcesPayload?.error || "Resources ok=false");

      const country = findCountryInPayload(overviewPayload, countryKey);
      if (!country) throw new Error(`Country not found: ${countryKey || "unknown"}`);

      app.innerHTML = viewCountryProfile(planet, overviewPayload, tradePayload, resourcesPayload, country);
    } catch (err) {
      console.error(err);
      app.innerHTML = viewError(err);
    }
    return;
  }

  setNav(null);
  app.innerHTML = viewChoosePlanetSkeleton();
}

window.addEventListener("hashchange", () => render());
render();
