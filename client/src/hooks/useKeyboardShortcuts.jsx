/**
 * useKeyboardShortcuts
 *
 * Global keyboard shortcut system for GeoConnect.
 *
 * Architecture:
 *  • This hook attaches a single `keydown` listener to `window`.
 *  • Shortcuts that need Leaflet's map instance (zoom, locate) are
 *    communicated via lightweight CustomEvents on `window`; MapControls
 *    listens inside the MapContainer context and calls `useMap()` APIs.
 *  • Redux actions (closePanel, setActiveMapTool, setTileLayer, closeModal)
 *    are dispatched directly.
 *  • Typing-context guard: all single-key shortcuts are suppressed when the
 *    active element is an <input>, <textarea>, <select>, or contenteditable.
 *    Ctrl/Cmd+K and Escape are exempt — they fire everywhere.
 *
 * Usage in AppLayout:
 *   const { showShortcutHelp, setShowShortcutHelp } = useKeyboardShortcuts();
 *   <AnimatePresence>
 *     {showShortcutHelp && (
 *       <ShortcutHelpOverlay key="shortcut-help" onClose={() => setShowShortcutHelp(false)} />
 *     )}
 *   </AnimatePresence>
 *
 * Custom window events (consumed by MapControls):
 *   'geo:zoom-in'   – call map.zoomIn()
 *   'geo:zoom-out'  – call map.zoomOut()
 *   'geo:locate-me' – fly to user location
 */

import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { closePanel, closeModal, setActiveMapTool } from '../features/ui/uiSlice';
import { setTileLayer } from '../features/map/mapSlice';
import { overlayFade, scaleIn } from '../utils/animations';

// ─── Custom window event names ────────────────────────────────────────────────

/** Fired by the shortcut hook; consumed by MapControls inside MapContainer. */
export const MAP_SHORTCUT_EVENTS = {
  ZOOM_IN:   'geo:zoom-in',
  ZOOM_OUT:  'geo:zoom-out',
  LOCATE_ME: 'geo:locate-me',
};

// ─── Shortcut reference data (also drives the help overlay) ──────────────────

