import { motion } from 'framer-motion';
import useOnlineStatus from '../../hooks/useOnlineStatus';

export default function LiveIndicator({ className = '' }) {
  const isOnline = useOnlineStatus();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <motion.div
        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}
        animate={isOnline ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      <span className="text-[10px] text-txt-muted">
        {isOnline ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
