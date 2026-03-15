/**
 * SearchViews.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * State-driven view components for the SearchPanel:
 *   MiniSpinner        – animated spinner shown inside the search input
 *   EmptyIllustration  – SVG shown on the initial empty state
 *   NoResultsIllustration – SVG shown when search yields nothing
 *   ViewLoading        – full-panel loading state
 *   ViewNoResults      – no-results message with illustration
 *   ViewEmpty          – initial call-to-action state
 */

import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import LoadingSpinner from '../ui/LoadingSpinner';

// ─── Mini spinner (inside input) ──────────────────────────────────────────────

export function MiniSpinner() {
  return (
    <motion.svg
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
      className="w-4 h-4 block"
      viewBox="0 0 24 24" fill="none"
      stroke="#3b82f6" strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </motion.svg>
  );
}

// ─── Illustrations ────────────────────────────────────────────────────────────

export function EmptyIllustration() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="61" stroke="rgba(59,130,246,0.12)" strokeWidth="1.5" />
      <circle cx="64" cy="64" r="44" stroke="rgba(59,130,246,0.08)" strokeWidth="1.5" strokeDasharray="5 5" />
      <circle cx="56" cy="56" r="22" stroke="rgba(59,130,246,0.30)" strokeWidth="2.5"
        fill="rgba(59,130,246,0.04)" />
      <line x1="71" y1="71" x2="85" y2="85" stroke="rgba(59,130,246,0.30)" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 45c-6 0-11 5-11 11 0 8 11 18 11 18s11-10 11-18c0-6-5-11-11-11z"
        fill="rgba(6,182,212,0.16)" stroke="rgba(6,182,212,0.55)" strokeWidth="1.5" />
      <circle cx="56" cy="56" r="3.5" fill="rgba(6,182,212,0.7)" />
      <circle cx="95" cy="40" r="2.5" fill="rgba(59,130,246,0.28)" />
      <circle cx="28" cy="86" r="2" fill="rgba(6,182,212,0.28)" />
      <circle cx="100" cy="79" r="1.5" fill="rgba(59,130,246,0.18)" />
    </svg>
  );
}

export function NoResultsIllustration() {
  return (
    <svg width="108" height="108" viewBox="0 0 108 108" fill="none" aria-hidden="true">
      <circle cx="46" cy="46" r="32" stroke="rgba(59,130,246,0.20)" strokeWidth="2.5"
        fill="rgba(59,130,246,0.03)" />
      <line x1="68" y1="68" x2="88" y2="88" stroke="rgba(59,130,246,0.20)" strokeWidth="3" strokeLinecap="round" />
      <line x1="35" y1="35" x2="57" y2="57" stroke="rgba(239,68,68,0.50)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="57" y1="35" x2="35" y2="57" stroke="rgba(239,68,68,0.50)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="46" cy="46" r="20" stroke="rgba(239,68,68,0.10)" strokeWidth="1" />
    </svg>
  );
}

// ─── State views ──────────────────────────────────────────────────────────────

export function ViewLoading() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col items-center justify-center pt-16 gap-3.5"
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="md" />
      <p className="font-body text-[13px] text-txt-muted">Searching...</p>
    </motion.div>
  );
}

export function ViewNoResults({ query }) {
  const display = query.length > 26 ? `${query.slice(0, 26)}...` : query;
  return (
    <motion.div
      key="no-results"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center pt-10 gap-5"
    >
      <NoResultsIllustration />
      <GlassCard animate={false} padding="p-5" className="text-center max-w-[240px]">
        <h3 className="font-heading text-[15px] font-bold text-txt-secondary mb-1.5">
          No results found
        </h3>
        <p className="font-body text-[12.5px] text-txt-muted leading-relaxed">
          No matches for{' '}
          <strong className="text-txt-secondary font-semibold">"{display}"</strong>.
          Try a different term.
        </p>
      </GlassCard>
    </motion.div>
  );
}

export function ViewEmpty() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.30, delay: 0.08 }}
      className="flex flex-col items-center pt-10 gap-5"
    >
      <EmptyIllustration />
      <GlassCard animate={false} padding="p-5" className="text-center max-w-[250px]">
        <h3 className="font-heading text-[15px] font-bold text-txt-secondary mb-1.5">
          Search everything
        </h3>
        <p className="font-body text-[12.5px] text-txt-muted leading-relaxed">
          Find places, people, pins, and events all in one search.
        </p>
      </GlassCard>
    </motion.div>
  );
}
