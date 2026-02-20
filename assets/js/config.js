export const PLANETS = [
  // TEST: first to integrate
  {
    id: "test",
    label: "TEST",
    dataFile: "./assets/data/test.json",   // <-- NEW
    diplomacySource: null,
    dataLogSource: null,
    countries: null                        // <-- will be filled after fetch
  },

  // Real planets (wire later)
  { id: "parallax", label: "Parallax", dataFile: null, diplomacySource: null, dataLogSource: null, countries: null },
  { id: "cyqs",     label: "Cyq’s",     dataFile: null, diplomacySource: null, dataLogSource: null, countries: null },
  { id: "sevyr",    label: "Sevyr",     dataFile: null, diplomacySource: null, dataLogSource: null, countries: null },
  { id: "octavium", label: "Octavium",  dataFile: null, diplomacySource: null, dataLogSource: null, countries: null },
];

export const RELATIONSHIP_STYLES = {
  ally:     { label: "Allies",   color: "#3b82f6" }, // blue
  rival:    { label: "Rivalry",  color: "#f59e0b" }, // orange
  enemy:    { label: "Enemy",    color: "#ef4444" }, // red
  neutral:  { label: "Neutral",  color: "#a3a3a3" }, // gray
  friendly: { label: "Friendly", color: "#22c55e" }, // green
};
