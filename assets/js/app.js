// assets/js/app.js
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

  document.getElementById("pieModalClose").addEventListener("click", () => hideModal());

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
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(active === "overview")}">
        Overview
      </a>
      <a class="navTab" href="#/trade?planet=${encodeURIComponent(planet.id)}"
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(active === "trade")}">
        Trade
      </a>
      <a class="navTab" href="#/resources?planet=${encodeURIComponent(planet.id)}"
         style="padding:8px 12px;border-radius:10px;text-decoration:none;${tabStyle(active === "resources")}">
        Resources
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
  return fetchJson(`${API_BASE}?view=planet&planet=${encodeURIComponent(planetId)}&nocache=1`);
}

async function fetchPlanetTrade(planetId) {
  return fetchJson(`${API_BASE}?view=trade&planet=${encodeURIComponent(planetId)}&nocache=1`);
}

async function fetchPlanetResources(planetId) {
  return fetchJson(`${API_BASE}?view=resources&planet=${encodeURIComponent(planetId)}&nocache=1`);
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
  // Input is "billions" (e.g., 4172 means $4,172B). Output is "$4.2T"
  if (n === null || n === undefined || n === "") return "—";
  const b = Number(n);
  if (!Number.isFinite(b)) return "—";
  const t = b / 1000;
  return `$${t.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}T`;
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

/* =========================================================
   Generic Pie (SVG) + tooltip (country + value)
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
  // container should contain .pieWrap + svg + paths with data-tip
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

/**
 * Build a pie SVG. No labels on slices. Tooltip text stored in data-tip.
 * data: [{name, value, displayValueText, sortValue?}]
 * total: sum of sortValue (or value)
 */
function pieSvgHtml({ data, total, size, ariaLabel }) {
  if (!Array.isArray(data) || !data.length || !(total > 0)) {
    return `<div class="small">No data.</div>`;
  }

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
          .map((s) => `<path d="${s.path}" fill="${s.color}" opacity="0.95" data-tip="${escapeHtml(s.tip)}"></path>`)
          .join("")}
      </svg>
      <!-- tooltip div injected by JS -->
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

  return `
    <table class="legendTable">
      <tbody>${rows}</tbody>
    </table>
  `;
}

/* =========================================================
   Diplomacy Web (unchanged rules)
========================================================= */

