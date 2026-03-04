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
   Diplomacy Web (centered) + focus disables tooltip on dim edges
========================================================= */

function legendHtml() {
  const items = Object.entries(RELATIONSHIP_STYLES)
    .map(
      ([, v]) =>
        `<div class="legendItem"><span class="legendSwatch" style="background:${v.color}"></span>${v.label}</div>`
    )
    .join("");
  return `<div class="graphLegend">${items}</div>`;
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
    // ✅ Only show tooltip for non-dim edges (when focused, dim edges will not pop up)
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
   Trade chart helpers
========================================================= */

function topN(items, key, n = 10, useAbs = false) {
  return (items || [])
    .map((x) => {
      const v = Number(x[key]);
      if (!Number.isFinite(v)) return null;
      return { ...x, _v: v, _sv: useAbs ? Math.abs(v) : v };
    })
    .filter(Boolean)
    .sort((a, b) => b._sv - a._sv)
    .slice(0, n);
}

function barChartHtml(title, items, key, fmtFn, useAbs = false) {
  const top = topN(items, key, 10, useAbs);
  if (!top.length) return `<div class="small">No data for ${escapeHtml(title)}.</div>`;

  const max = Math.max(...top.map((x) => x._sv), 1);

  const rows = top
    .map((x) => {
      const pct = Math.max(0, Math.min(100, (x._sv / max) * 100));
      return `
        <div class="barRow" style="display:grid; grid-template-columns: 1fr 2.2fr auto; gap:10px; align-items:center; margin:8px 0;">
          <div class="small" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(
            x.name
          )}</div>
          <div class="barTrack" style="height:10px; border-radius:999px; background:rgba(148,163,184,0.25); overflow:hidden;">
            <div class="barFill" style="height:100%; width:${pct.toFixed(
              1
            )}%; background:rgba(148,163,184,0.95);"></div>
          </div>
          <div class="small num" style="white-space:nowrap; text-align:right;">${fmtFn(x._v)}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <h4 style="margin:0 0 10px 0;">${escapeHtml(title)}</h4>
      <div class="barChart">${rows}</div>
    </div>
  `;
}

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

/* =========================================================
   Resources (bigger centered pie + compact legend)
========================================================= */

function pieColorForIndex(i, n) {
  const hue = Math.round((360 * i) / Math.max(1, n));
  return `hsl(${hue} 70% 55%)`;
}

function pieRender(breakdown, title) {
  const data = (breakdown || [])
    .map((x) => ({ name: String(x.name || ""), value: Number(x.value) }))
    .filter((x) => x.name && Number.isFinite(x.value) && x.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, x) => s + x.value, 0);
  if (!data.length || total <= 0) {
    return { pieHtml: `<div class="small">No countries possess this resource (or all values are 0).</div>`, legendHtml: "" };
  }

  const W = 720;
  const H = 480;
  const cx = W / 2;
  const cy = H / 2;
  const r = 185;

  let start = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const ang = (d.value / total) * Math.PI * 2;
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

  const pieHtml = `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <h4 style="margin:0 0 10px 0; text-align:center;">${escapeHtml(title)}</h4>
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
          <td style="width:22px;">
            <span style="display:inline-block;width:12px;height:12px;border-radius:4px;background:${color};"></span>
          </td>
          <td style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px;">${escapeHtml(d.name)}</td>
          <td class="num" style="white-space:nowrap;">${fmtNum(d.value, 0)}</td>
        </tr>
      `;
    })
    .join("");

  const legendHtml = `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <h4 style="margin:0 0 10px 0;">Legend</h4>
      <table class="table">
        <thead><tr><th></th><th>Country</th><th class="num">Amount</th></tr></thead>
        <tbody>${legendRows}</tbody>
      </table>
    </div>
  `;

  return { pieHtml, legendHtml };
}

/* =========================================================
   Home page GDP pies (2x2) — one per planet (exclude TEST)
========================================================= */

