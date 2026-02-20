function svgFlagDataUri(colors = ["#111", "#fff", "#111"], label = "") {
  const [c1, c2, c3] = colors;
  const safeLabel = (label || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="168" viewBox="0 0 280 168">
      <rect width="280" height="56" y="0" fill="${c1}"/>
      <rect width="280" height="56" y="56" fill="${c2}"/>
      <rect width="280" height="56" y="112" fill="${c3}"/>
      <text x="14" y="28" font-family="Arial" font-size="18" fill="rgba(255,255,255,.85)">${safeLabel}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PLANETS = [
  {
    id: "test",
    label: "TEST",
    diplomacySource: null,
    dataLogSource: null,

    // Local demo data so the site is fully functional while we integrate real data.
    countries: [
      {
        id: "aurora",
        name: "Aurora Directorate",
        demonym: "Aurorans",
        motto: "Order, Light, and Warm Margins",
        flagUrl: svgFlagDataUri(["#0b1320","#20c997","#0b1320"], "AURORA"),
        resources: [
          { name: "Oil", type: "Natural", share: 22 },
          { name: "Steel", type: "Capital", share: 18 },
          { name: "Aluminum", type: "Natural", share: 14 },
          { name: "Semiconductors", type: "Capital", share: 10 },
          { name: "Agriculture", type: "Natural", share: 36 },
        ],
        indicators: {
          rGDP: 1840,              // $B
          rGDPpc: 38200,           // $
          unemployment: 4.6,       // %
          inflation: 2.1,          // %
          tradeBalance: 38,        // $B (exports - imports)
        },
        diplomacy: {
          // targetId -> relationship
          helio: "ally",
          verdant: "neutral",
          nocturne: "rival",
          ember: "friendly",
        }
      },
      {
        id: "helio",
        name: "Helio Republic",
        demonym: "Helians",
        motto: "We Rise, We Build",
        flagUrl: svgFlagDataUri(["#ffb703","#111","#ffb703"], "HELIO"),
        resources: [
          { name: "Energy", type: "Natural", share: 30 },
          { name: "Cars", type: "Capital", share: 18 },
          { name: "Cement", type: "Capital", share: 14 },
          { name: "Copper", type: "Natural", share: 10 },
          { name: "Beverages", type: "Natural", share: 28 },
        ],
        indicators: { rGDP: 1620, rGDPpc: 33100, unemployment: 6.2, inflation: 3.4, tradeBalance: -22 },
        diplomacy: { aurora: "ally", verdant: "friendly", nocturne: "neutral", ember: "rival" }
      },
      {
        id: "verdant",
        name: "Verdant Union",
        demonym: "Verdants",
        motto: "Growth Is Policy",
        flagUrl: svgFlagDataUri(["#1b5e20","#e8f5e9","#1b5e20"], "VERDANT"),
        resources: [
          { name: "Agriculture", type: "Natural", share: 40 },
          { name: "Timber", type: "Natural", share: 20 },
          { name: "Textiles", type: "Capital", share: 14 },
          { name: "Cement", type: "Capital", share: 10 },
          { name: "Oil", type: "Natural", share: 16 },
        ],
        indicators: { rGDP: 980, rGDPpc: 21400, unemployment: 7.1, inflation: 1.6, tradeBalance: 12 },
        diplomacy: { aurora: "neutral", helio: "friendly", nocturne: "friendly", ember: "neutral" }
      },
      {
        id: "nocturne",
        name: "Nocturne Principality",
        demonym: "Nocturnals",
        motto: "Silence Is Strength",
        flagUrl: svgFlagDataUri(["#2b2d42","#8d99ae","#2b2d42"], "NOCTURNE"),
        resources: [
          { name: "Rare Earths", type: "Natural", share: 18 },
          { name: "Semiconductors", type: "Capital", share: 26 },
          { name: "Steel", type: "Capital", share: 20 },
          { name: "Gold", type: "Natural", share: 10 },
          { name: "Energy", type: "Natural", share: 26 },
        ],
        indicators: { rGDP: 1410, rGDPpc: 45800, unemployment: 3.8, inflation: 4.1, tradeBalance: 5 },
        diplomacy: { aurora: "rival", helio: "neutral", verdant: "friendly", ember: "enemy" }
      },
      {
        id: "ember",
        name: "Ember Federation",
        demonym: "Emberites",
        motto: "Trade First, Always",
        flagUrl: svgFlagDataUri(["#9b2226","#fefae0","#9b2226"], "EMBER"),
        resources: [
          { name: "Shipping", type: "Capital", share: 22 },
          { name: "Beverages", type: "Natural", share: 18 },
          { name: "Cars", type: "Capital", share: 16 },
          { name: "Oil", type: "Natural", share: 12 },
          { name: "Aluminum", type: "Natural", share: 32 },
        ],
        indicators: { rGDP: 1215, rGDPpc: 27400, unemployment: 5.2, inflation: 2.7, tradeBalance: 44 },
        diplomacy: { aurora: "friendly", helio: "rival", verdant: "neutral", nocturne: "enemy" }
      },
    ]
  },

  // Real planets (data wired later)
  { id: "parallax", label: "Parallax", diplomacySource: null, dataLogSource: null, countries: null },
  { id: "cyqs",     label: "Cyq’s",     diplomacySource: null, dataLogSource: null, countries: null },
  { id: "sevyr",    label: "Sevyr",    diplomacySource: null, dataLogSource: null, countries: null },
  { id: "octavium", label: "Octavium",  diplomacySource: null, dataLogSource: null, countries: null },
];

// Relationship colors for diplomacy web (matches the “vibe” of your example)
export const RELATIONSHIP_STYLES = {
  ally:     { label: "Allies",     color: "#3b82f6" }, // blue
  friendly: { label: "Friendly",   color: "#22c55e" }, // green
  neutral:  { label: "Neutral",    color: "#a3a3a3" }, // gray
  rival:    { label: "Rival",      color: "#f59e0b" }, // amber/orange
  enemy:    { label: "Enemy",      color: "#ef4444" }, // red
};