const SHORTCUT_GROUPS = [
  {
    label: 'Search & Navigation',
    rows: [
      { keys: ['/',  'Ctrl K'], description: 'Focus search bar'    },
      { keys: ['+',  '='],      description: 'Zoom in'             },
      { keys: ['-'],            description: 'Zoom out'            },
      { keys: ['L'],            description: 'Locate me on map'    },
    ],
  },
  {
    label: 'Panels & Interface',
    rows: [
      { keys: ['Esc'],          description: 'Close panel / tool / modal'  },
      { keys: ['D'],            description: 'Toggle dark / light theme'   },
      { keys: ['F'],            description: 'Toggle fullscreen'           },
      { keys: ['?'],            description: 'Show keyboard shortcuts'     },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns `true` when keyboard focus is inside a text-entry element.
 * Used to suppress single-key shortcuts so they don't interfere with typing.
 */
function isTypingContext() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input'    ||
    tag === 'textarea' ||
    tag === 'select'   ||
    el.isContentEditable
  );
}

/** Fire a zero-data CustomEvent on window (for in-Leaflet-context consumers). */
function fireMapEvent(name) {
  window.dispatchEvent(new CustomEvent(name));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useKeyboardShortcuts`
 *
 * Attaches global keyboard shortcuts and exposes help-overlay state.
 *
 * @returns {{ showShortcutHelp: boolean, setShowShortcutHelp: Function }}
 */
export function useKeyboardShortcuts() {
  const dispatch   = useDispatch();
  const tileLayer  = useSelector((state) => state.map.tileLayer);
  const modalOpen  = useSelector((state) => state.ui.modalOpen);

  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e) => {
      const { key, ctrlKey, metaKey, shiftKey } = e;
      const mod = ctrlKey || metaKey;

      // ── Escape ───────────────────────────────────────────────────────────
      // Priority order: close help → close modal → close panel/tool.
      // Always fires regardless of typing context.
      if (key === 'Escape') {
        if (showShortcutHelp) {
          setShowShortcutHelp(false);
          return;
        }
        if (modalOpen) {
          dispatch(closeModal());
          return;
        }
        // closePanel() properly sets sidebarOpen:false (setActivePanel(null) does not)
        dispatch(closePanel());
        dispatch(setActiveMapTool(null));
        return;
      }

      // ── Ctrl/Cmd + K — focus search ──────────────────────────────────────
      // Matches browser/VS Code convention; allowed even while typing.
      if (mod && key === 'k') {
        e.preventDefault();
        document.querySelector('[data-search-input]')?.focus();
        return;
      }

      // ── All remaining shortcuts are suppressed inside text inputs ────────
      if (isTypingContext()) return;

      // Ignore bare modifier combos (Ctrl alone, Alt alone, etc.)
      if (mod || (shiftKey && key !== '?')) return;

      switch (key) {

        // ── Focus search ──────────────────────────────────────────────────
        case '/':
          e.preventDefault();
          document.querySelector('[data-search-input]')?.focus();
          break;

        // ── Zoom in ───────────────────────────────────────────────────────
        case '+':
        case '=':
          fireMapEvent(MAP_SHORTCUT_EVENTS.ZOOM_IN);
          break;

        // ── Zoom out ──────────────────────────────────────────────────────
        case '-':
          fireMapEvent(MAP_SHORTCUT_EVENTS.ZOOM_OUT);
          break;

        // ── Toggle shortcuts help ─────────────────────────────────────────
        case '?':
          setShowShortcutHelp((v) => !v);
          break;

        // ── Toggle fullscreen ─────────────────────────────────────────────
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
          break;

        // ── Locate me ─────────────────────────────────────────────────────
        case 'l':
        case 'L':
          fireMapEvent(MAP_SHORTCUT_EVENTS.LOCATE_ME);
          break;

        // ── Toggle dark / light theme ─────────────────────────────────────
        // Toggles between the two base tile styles. If the user was on a
        // specialty layer (satellite, street) they land on 'dark' first.
        case 'd':
        case 'D':
          dispatch(setTileLayer(tileLayer === 'dark' ? 'light' : 'dark'));
          break;

        default:
          break;
      }
    },
    [dispatch, showShortcutHelp, tileLayer, modalOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showShortcutHelp, setShowShortcutHelp };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Renders a single keyboard key badge. */
function KeyBadge({ children }) {
  return (
    <kbd
      className={[
        'inline-flex items-center justify-center',
        'min-w-[1.75rem] h-[1.375rem] px-1.5',
        'rounded-md font-mono text-[11px] font-semibold leading-none',
        'text-txt-primary bg-surface-hover',
        'border border-surface-divider',
        'shadow-[0_1px_0_1px_rgba(0,0,0,0.2)]',
      ].join(' ')}
    >
      {children}
    </kbd>
  );
}

/** Single shortcut row: description on left, key badges on right. */
function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors duration-150">
      <span className="text-sm text-txt-secondary font-body">{description}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-[10px] text-txt-muted font-body select-none">or</span>
            )}
            <KeyBadge>{k}</KeyBadge>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── ShortcutHelpOverlay ──────────────────────────────────────────────────────

/**
 * `ShortcutHelpOverlay`
 *
 * Glass modal listing all keyboard shortcuts. Designed to be rendered inside
 * an `<AnimatePresence>` block in AppLayout so it gets enter/exit animations.
 *
 * @param {{ onClose: () => void }} props
 */
export function ShortcutHelpOverlay({ onClose }) {
  return (
    // Backdrop — fades in/out via overlayFade; click outside closes
    <motion.div
      variants={overlayFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      {/* Card — scales in/out via scaleIn; click inside does not close */}
      <motion.div
        variants={scaleIn}
        className={[
          'glass rounded-2xl w-full max-w-[440px]',
          'max-h-[85vh] overflow-y-auto',
          'shadow-2xl ring-1 ring-white/10',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5">
          <div>
            {/* Keyboard icon + title */}
            <div className="flex items-center gap-2.5 mb-1">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent-primary/15 text-accent-primary"
                aria-hidden="true"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
                </svg>
              </span>
              <h2 className="text-base font-semibold text-txt-primary font-body leading-none">
                Keyboard Shortcuts
              </h2>
            </div>
            <p className="text-xs text-txt-muted font-body pl-[2.375rem]">
              Press{' '}
              <kbd className="inline font-mono text-[11px] text-txt-secondary">?</kbd>
              {' '}anywhere on the map to toggle
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-surface-divider mx-6" />

        {/* ── Shortcut groups ──────────────────────────────────────── */}
        <div className="px-4 py-5 space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-accent-primary font-body select-none">
                {group.label}
              </p>

              {/* Rows */}
              <div className="space-y-0.5">
                {group.rows.map((row) => (
                  <ShortcutRow
                    key={row.description}
                    keys={row.keys}
                    description={row.description}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-6 pb-5">
          <div className="border-t border-surface-divider pt-4 flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-txt-muted flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <p className="text-[11px] text-txt-muted font-body">
              Single-key shortcuts are disabled while typing in a text field
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
