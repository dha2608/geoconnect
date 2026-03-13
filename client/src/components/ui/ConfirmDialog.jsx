import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import Button from './Button';

/**
 * ConfirmDialog — accessible confirmation modal for destructive actions.
 *
 * @param {boolean}  isOpen        - Whether the dialog is visible
 * @param {Function} onConfirm     - Called when user confirms
 * @param {Function} onCancel      - Called when user cancels or presses Escape
 * @param {string}   title         - Dialog heading
 * @param {string}   message       - Body text explaining the action
 * @param {string}   [confirmText] - Confirm button label (default: "Delete")
 * @param {string}   [cancelText]  - Cancel button label (default: "Cancel")
 * @param {string}   [variant]     - Confirm button variant (default: "danger")
 * @param {boolean}  [loading]     - Show loading state on confirm button
 */
export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);

  // Focus cancel button on open; trap focus; handle Escape
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel (safe default)
    cancelRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
      // Trap focus between cancel and confirm
      if (e.key === 'Tab') {
        const focusable = [cancelRef.current, confirmRef.current].filter(Boolean);
        if (focusable.length < 2) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 350 } }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            className="relative glass w-full max-w-sm rounded-2xl p-6 space-y-4"
          >
            {/* Warning icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-danger/15 border border-accent-danger/25 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 id="confirm-title" className="text-lg font-heading font-bold text-txt-primary">
                {title}
              </h3>
            </div>

            <p id="confirm-message" className="text-sm text-txt-secondary leading-relaxed pl-[52px]">
              {message}
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                ref={cancelRef}
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button
                ref={confirmRef}
                variant={variant}
                size="sm"
                onClick={onConfirm}
                loading={loading}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
