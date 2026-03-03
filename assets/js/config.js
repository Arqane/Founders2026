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

// Diplomacy relationship styles
export const RELATIONSHIP_STYLES = {
  ally:     { label: "Ally",     color: "#2563eb" }, // blue
  friendly: { label: "Friendly", color: "#22c55e" },
  neutral:  { label: "Neutral",  color: "#6b7280" },
  tense:    { label: "Tense",    color: "#f59e0b" },
  hostile:  { label: "Hostile",  color: "#ef4444" },
};
