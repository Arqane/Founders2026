// assets/js/config.js

export const API_BASE =
  "https://script.google.com/macros/s/AKfycbwZ-QIjMGQsmeS_z8WDtzndBcJ5XfsYPPoMsINuVPBAo0zm3TK7rDq4CaRNynTB1Unm/exec";

// Planets (we’ll still use this nav structure; the data will come from the API)
export const PLANETS = [
  { id: "test", label: "TEST" },
  { id: "parallax", label: "Parallax" },
  { id: "cyqs", label: "Cyq`s" },
  { id: "sevyr", label: "Sevyr" },
  { id: "octavium", label: "Octavium" },
];

// Diplomacy relationship styles (adjust as needed)
export const RELATIONSHIP_STYLES = {
  ally: { label: "Ally", color: "#16a34a" },
  friendly: { label: "Friendly", color: "#22c55e" },
  neutral: { label: "Neutral", color: "#6b7280" },
  tense: { label: "Tense", color: "#f59e0b" },
  hostile: { label: "Hostile", color: "#ef4444" },
};
