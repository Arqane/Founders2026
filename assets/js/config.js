// assets/js/config.js

export const API_BASE =
  "https://script.google.com/macros/s/AKfycbwZ-QIjMGQsmeS_z8WDtzndBcJ5XfsYPPoMsINuVPBAo0zm3TK7rDq4CaRNynTB1Unm/exec";

export const PLANETS = [
  { id: "test",     label: "TEST",     spreadsheetId: "1TkHl3TI0ADTgnOOykI8AEJY1JxIO1nKgCBroI25cuCQ" },
  { id: "parallax", label: "Parallax", spreadsheetId: "1JdpKT4ojvIonDcqns0vIiCmY99I4d9FI6M8LoONfWAA" },
  { id: "cyqs",     label: "Cyq`s",    spreadsheetId: "1A3muixDdn4Z62YxX6YexukNci1E8RzHGu_5z11Csdwg" },
  { id: "sevyr",    label: "Sevyr",    spreadsheetId: "10KK5Pam7HI6EEY0SGlGQFXxoa0rVJ6eQ4v0YVlP4oJA" },
  { id: "octavium", label: "Octavium", spreadsheetId: "1v4dM17_x9aWs5bb6TF64JbSvcf3VOcn3fsEnQyTK7_k" },
];

// Planets to show on the HOME GDP pie grid (2x2). (Exclude TEST.)
export const HOME_PLANET_IDS = ["parallax", "cyqs", "sevyr", "octavium"];

// GDP pie behavior (used on home page)
export const HOME_GDP_PIE = {
  groupOtherBelowFraction: 0.03,
  maxSlicesBeforeGrouping: 10,
};

// Diplomacy relationship styles
export const RELATIONSHIP_STYLES = {
  ally:     { label: "Ally",     color: "#2563eb" },
  friendly: { label: "Friendly", color: "#22c55e" },
  neutral:  { label: "Neutral",  color: "#374151" },
  tense:    { label: "Tense",    color: "#facc15" },
  hostile:  { label: "Hostile",  color: "#f97316" },
  war:      { label: "War",      color: "#ef4444" },
};
