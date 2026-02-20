export const PLANETS = [
  // TEST first on purpose (so it’s the default selection in early work)
  { id: "test",     label: "TEST",     diplomacySource: null, dataLogSource: null },

  { id: "parallax", label: "Parallax", diplomacySource: null, dataLogSource: null },
  { id: "cyqs",     label: "Cyq’s",     diplomacySource: null, dataLogSource: null },
  { id: "sevyr",    label: "Sevyr",    diplomacySource: null, dataLogSource: null },
  { id: "octavium", label: "Octavium", diplomacySource: null, dataLogSource: null },
];

/**
 * Later we’ll set:
 * - diplomacySource: URL(s) to diplomacy matrix data
 * - dataLogSource: URL(s) to planet Data Log / Collector data
 *
 * PLAN:
 * 1) Wire up TEST first.
 * 2) Once stable, copy the same pattern into Parallax/Cyq’s/Sevyr/Octavium.
 */
