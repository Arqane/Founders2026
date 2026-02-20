// assets/js/config.js

export const API_BASE =
  "https://script.google.com/macros/s/AKfycbwZ-QIjMGQsmeS_z8WDtzndBcJ5XfsYPPoMsINuVPBAo0zm3TK7rDq4CaRNynTB1Unm/exec";

export const PLANETS = [
  { id: "test", label: "TEST" },
  { id: "parallax", label: "Parallax" },
  { id: "cyqs", label: "Cyq`s" },
  { id: "sevyr", label: "Sevyr" },
  { id: "octavium", label: "Octavium" },
];

// Diplomacy relationship styles
export const RELATIONSHIP_STYLES = {
  ally:     { label: "Ally",     color: "#2563eb" }, // blue
  friendly: { label: "Friendly", color: "#22c55e" },
  neutral:  { label: "Neutral",  color: "#6b7280" },
  tense:    { label: "Tense",    color: "#f59e0b" },
  hostile:  { label: "Hostile",  color: "#ef4444" },
};
