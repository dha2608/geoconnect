import { useSelector } from 'react-redux';
import { Marker, Circle } from 'react-leaflet';
import L from 'leaflet';

/**
 * Matches the `.user-dot` CSS class: 14 × 14 px blue pulsing circle.
 * iconAnchor centers the div over the lat/lng point.
 */
const userDotIcon = L.divIcon({
  className: '', // suppress Leaflet's default white-box styling
  html: '<div class="user-dot"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/**
 * UserLocationMarker — renders two Leaflet layers:
 *
 *  1. A semi-transparent Circle representing GPS accuracy radius.
 *  2. A Marker with the custom pulsing `.user-dot` icon.
 *
 * Returns null when userLocation is not yet available.
 */
export default function UserLocationMarker() {
  const { userLocation } = useSelector((state) => state.map);

  if (!userLocation) return null;

  const { lat, lng, accuracy } = userLocation;

  return (
    <>
      {/* Accuracy halo — radius in metres */}
      <Circle
        center={[lat, lng]}
        radius={accuracy ?? 50}
        pathOptions={{
          fillColor: '#8b5cf6',
          fillOpacity: 0.08,
          stroke: true,
          color: '#8b5cf6',
          opacity: 0.2,
          weight: 1,
        }}
      />

      {/* Pulsing position dot */}
      <Marker
        position={[lat, lng]}
        icon={userDotIcon}
        zIndexOffset={1000}
        interactive={false}
      />
    </>
  );
}
