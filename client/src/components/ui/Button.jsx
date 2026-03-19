import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const variants = {
  primary:  'bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)]',
  secondary:'bg-accent-secondary hover:bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]',
  ghost:    'bg-transparent hover:bg-surface-hover text-txt-secondary hover:text-txt-primary border border-surface-divider',
  danger:   'bg-accent-danger hover:bg-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.25)]',
  glass:    'glass hover:border-accent-violet/25 text-txt-primary',
  outline:  'bg-transparent border border-accent-violet/50 text-accent-violet hover:bg-accent-violet/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
  icon: 'p-2.5 rounded-xl',
};

/* Polished loading spinner */
function ButtonSpinner() {
  return (
    <motion.svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="32 18"
        opacity="0.85"
      />
    </motion.svg>
  );
}

const Button = forwardRef(({ children, variant = 'primary', size = 'md', loading = false, disabled = false, className = '', ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      whileHover={!disabled && !loading ? { scale: 1.03, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      className={`inline-flex items-center justify-center gap-2 font-body font-medium transition-all duration-150
        ${variants[variant]} ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ButtonSpinner />}
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';
export default Button;
