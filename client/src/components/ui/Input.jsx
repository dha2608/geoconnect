import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';

// ─── Search icon (magnifier) ──────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ─── Input Component ──────────────────────────────────────────────────────────

const Input = forwardRef(({ label, error, icon: Icon, variant = 'default', type = 'text', className = '', ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const isSearch = variant === 'search';

  // Search variant uses built-in magnifier; custom icon overrides it
  const LeftIcon = Icon || (isSearch ? SearchIcon : null);

  return (
    <div className={`space-y-1.5 ${isSearch ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-txt-secondary">{label}</label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
            <LeftIcon size={18} />
          </div>
        )}
        <motion.input
          ref={ref}
          type={isPassword && showPassword ? 'text' : type}
          className={[
            'w-full border text-sm text-txt-primary placeholder-txt-muted outline-none transition-all duration-150',
            isSearch ? 'rounded-full py-2.5 px-4 bg-surface-hover/80 backdrop-blur-sm' : 'rounded-xl px-4 py-3 bg-elevated',
            LeftIcon ? 'pl-10' : '',
            isPassword ? 'pr-10' : '',
            focused
              ? isSearch
                ? 'border-accent-primary/40 shadow-[0_0_16px_rgba(59,130,246,0.12)]'
                : 'border-accent-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
              : 'border-surface-divider',
            error ? 'border-accent-danger/50' : '',
            className,
          ].filter(Boolean).join(' ')}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-secondary transition-colors"
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-accent-danger"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
