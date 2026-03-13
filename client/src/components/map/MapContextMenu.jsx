import { useState, useEffect, useCallback, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import { openModal } from '../../features/ui/uiSlice';
import { setDestination } from '../../features/map/mapSlice';
import { geocodeApi } from '../../api/geocodeApi';
import toast from 'react-hot-toast';

/* ─── Menu Button ────────────────────────────────────────────────────────── */
function MenuButton({ icon, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-hover transition-colors flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-base leading-none">{icon}</span>
      {children}
    </button>
  );
}

/* ─── MapContextMenu ─────────────────────────────────────────────────────── */
/**
 * Renders a glass context menu on the map on:
 *   • Long-press (500ms hold with <5px movement)
 *   • Right-click (contextmenu event)
 *
 * Must be rendered inside <MapContainer> so it can call useMap().
 */
export default function MapContextMenu() {
  const dispatch = useDispatch();
  const map      = useMap();

  // menu state: null when hidden, or { x, y, lat, lng } when visible
  const [menu,      setMenu]      = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const menuRef           = useRef(null);
  const pressTimer        = useRef(null);
  const pressStart        = useRef(null); // { x, y, latlng }
  const suppressNextClick = useRef(false);

  /* ── Close helper ── */
  const closeMenu = useCallback(() => {
    setMenu(null);
    setGeocoding(false);
  }, []);

  /* ── Stop Leaflet intercepting events from the menu div ── */
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    // Prevent mousedown bubbling so our map handler doesn't close the menu
    L.DomEvent.on(el, 'mousedown',   L.DomEvent.stopPropagation);
    L.DomEvent.on(el, 'contextmenu', L.DomEvent.stop);

    return () => {
      L.DomEvent.off(el, 'mousedown',   L.DomEvent.stopPropagation);
      L.DomEvent.off(el, 'contextmenu', L.DomEvent.stop);
    };
  }, [menu]); // re-bind when menu mounts / unmounts

  /* ── Escape key ── */
  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu, closeMenu]);

  /* ── Map event handlers ── */
  useMapEvents({
    // Right-click → show menu immediately
    contextmenu(e) {
      e.originalEvent.preventDefault();
      const point = map.latLngToContainerPoint(e.latlng);
      setMenu({ x: point.x, y: point.y, lat: e.latlng.lat, lng: e.latlng.lng });
    },

    // Long-press detection: start 500ms timer on mousedown
    mousedown(e) {
      // If a menu is already open, close it and don't start a new press
      if (menu) {
        closeMenu();
        return;
      }
      const point = map.latLngToContainerPoint(e.latlng);
      pressStart.current = { x: point.x, y: point.y, latlng: e.latlng };
      clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(() => {
        if (!pressStart.current) return;
        const { x, y, latlng } = pressStart.current;
        setMenu({ x, y, lat: latlng.lat, lng: latlng.lng });
        pressStart.current = null;
        // The mouseup after a long-press fires a Leaflet 'click'; suppress it
        suppressNextClick.current = true;
      }, 500);
    },

    // Cancel long-press if mouse moves > 5px
    mousemove(e) {
      if (!pressStart.current) return;
      const point = map.latLngToContainerPoint(e.latlng);
      const dx = point.x - pressStart.current.x;
      const dy = point.y - pressStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        clearTimeout(pressTimer.current);
        pressStart.current = null;
      }
    },

    // Cancel long-press on mouse release
    mouseup() {
      clearTimeout(pressTimer.current);
      pressStart.current = null;
    },

    // Close menu when map starts panning / zooming
    movestart() {
      clearTimeout(pressTimer.current);
      pressStart.current = null;
      closeMenu();
    },

    // Close menu on regular map clicks (but suppress the one that follows a long-press)
    click() {
      if (suppressNextClick.current) {
        suppressNextClick.current = false;
        return;
      }
      if (menu) closeMenu();
    },
  });

  /* ── Action handlers ── */
  const handleCreatePin = () => {
    if (!menu) return;
    dispatch(openModal({ modal: 'createPin', data: { lat: menu.lat, lng: menu.lng } }));
    closeMenu();
  };

  const handleSetDestination = () => {
    if (!menu) return;
    dispatch(setDestination({ lat: menu.lat, lng: menu.lng }));
    toast.success('🎯 Destination set!');
    closeMenu();
  };

  const handleWhatsHere = async () => {
    if (!menu) return;
    setGeocoding(true);
    try {
      const res  = await geocodeApi.reverse(menu.lat, menu.lng);
      const data = res.data;
      const address =
        data?.display_name ??
        data?.name ??
        `${menu.lat.toFixed(5)}, ${menu.lng.toFixed(5)}`;
      toast(address, { duration: 6000, icon: '📍' });
    } catch {
      toast.error('Could not get location info');
    } finally {
      setGeocoding(false);
      closeMenu();
    }
  };

  /* ── Position: clamp to map edges so the menu stays visible ── */
  const getMenuStyle = () => {
    if (!menu) return {};
    const MENU_W = 200;
    const MENU_H = 130; // approx height of 3 items + padding
    const mapSize = map.getSize();

    let x = menu.x + 6; // 6px offset from cursor
    let y = menu.y + 6;

    if (x + MENU_W > mapSize.x) x = menu.x - MENU_W - 6;
    if (y + MENU_H > mapSize.y) y = menu.y - MENU_H - 6;

    return {
      position: 'absolute',
      left: Math.max(4, x),
      top:  Math.max(4, y),
      zIndex: 2000,
    };
  };

  /* ── Render ── */
  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={menuRef}
          key="map-context-menu"
          style={getMenuStyle()}
          initial={{ opacity: 0, scale: 0.85, y: -4 }}
          animate={{ opacity: 1, scale: 1,    y:  0 }}
          exit={{    opacity: 0, scale: 0.85, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="glass rounded-xl border border-surface-divider shadow-lg p-2 min-w-[180px]"
        >
          <MenuButton icon="📍" onClick={handleCreatePin}>
            Create Pin Here
          </MenuButton>

          <MenuButton icon="🎯" onClick={handleSetDestination}>
            Set as Destination
          </MenuButton>

          <MenuButton
            icon={geocoding ? '⏳' : '🔍'}
            onClick={handleWhatsHere}
            disabled={geocoding}
          >
            {geocoding ? 'Looking up…' : "What's here?"}
          </MenuButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
