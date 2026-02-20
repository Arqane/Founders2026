export const PLANETS = [
  { id: "parallax", label: "Parallax", diplomacySource: null, dataLogSource: null },
  { id: "cyqs",     label: "Cyq’s",     diplomacySource: null, dataLogSource: null },
  { id: "sevyr",    label: "Sevyr",    diplomacySource: null, dataLogSource: null },
  { id: "octavium", label: "Octavium", diplomacySource: null, dataLogSource: null },
];

/**
 * Later, we’ll set these to:
 * - diplomacySource: URL(s) that provide matrix data
 * - dataLogSource: URL(s) that provide per-country profile data
 *
 * IMPORTANT: we will likely NOT use a plain fetch() to Apps Script because of CORS,
 * and instead use a JSONP-style adapter or a Sheets API/public JSON approach.
 */
