import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { reportApi } from '../../api/reportApi';

const REASONS = [
  { id: 'spam',           label: 'Spam',                icon: '🚫' },
  { id: 'harassment',     label: 'Harassment',          icon: '😤' },
  { id: 'hate_speech',    label: 'Hate speech',         icon: '🗯' },
  { id: 'violence',       label: 'Violence',            icon: '⚠' },
  { id: 'inappropriate',  label: 'Inappropriate content', icon: '🔞' },
  { id: 'impersonation',  label: 'Impersonation',       icon: '🎭' },
  { id: 'other',          label: 'Other',               icon: '📝' },
];

/**
 * ReportModal — slide-up modal for reporting content.
 *
 * Props:
 *   isOpen      — whether the modal is visible
 *   onClose     — close callback
 *   targetType  — 'user' | 'post' | 'pin' | 'event' | 'review' | 'message'
 *   targetId    — MongoDB _id of the reported item
 */
export default function ReportModal({ isOpen, onClose, targetType, targetId }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription]       = useState('');
  const [submitting, setSubmitting]         = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Please select a reason');
      return;
    }

    setSubmitting(true);
    try {
      await reportApi.createReport({
        targetType,
        targetId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });
      toast.success('Report submitted. Thank you for helping keep the community safe.');
      onClose();
      // Reset
      setSelectedReason(null);
      setDescription('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit report';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative glass w-full max-w-sm rounded-2xl z-10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-lg font-heading font-bold text-txt-primary">
                Report {targetType}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-txt-muted hover:text-txt-primary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Reason selection */}
            <div className="px-5 pb-3">
              <p className="text-sm text-txt-muted mb-3">Why are you reporting this?</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm font-body
                      transition-all duration-150 border ${
                        selectedReason === reason.id
                          ? 'border-accent-primary/40 bg-accent-primary/10 text-txt-primary'
                          : 'border-transparent hover:bg-surface-hover text-txt-secondary'
                      }`}
                  >
                    <span className="text-base">{reason.icon}</span>
                    <span>{reason.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional description */}
            <div className="px-5 pb-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details (optional)..."
                maxLength={500}
                rows={2}
                className="w-full bg-elevated border border-surface-divider rounded-xl px-3.5 py-2.5
                           text-sm text-txt-primary placeholder-txt-muted outline-none resize-none
                           focus:border-accent-primary/50 transition-all duration-150"
              />
              <p className="text-right text-[10px] text-txt-muted mt-1">{description.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-txt-muted
                           hover:bg-surface-hover border border-surface-divider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white
                           bg-accent-danger hover:bg-red-600 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
