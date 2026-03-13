import { useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchNearbyUsers } from '../../features/users/userSlice';
import { openModal } from '../../features/ui/uiSlice';

/**
 * NearbyUsersLayer
 *
 * Must be rendered inside a <MapContainer> (uses react-leaflet's useMap hook).
 * Renders each nearby user as a small circular avatar marker on the Leaflet map.
 * Clicking a marker opens the UserProfile modal via Redux.
 */
const NearbyUsersLayer = memo(function NearbyUsersLayer() {
  const map      = useMap();
  const dispatch = useDispatch();
  const { nearbyUsers }  = useSelector((state) => state.users);
  const { userLocation } = useSelector((state) => state.map);

  // ── Fetch nearby users whenever the authenticated user's position changes ──
  useEffect(() => {
    if (userLocation) {
      dispatch(
        fetchNearbyUsers({
          lat:    userLocation.lat,
          lng:    userLocation.lng,
          radius: 5000, // 5 km
        })
      );
    }
  }, [userLocation, dispatch]);

  // ── Render / clean-up Leaflet markers whenever nearbyUsers list changes ──
  useEffect(() => {
    const markers = [];

    nearbyUsers.forEach((user) => {
      if (!user.location?.coordinates) return;

      // Avatar circle — uses the user's avatar image or an initial letter fallback
      const icon = L.divIcon({
        className: '', // strip Leaflet's default white box
        html: `<div style="
          width: 28px; height: 28px; border-radius: 50%;
          border: 2px solid #06b6d4;
          background: ${
            user.avatar
              ? `url(${user.avatar}) center/cover no-repeat`
              : 'var(--bg-elevated)'
          };
          box-shadow: 0 0 10px rgba(6,182,212,0.3);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-primary); font-size: 11px; font-weight: 600;
          overflow: hidden;
        ">${!user.avatar ? (user.username || user.name || '?')[0].toUpperCase() : ''}</div>`,
        iconSize:   [28, 28],
        iconAnchor: [14, 14],
      });

      // GeoJSON stores [lng, lat] — Leaflet expects [lat, lng]
      const marker = L.marker(
        [user.location.coordinates[1], user.location.coordinates[0]],
        { icon, zIndexOffset: 500 }
      );

      // Click → open UserProfile modal
      marker.on('click', () => {
        dispatch(openModal({ type: 'userProfile', data: { userId: user._id } }));
      });

      // Hover tooltip
      marker.bindTooltip(user.username || user.name || 'User', {
        direction:  'top',
        className:  'dark-tooltip',
        offset:     [0, -14],
      });

      marker.addTo(map);
      markers.push(marker);
    });

    // Cleanup: remove all markers when effect re-runs or component unmounts
    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [nearbyUsers, map, dispatch]);

  return null; // purely imperative — no React DOM output
});

NearbyUsersLayer.displayName = 'NearbyUsersLayer';
export default NearbyUsersLayer;