function gdpBreakdownFromPlanetPayload(payload, topNCount = 10) {
  const r = payload?.rankings?.rGDP;
  const list = Array.isArray(r) ? r : [];

  const rows = list
    .map((x) => ({ name: String(x.name || "").trim(), value: Number(x.value) }))
    .filter((x) => x.name && Number.isFinite(x.value) && x.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = rows.reduce((s, x) => s + x.value, 0);

  const top = rows.slice(0, topNCount);
  const restSum = rows.slice(topNCount).reduce((s, x) => s + x.value, 0);
  if (restSum > 0) top.push({ name: "Other", value: restSum });

  return { total, breakdown: top };
}

function gdpPieCardHtml({ planetLabel, totalGdp, breakdown }) {
  // Smallish pie per planet (fits 2x2)
  const data = (breakdown || [])
    .map((d) => ({ name: d.name, value: Number(d.value) }))
    .filter((d) => d.name && Number.isFinite(d.value) && d.value > 0);

  if (!data.length || !(totalGdp > 0)) {
    return `
      <div class="card" style="box-shadow:none; border:1px solid #eee;">
        <h4 style="margin:0 0 4px 0;">${escapeHtml(planetLabel)}</h4>
        <div class="small">Global GDP: —</div>
        <div class="small" style="margin-top:10px;">No GDP data.</div>
      </div>
    `;
  }

  const W = 420;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const r = 110;

  let start = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const ang = (d.value / totalGdp) * Math.PI * 2;
    const end = start + ang;

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = ang > Math.PI ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const color = pieColorForIndex(i, data.length);

    // Labels: keep readable — show top slices only (exclude "Other" label if too busy)
    const mid = (start + end) / 2;
    const lx = cx + (r + 26) * Math.cos(mid);
    const ly = cy + (r + 26) * Math.sin(mid);
    const label =
      d.name === "Other"
        ? `Other: ${fmtUsdB(d.value)}`
        : `${d.name}: ${fmtUsdB(d.value)}`;

    start = end;
    return { path, color, lx, ly, label };
  });

  // Reduce label count if there are too many slices
  const labelEvery = data.length > 12 ? 2 : 1;

  return `
    <div class="card" style="box-shadow:none; border:1px solid #eee;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; gap:10px;">
        <h4 style="margin:0 0 2px 0;">${escapeHtml(planetLabel)}</h4>
      </div>
      <div class="small" style="margin-bottom:8px;">Global GDP: <strong>${escapeHtml(fmtUsdB(totalGdp))}</strong></div>
      <div style="display:flex; justify-content:center;">
        <svg style="display:block; max-width:100%; height:auto;"
             width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
             role="img" aria-label="${escapeHtml(planetLabel)} GDP pie chart">
          ${slices.map((s) => `<path d="${s.path}" fill="${s.color}" opacity="0.95"></path>`).join("")}
          ${slices
            .map((s, idx) => {
              if (idx % labelEvery !== 0) return "";
              return `<text x="${s.lx}" y="${s.ly}" font-size="11" text-anchor="middle">${escapeHtml(s.label)}</text>`;
            })
            .join("")}
        </svg>
      </div>
      <div class="small" style="text-align:center; margin-top:6px;">Country shares (labels show values)</div>
    </div>
  `;
}

async function renderHomeGdpPies() {
  const grid = document.getElementById("homeGdpGrid");
  if (!grid) return;

  // 2x2 should be Parallax, Cyq`s, Sevyr, Octavium (exclude TEST)
  const planetsForGrid = PLANETS.filter((p) => p.id !== "test").slice(0, 4);

  grid.innerHTML = `<div class="small">Loading GDP pies…</div>`;

  try {
    const payloads = await Promise.all(
      planetsForGrid.map((p) => fetchPlanetOverview(p.id).catch((err) => ({ ok: false, error: err?.message || String(err) })))
    );

    const cards = payloads.map((pl, idx) => {
      const planetLabel = planetsForGrid[idx]?.label || "Planet";
      if (!pl?.ok) {
        return `
          <div class="card" style="box-shadow:none; border:1px solid #ef4444;">
            <h4 style="margin:0 0 4px 0;">${escapeHtml(planetLabel)}</h4>
            <div class="small">Couldn’t load GDP.</div>
            <div class="small" style="margin-top:8px;"><strong>Error:</strong> ${escapeHtml(pl?.error || "Unknown error")}</div>
          </div>
        `;
      }

      const { total, breakdown } = gdpBreakdownFromPlanetPayload(pl, 10);
      return gdpPieCardHtml({ planetLabel, totalGdp: total, breakdown });
    });

    grid.innerHTML = `<div class="grid2">${cards.join("")}</div>`;
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
      <p class="small">One pie per planet (2×2). Title = planet name. Subtitle = global GDP.</p>
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

  return `
    ${planetHeader(planet, tradePayload)}
    ${diplomacySectionFromPayload(overviewPayload)}

    <section class="card">
      <h3 class="sectionTitle">${escapeHtml(yTitle)} Trade Overview</h3>
      <p class="small">Click any table to expand/collapse full rankings (no page refresh).</p>

      <div class="grid2">
        ${expandableRankingsTable({ id: "trade:freq", title: "Trade Frequency", rows: freqRank, fmtFn: (n) => fmtNum(n, 0) })}
        ${expandableRankingsTable({ id: "trade:vol", title: "Trade Volume", rows: volRank, fmtFn: (n) => fmtNum(n, 0) })}
        ${expandableRankingsTable({ id: "trade:exports", title: "Export Value ($B)", rows: expRank, fmtFn: fmtUsdB })}
        ${expandableRankingsTable({ id: "trade:imports", title: "Import Value ($B)", rows: impRankAbs, fmtFn: fmtUsdB })}
      </div>

      <div style="margin-top:14px;">
        <h4 style="margin:0 0 10px 0;">Trade Charts (Top 10)</h4>
        <div class="grid2">
          ${barChartHtml("Trade Frequency", items, "frequency", (v) => fmtNum(v, 0))}
          ${barChartHtml("Trade Volume", items, "volume", (v) => fmtNum(v, 0))}
          ${barChartHtml("Export Value ($B)", items, "exportValue", fmtUsdB)}
          ${barChartHtml("Import Value ($B)", items, "importValue", fmtUsdB, true)}
        </div>
      </div>
    </section>
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

      <div class="grid2" style="margin-top:12px; align-items:start;">
        <div id="resPie"></div>
        <div id="resLegend"></div>
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
    const { pieHtml, legendHtml } = pieRender(breakdown, `${resource} holdings by country (labels show values)`);

    pieEl.innerHTML = pieHtml;
    legendEl.innerHTML = legendHtml;
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

    // ✅ Add GDP pies (2x2) under planet selection
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

      attachDiplomacyTooltipHandlers();
      attachDiplomacyFocusHandlers();
      attachExpandableTableHandlers();
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
