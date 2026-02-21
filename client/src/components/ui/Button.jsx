import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const variants = {
  primary:  'bg-accent-primary hover:bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  secondary:'bg-accent-secondary hover:bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]',
  ghost:    'bg-transparent hover:bg-white/5 text-txt-secondary hover:text-txt-primary border border-white/10',
  danger:   'bg-accent-danger hover:bg-red-600 text-white',
  glass:    'glass hover:border-accent-primary/25 text-txt-primary',
  outline:  'bg-transparent border border-accent-primary/50 text-accent-primary hover:bg-accent-primary/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
  icon: 'p-2.5 rounded-xl',
};

const Button = forwardRef(({ children, variant = 'primary', size = 'md', loading = false, disabled = false, className = '', ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`inline-flex items-center justify-center gap-2 font-body font-medium transition-all duration-150
        ${variants[variant]} ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';
export default Button;
