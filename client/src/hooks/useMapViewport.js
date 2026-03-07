import { useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useMapEvents } from 'react-leaflet';
import { setCenter, setZoom, setViewport } from '../features/map/mapSlice';
import { fetchViewportPins } from '../features/pins/pinSlice';
import { fetchViewportEvents } from '../features/events/eventSlice';

export default function useMapViewport() {
  const dispatch = useDispatch();
  const debounceRef = useRef(null);
  const lastBoundsRef = useRef(null);

  const updateViewport = useCallback((mapInstance) => {
    if (!mapInstance) return;

    const bounds = mapInstance.getBounds();
    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();

    // Skip if bounds haven't meaningfully changed (within ~0.001 degrees)
    const boundsKey = `${bounds.getSouth().toFixed(3)},${bounds.getWest().toFixed(3)},${bounds.getNorth().toFixed(3)},${bounds.getEast().toFixed(3)}`;
    if (lastBoundsRef.current === boundsKey) return;
    lastBoundsRef.current = boundsKey;

    dispatch(setCenter([center.lat, center.lng]));
    dispatch(setZoom(zoom));

    const viewport = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
    dispatch(setViewport(viewport));

    // Load pins and events for visible area
    const serverBounds = {
      swLat: bounds.getSouth(),
      swLng: bounds.getWest(),
      neLat: bounds.getNorth(),
      neLng: bounds.getEast(),
    };
    dispatch(fetchViewportPins(serverBounds));
    dispatch(fetchViewportEvents(serverBounds));
  }, [dispatch]);

  // Store map ref so debounced callbacks always reference the same instance
  const mapRef = useRef(null);

  const handleViewChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (mapRef.current) updateViewport(mapRef.current);
    }, 300);
  }, [updateViewport]);

  // useMapEvents returns the map instance and registers event handlers
  const map = useMapEvents({
    moveend: () => handleViewChange(),
    zoomend: () => handleViewChange(),
  });

  // Store map reference and trigger initial viewport load
  useEffect(() => {
    mapRef.current = map;
    if (map) updateViewport(map);

    // Cleanup debounce timer on unmount
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [map, updateViewport]);

  return null;
}