function legendHtml() {
  const items = Object.entries(RELATIONSHIP_STYLES)
    .map(
      ([, v]) =>
        `<div class="legendItem"><span class="legendSwatch" style="background:${v.color}"></span>${v.label}</div>`
    )
    .join("");
  //return `<div class="graphLegend">${items}</div>`;
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
    .map((e) => {
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
    })
    .join("");

  const nodeGroups = nodes
    .map(
      (nn) => `
      <g class="dipNode" data-id="${escapeHtml(nn.id)}">
        <circle class="nodeCircle" cx="${nn.x.toFixed(2)}" cy="${nn.y.toFixed(2)}" r="18" fill="rgba(255,255,255,0.08)"></circle>
        <circle class="nodeDot" cx="${nn.x.toFixed(2)}" cy="${nn.y.toFixed(2)}" r="12" fill="rgba(255,255,255,0.85)"></circle>
        <text class="nodeLabel" x="${nn.x.toFixed(2)}" y="${(nn.y + 34).toFixed(2)}" text-anchor="middle">${escapeHtml(nn.name)}</text>
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
   Expandable tables WITHOUT page refresh
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
    <div class="card expTable ${expanded ? "expanded" : ""}" data-exp="${escapeHtml(
      id
    )}" data-hinton="${escapeHtml(hintOn)}" data-hintoff="${escapeHtml(hintOff)}"
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

  const total = data.reduce((s, d) => s + (Number.isFinite(Number(d.sortValue)) ? Number(d.sortValue) : Number(d.value)), 0);
  return { data, total };
}

function pieCardHtml({ cardKey, title, subtitle, data, total, size }) {
  const pie = pieSvgHtml({
    data,
    total,
    size,
    ariaLabel: title,
  });

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
   Home page GDP pies (2x2) — exclude TEST
========================================================= */

function getCountryGdpFromCountryObj(c) {
  const candidates = ["realGdp", "rgdp", "real_gdp", "gdp", "realGDP", "RealGDP", "Real Gdp"];
  for (const k of candidates) {
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

      const pieSmall = pieSvgHtml({
        data,
        total,
        size: "small",
        ariaLabel: `${planetLabel} GDP`,
      });

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

    // tooltips for all home pies
    Array.from(grid.querySelectorAll(".homePlanetCard")).forEach((card) => {
      attachPieTooltipHandlers(card);
    });

    // click-to-enlarge
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

        // tooltip in modal pie
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
   Views
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
        ${expandableRankingsTable({
          id: "overview:rgdppc",
          title: "Real GDP per Capita",
          rows: r.rGDPpc,
          fmtFn: (n) => fmtUsd(n, 0),
        })}
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

  // Pie charts above tables (replace bar charts)
  const freqPie = buildTradePieData(items, "frequency", (v) => fmtNum(v, 0), false, false);
  const volPie = buildTradePieData(items, "volume", (v) => fmtNum(v, 0), false, false);
  const expPie = buildTradePieData(items, "exportValue", (v) => fmtUsdB(v), false, false);
  // imports: sizes and display use ABS
  const impPie = buildTradePieData(items, "importValue", (v) => fmtUsdB(v), true, true);

  const keyBase = `trade:${planet.id}:${tradePayload?.year ?? ""}`;

  const piesHtml = `
    <section class="card">
      <h3 class="sectionTitle">${escapeHtml(yTitle)} Trade Charts</h3>
      <div class="grid2">
        ${pieCardHtml({
          cardKey: `${keyBase}:frequency`,
          title: "Trade Frequency",
          subtitle: "Hover slices for values",
          data: freqPie.data,
          total: freqPie.total,
          size: "small",
        })}
        ${pieCardHtml({
          cardKey: `${keyBase}:volume`,
          title: "Trade Volume",
          subtitle: "Hover slices for values",
          data: volPie.data,
          total: volPie.total,
          size: "small",
        })}
        ${pieCardHtml({
          cardKey: `${keyBase}:exports`,
          title: "Export Value ($B)",
          subtitle: "Hover slices for values",
          data: expPie.data,
          total: expPie.total,
          size: "small",
        })}
        ${pieCardHtml({
          cardKey: `${keyBase}:imports`,
          title: "Import Value ($B)",
          subtitle: "ABS used for ranking + slice sizes",
          data: impPie.data,
          total: impPie.total,
          size: "small",
        })}
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

  return `
    ${planetHeader(planet, tradePayload)}
    ${diplomacySectionFromPayload(overviewPayload)}
    ${piesHtml}
    ${tablesHtml}
  `;
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

    // Keep your existing resource pie behavior (labels as values)
    // (Not changing this since your request was about planet + trade pies)
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

    // render resources pie with labels as values (your existing rule)
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
        <h4 style="margin:0 0 10px 0; text-align:center;">${escapeHtml(resource)} holdings by country (labels show values)</h4>
        <div style="display:flex; justify-content:center;">
          <svg style="display:block; max-width:100%; height:auto;"
               width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               role="img" aria-label="Resource pie chart">
            ${slices.map((s) => `<path d="${s.path}" fill="${s.color}" opacity="0.95"></path>`).join("")}
            ${slices.map((s) => `<text x="${s.lx}" y="${s.ly}" font-size="12" text-anchor="middle">${escapeHtml(s.label)}</text>`).join("")}
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

      app.innerHTML = viewTrade(planet, overviewPayload, tradePayload);

      // diplomacy
      attachDiplomacyTooltipHandlers();
      attachDiplomacyFocusHandlers();

      // expandable tables
      attachExpandableTableHandlers();

      // tooltips on trade pies
      document.querySelectorAll(".chartCard").forEach((card) => attachPieTooltipHandlers(card));

      // modal toggle for trade pies (same rules as home pies)
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

          // build modal from DOM content (safer than trying to re-derive)
          const title = card.querySelector(".chartTitle")?.textContent || "Chart";
          const subtitle = `${yearTitleFromPayload(tradePayload)} • ${planet.label}`;

          // Extract data-tip and colors from the small pie paths and rebuild larger pie using same data
          const paths = Array.from(card.querySelectorAll("svg[data-pie='1'] path"));
          if (!paths.length) return;

          // We'll rebuild data by reading tooltip text and using equal ordering.
          // For correct slice sizes, we need original values; we stored them in data-tip only.
          // So we rebuild from the payload instead (reliable).
          const items = tradePayload?.trade?.items || [];

          let metric = null;
          if (key.endsWith(":frequency")) metric = { k: "frequency", fmt: (v) => fmtNum(v, 0), absSize: false, absDisp: false };
          if (key.endsWith(":volume")) metric = { k: "volume", fmt: (v) => fmtNum(v, 0), absSize: false, absDisp: false };
          if (key.endsWith(":exports")) metric = { k: "exportValue", fmt: (v) => fmtUsdB(v), absSize: false, absDisp: false };
          if (key.endsWith(":imports")) metric = { k: "importValue", fmt: (v) => fmtUsdB(v), absSize: true, absDisp: true };
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

          showModal({
            key,
            title,
            subtitle,
            pieHtml: pieLarge,
            legendHtml,
          });

          const modalPie = document.getElementById("pieModalPie");
          attachPieTooltipHandlers(modalPie);
        });
      });
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

  setNav(null);
  app.innerHTML = viewChoosePlanetSkeleton();
}

window.addEventListener("hashchange", () => render());
render();
