import { useRef, useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import { setActiveMapTool } from '../../features/ui/uiSlice';
import DrawingTools from './DrawingTools';
import DistanceTool from './DistanceTool';
import RoutingTool from './RoutingTool';

const TOOLS = [
  {
    key: 'draw',
    label: 'Draw',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      </svg>
    ),
  },
  {
    key: 'measure',
    label: 'Measure',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l2-3 2 6 2-6 2 3h4" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
        <circle cx="20" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'route',
    label: 'Route',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="6" r="3" />
        <circle cx="19" cy="18" r="3" />
        <path d="M8 6h4c3 0 5 2 5 5v2" />
      </svg>
    ),
  },
];

export default function MapToolbar() {
  const map = useMap();
  const dispatch = useDispatch();
  const activeMapTool = useSelector((state) => state.ui.activeMapTool);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const toggle = useCallback((key) => {
    dispatch(setActiveMapTool(activeMapTool === key ? null : key));
  }, [dispatch, activeMapTool]);

  const deactivate = useCallback(() => {
    dispatch(setActiveMapTool(null));
  }, [dispatch]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setIsHovered(false), 400);
  }, []);

  // Keep visible when a tool is active
  const showToolbar = isHovered || activeMapTool;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Invisible hover trigger strip */}
      {!showToolbar && (
        <div className="w-48 h-8 cursor-pointer" />
      )}
      {/* Active Tool Panel */}
      <AnimatePresence mode="wait">
        {showToolbar && activeMapTool === 'draw' && (
          <motion.div
            key="draw"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <DrawingTools onClose={deactivate} />
          </motion.div>
        )}
        {activeMapTool === 'measure' && (
          <motion.div
            key="measure"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <DistanceTool onClose={deactivate} />
          </motion.div>
        )}
        {activeMapTool === 'route' && (
          <motion.div
            key="route"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <RoutingTool onClose={deactivate} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <AnimatePresence>
        {showToolbar && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        className="flex items-center gap-1 px-2 py-1.5 glass rounded-xl"
      >
        {TOOLS.map((tool, i) => {
          const isActive = activeMapTool === tool.key;
          return (
            <motion.button
              key={tool.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => toggle(tool.key)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-accent-primary'
                  : 'text-txt-muted hover:text-txt-secondary'
              }`}
              title={tool.label}
            >
              {isActive && (
                <motion.div
                  layoutId="toolbar-glow"
                  className="absolute inset-0 rounded-lg bg-accent-primary/15"
                  style={{ boxShadow: '0 0 12px color-mix(in srgb, var(--accent-violet) 20%, transparent)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tool.icon}</span>
              <span className="relative z-10 text-[10px] font-medium">{tool.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
