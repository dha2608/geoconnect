import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * Modal that prompts unauthenticated users to sign in.
 * Shown by useRequireAuth hook when a guarded action is triggered.
 */
export default function LoginPromptModal({ feature, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[250] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-sm mx-4"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        >
          <div className="glass rounded-2xl border border-surface-divider p-6 shadow-2xl">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20">
              <svg className="h-7 w-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-center font-heading text-lg font-bold text-txt-primary mb-2">
              Sign in to continue
            </h3>

            {/* Description */}
            <p className="text-center text-sm text-txt-muted mb-6 leading-relaxed">
              You need an account to <span className="text-txt-secondary font-medium">{feature}</span>. Sign in or create a free account to unlock all features.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5">
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-xl border border-surface-divider px-4 py-3 text-sm font-medium text-txt-secondary transition-colors hover:bg-white/5 hover:text-txt-primary"
              >
                Create free account
              </Link>
            </div>

            {/* Dismiss */}
            <button
              onClick={onClose}
              className="mt-4 w-full text-center text-xs text-txt-muted hover:text-txt-secondary transition-colors"
            >
              Continue browsing
            </button>
          </div>

          {/* Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-blue-500/10 blur-xl -z-10 pointer-events-none" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
