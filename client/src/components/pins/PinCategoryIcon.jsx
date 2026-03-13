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
  food:          '#f59e0b',
  entertainment: '#8b5cf6',
  shopping:      '#ec4899',
  outdoors:      '#10b981',
  culture:       '#06b6d4',
  travel:        '#3b82f6',
  sports:        '#ef4444',
  health:        '#14b8a6',
  education:     '#f97316',
  other:         '#94a3b8',
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
  food: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,

  // Cocktail glass
  entertainment: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 3H4l8 9.46L20 3z"/></svg>`,

  // Shopping bag
  shopping: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,

  // Tree
  outdoors: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 22v-3"/><path d="M12 22v-7"/><path d="M7 22v-3"/><path d="M12 2L2 12h4v3l6-5 6 5v-3h4L12 2z"/></svg>`,

  // Building columns
  culture: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M2 11h20"/><path d="M12 2L2 7h20L12 2z"/><path d="M6 11v11"/><path d="M10 11v11"/><path d="M14 11v11"/><path d="M18 11v11"/></svg>`,

  // Plane
  travel: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,

  // Globe/ball
  sports: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>`,

  // Medical pulse
  health: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,

  // Book
  education: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,

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
    food: (
      <>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </>
    ),
    entertainment: (
      <>
        <path d="M8 22h8" />
        <path d="M12 11v11" />
        <path d="M20 3H4l8 9.46L20 3z" />
      </>
    ),
    shopping: (
      <>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </>
    ),
    outdoors: (
      <>
        <path d="M17 22v-3" />
        <path d="M12 22v-7" />
        <path d="M7 22v-3" />
        <path d="M12 2L2 12h4v3l6-5 6 5v-3h4L12 2z" />
      </>
    ),
    culture: (
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
    travel: (
      <>
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </>
    ),
    sports: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        <path d="M2 12h20" />
      </>
    ),
    health: (
      <>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </>
    ),
    education: (
      <>
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
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
