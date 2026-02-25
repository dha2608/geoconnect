import { useState } from 'react';
import { motion } from 'framer-motion';

const SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

function StarIcon({ filled, halfFilled }) {
  if (halfFilled) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="half-fill">
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="url(#half-fill)"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? '#f59e0b' : 'none'}
        stroke={filled ? '#f59e0b' : '#475569'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
}) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex gap-0.5"
        onMouseLeave={() => !readonly && setHoverValue(0)}
        role={readonly ? 'img' : 'radiogroup'}
        aria-label={`Rating: ${value} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = displayValue >= star;
          const halfFilled = !filled && displayValue >= star - 0.5 && readonly;

          return (
            <motion.button
              key={star}
              type="button"
              disabled={readonly}
              role={readonly ? undefined : 'radio'}
              aria-checked={value === star}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              whileHover={!readonly ? { scale: 1.25, y: -1 } : {}}
              whileTap={!readonly ? { scale: 0.85 } : {}}
              onMouseEnter={() => !readonly && setHoverValue(star)}
              onClick={() => !readonly && onChange?.(star === value ? 0 : star)}
              className={`
                ${SIZE_MAP[size]}
                ${readonly ? 'cursor-default' : 'cursor-pointer focus:outline-none'}
                transition-colors duration-100 flex-shrink-0
              `}
            >
              <StarIcon filled={filled} halfFilled={halfFilled} />
            </motion.button>
          );
        })}
      </div>

      {showValue && (
        <motion.span
          key={displayValue}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-sm font-medium text-accent-warning ml-1"
        >
          {displayValue > 0 ? displayValue.toFixed(1) : '—'}
        </motion.span>
      )}
    </div>
  );
}
