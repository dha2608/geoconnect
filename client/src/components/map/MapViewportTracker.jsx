import useMapViewport from '../../hooks/useMapViewport';

/**
 * MapViewportTracker — zero-UI component that syncs the Leaflet
 * viewport (center + zoom) back to Redux whenever the user pans or zooms.
 *
 * Must be rendered inside <MapContainer> so that useMapViewport can
 * call useMapEvents internally.
 */
export default function MapViewportTracker() {
  useMapViewport();
  return null;
}
