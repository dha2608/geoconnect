import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useMapEvents } from 'react-leaflet';
import { setCenter, setZoom, setViewport } from '../features/map/mapSlice';
import { fetchViewportPins } from '../features/pins/pinSlice';
import { fetchViewportEvents } from '../features/events/eventSlice';

export default function useMapViewport() {
  const dispatch = useDispatch();
  const debounceRef = useRef(null);

  const updateViewport = useCallback((map) => {
    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = map.getZoom();

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
    dispatch(fetchViewportPins(viewport));
    dispatch(fetchViewportEvents(viewport));
  }, [dispatch]);

  const map = useMapEvents({
    moveend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateViewport(map), 300);
    },
    zoomend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateViewport(map), 300);
    },
    load: () => {
      updateViewport(map);
    },
  });

  return null; // This is a behavior-only component used inside MapContainer
}
