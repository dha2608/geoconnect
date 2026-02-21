import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const GlassCard = forwardRef(({ children, className = '', hover = false, padding = 'p-6', animate = true, ...props }, ref) => {
  const Component = animate ? motion.div : 'div';
  const animateProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  } : {};
  const hoverProps = hover ? {
    whileHover: { scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.25)' },
    transition: { duration: 0.2 },
  } : {};

  return (
    <Component
      ref={ref}
      className={`glass ${padding} ${className}`}
      {...animateProps}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
});

GlassCard.displayName = 'GlassCard';
export default GlassCard;
