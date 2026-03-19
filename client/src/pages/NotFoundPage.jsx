import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base relative overflow-hidden px-4">
      <div className="aurora-bg" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        <GlassCard className="space-y-6 py-12">
          {/* 404 illustration */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="text-8xl select-none block mb-2">🗺️</span>
            <h1 className="text-6xl font-heading font-bold bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
              404
            </h1>
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-xl font-heading font-bold text-txt-primary">
              Page not found
            </h2>
            <p className="text-txt-secondary text-sm leading-relaxed max-w-xs mx-auto">
              The page you're looking for doesn't exist or has been moved.
              Let's get you back on the map.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/map">
              <Button variant="primary" size="md">
                🏠 Go Home
              </Button>
            </Link>
            <Link to="/explore">
              <Button variant="ghost" size="md">
                🧭 Explore
              </Button>
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
