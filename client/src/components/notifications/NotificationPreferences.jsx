import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { userApi } from '../../api/userApi';

const DEFAULT_PREFS = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  event_reminders: true,
  nearby_activity: false,
};

const DEFAULT_QUIET = {
  enabled: false,
  start: '22:00',
  end: '08:00',
};

const PREF_LABELS = [
  { key: 'likes',           label: 'Likes',            desc: 'When someone likes your pin or post' },
  { key: 'comments',        label: 'Comments',         desc: 'New comments on your content' },
  { key: 'follows',         label: 'New Followers',    desc: 'When someone starts following you' },
  { key: 'messages',        label: 'Messages',         desc: 'Direct messages from other users' },
  { key: 'event_reminders', label: 'Event Reminders',  desc: 'Reminders for upcoming events' },
  { key: 'nearby_activity', label: 'Nearby Activity',  desc: 'Check-ins and activity near you' },
];

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2
                  border-transparent transition-colors duration-200 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
                  ${checked ? 'bg-accent-primary' : 'bg-surface-elevated'}
                  ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow
                    ring-0 transition duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

function PrefRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-txt-primary">{label}</p>
        <p className="text-xs text-txt-muted mt-0.5">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function NotificationPreferences({ onClose }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [quiet, setQuiet] = useState(DEFAULT_QUIET);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Load existing settings on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await userApi.getSettings();
        const s = res.data?.settings ?? res.data ?? {};
        const notif = s.notifications ?? {};
        if (!cancelled) {
          setPrefs({ ...DEFAULT_PREFS, ...notif.types });
          setQuiet({ ...DEFAULT_QUIET, ...notif.quietHours });
          setPushEnabled(notif.push ?? false);
        }
      } catch {
        // silently fall back to defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePrefChange = useCallback((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePushToggle = useCallback(async (value) => {
    if (value && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    setPushEnabled(value);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await userApi.updateSettings({
        notifications: {
          types: prefs,
          quietHours: quiet,
          push: pushEnabled,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [prefs, quiet, pushEnabled]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl border border-surface-divider overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-divider">
        <h2 className="text-base font-semibold text-txt-primary">Notification Preferences</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      <div className="px-4 overflow-y-auto max-h-[70vh]">
        {/* Notification types */}
        <section className="py-2">
          <p className="text-xs font-semibold text-txt-muted uppercase tracking-wider pt-3 pb-1">
            Notification Types
          </p>
          <div className="divide-y divide-surface-divider">
            {PREF_LABELS.map(({ key, label, desc }) => (
              <PrefRow
                key={key}
                label={label}
                desc={desc}
                checked={prefs[key] ?? false}
                onChange={(v) => handlePrefChange(key, v)}
              />
            ))}
          </div>
        </section>

        {/* Push notifications */}
        <section className="py-2 border-t border-surface-divider">
          <p className="text-xs font-semibold text-txt-muted uppercase tracking-wider pt-3 pb-1">
            Browser Push
          </p>
          <PrefRow
            label="Push Notifications"
            desc={
              'Notification' in window && Notification.permission === 'denied'
                ? 'Blocked by browser — change in site settings'
                : 'Receive notifications even when the tab is in background'
            }
            checked={pushEnabled}
            onChange={handlePushToggle}
          />
        </section>

        {/* Quiet hours */}
        <section className="py-2 border-t border-surface-divider">
          <p className="text-xs font-semibold text-txt-muted uppercase tracking-wider pt-3 pb-1">
            Quiet Hours
          </p>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-txt-primary">Enable Quiet Hours</p>
              <p className="text-xs text-txt-muted mt-0.5">Suppress notifications during specified times</p>
            </div>
            <Toggle
              checked={quiet.enabled}
              onChange={(v) => setQuiet((q) => ({ ...q, enabled: v }))}
            />
          </div>

          {quiet.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-3 pb-3"
            >
              {[
                { field: 'start', label: 'Start time' },
                { field: 'end',   label: 'End time'   },
              ].map(({ field, label }) => (
                <label key={field} className="flex flex-col gap-1.5">
                  <span className="text-xs text-txt-muted">{label}</span>
                  <input
                    type="time"
                    value={quiet[field]}
                    onChange={(e) => setQuiet((q) => ({ ...q, [field]: e.target.value }))}
                    className="w-full rounded-lg bg-surface-elevated border border-surface-divider
                               px-3 py-2 text-sm text-txt-primary focus:outline-none
                               focus:border-accent-primary transition-colors"
                  />
                </label>
              ))}
            </motion.div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-divider flex items-center justify-between">
        {error ? (
          <p className="text-xs text-accent-danger">{error}</p>
        ) : saved ? (
          <p className="text-xs text-green-400">✓ Saved successfully</p>
        ) : (
          <span />
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-accent-primary text-white text-sm font-medium
                     hover:opacity-90 active:scale-95 transition-all disabled:opacity-50
                     disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </motion.div>
  );
}
