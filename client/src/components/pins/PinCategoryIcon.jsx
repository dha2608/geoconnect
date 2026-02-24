/**
 * PinCategoryIcon — category colors, SVG strings, and React component.
 *
 * Exports:
 *   getCategoryColor(category)    → hex string
 *   getCategoryIconSvg(category)  → SVG path string (for Leaflet divIcon HTML)
 *   default PinCategoryIcon       → React component <PinCategoryIcon category size />
 */

// ─── Category → color ────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  restaurant: '#ef4444',
  cafe:       '#f59e0b',
  bar:        '#8b5cf6',
  hotel:      '#3b82f6',
  park:       '#10b981',
  museum:     '#06b6d4',
  shop:       '#ec4899',
  landmark:   '#f97316',
  viewpoint:  '#14b8a6',
  other:      '#6b7280',
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
}

// ─── Category → SVG path data (24×24 viewBox) ────────────────────────────────

/**
 * Returns an SVG *string* (not JSX) suitable for embedding inside Leaflet
 * divIcon HTML. The paths use a 24×24 viewBox.
 */
const CATEGORY_SVG_PATHS = {
  // Fork and knife
  restaurant: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,

  // Coffee cup
  cafe: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,

  // Cocktail glass
  bar: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 3H4l8 9.46L20 3z"/></svg>`,

  // Bed
  hotel: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 012 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,

  // Tree
  park: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 22v-3"/><path d="M12 22v-7"/><path d="M7 22v-3"/><path d="M12 2L2 12h4v3l6-5 6 5v-3h4L12 2z"/></svg>`,

  // Building columns
  museum: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M2 11h20"/><path d="M12 2L2 7h20L12 2z"/><path d="M6 11v11"/><path d="M10 11v11"/><path d="M14 11v11"/><path d="M18 11v11"/></svg>`,

  // Shopping bag
  shop: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,

  // Flag
  landmark: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,

  // Eye
  viewpoint: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,

  // Map pin
  other: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

export function getCategoryIconSvg(category) {
  return CATEGORY_SVG_PATHS[category] ?? CATEGORY_SVG_PATHS.other;
}

// ─── React component ──────────────────────────────────────────────────────────

/**
 * React component wrapping the category icon as an inline SVG.
 *
 * @param {object} props
 * @param {string} props.category
 * @param {number} [props.size=24]
 * @param {string} [props.className]
 */
export default function PinCategoryIcon({ category, size = 24, className = '' }) {
  const color = getCategoryColor(category);

  // Map category to JSX icon paths
  const icons = {
    restaurant: (
      <>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </>
    ),
    cafe: (
      <>
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </>
    ),
    bar: (
      <>
        <path d="M8 22h8" />
        <path d="M12 11v11" />
        <path d="M20 3H4l8 9.46L20 3z" />
      </>
    ),
    hotel: (
      <>
        <path d="M2 4v16" />
        <path d="M2 8h18a2 2 0 012 2v10" />
        <path d="M2 17h20" />
        <path d="M6 8v9" />
      </>
    ),
    park: (
      <>
        <path d="M17 22v-3" />
        <path d="M12 22v-7" />
        <path d="M7 22v-3" />
        <path d="M12 2L2 12h4v3l6-5 6 5v-3h4L12 2z" />
      </>
    ),
    museum: (
      <>
        <path d="M2 22h20" />
        <path d="M2 11h20" />
        <path d="M12 2L2 7h20L12 2z" />
        <path d="M6 11v11" />
        <path d="M10 11v11" />
        <path d="M14 11v11" />
        <path d="M18 11v11" />
      </>
    ),
    shop: (
      <>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </>
    ),
    landmark: (
      <>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </>
    ),
    viewpoint: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    other: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  };

  const paths = icons[category] ?? icons.other;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}
