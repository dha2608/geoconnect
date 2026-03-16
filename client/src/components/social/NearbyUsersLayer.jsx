import { useEffect, useState, useCallback, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { fetchNearbyUsers } from '../../features/users/userSlice';
import { openModal } from '../../features/ui/uiSlice';
import { getSocket } from '../../socket/socket';
import * as messageApi from '../../api/messageApi';

/**
 * NearbyUsersLayer
 *
 * Must be rendered inside a <MapContainer> (uses react-leaflet's useMap hook).
 * Renders each nearby user as a small circular avatar marker on the Leaflet map.
 *
 * Features:
 * - Shows users from DB (stored location) + live-sharing users (real-time socket)
 * - Click marker → popup with Profile + Message buttons
 * - Live-sharing users have a pulsing green border
 */
const NearbyUsersLayer = memo(function NearbyUsersLayer() {
  const map      = useMap();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { nearbyUsers }  = useSelector((state) => state.users);
  const { userLocation } = useSelector((state) => state.map);
  const currentUser      = useSelector((state) => state.auth.user);

  // Live locations received via socket (Map<userId, {lat, lng, heading, name, avatar, timestamp}>)
  const [liveUsers, setLiveUsers] = useState(new Map());

  // ── Fetch nearby users from DB whenever position changes ──────────────────
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

  // ── Listen for real-time nearby user socket events ────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNearbyLocation = ({ userId, name, avatar, lat, lng, heading, timestamp }) => {
      setLiveUsers((prev) => {
        const next = new Map(prev);
        next.set(userId, { lat, lng, heading, name, avatar, timestamp });
        return next;
      });
    };

    const handleNearbyOffline = ({ userId }) => {
      setLiveUsers((prev) => {
        if (!prev.has(userId)) return prev;
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('nearby_user_location', handleNearbyLocation);
    socket.on('nearby_user_offline', handleNearbyOffline);

    return () => {
      socket.off('nearby_user_location', handleNearbyLocation);
      socket.off('nearby_user_offline', handleNearbyOffline);
    };
  }, []);

  // ── Message a user — create/get conversation then navigate ────────────────
  const handleMessageUser = useCallback(async (userId) => {
    try {
      await messageApi.createConversation({ recipientId: userId });
      navigate('/messages');
    } catch (err) {
      console.error('[NearbyUsersLayer] Failed to create conversation:', err.message);
    }
  }, [navigate]);

  // ── Render / clean-up Leaflet markers whenever data changes ───────────────
  useEffect(() => {
    const markers = [];

    // Merge DB nearby users + live socket users (deduplicate by userId)
    const mergedMap = new Map();

    // First, add DB nearby users
    nearbyUsers.forEach((user) => {
      if (!user.location?.coordinates) return;
      mergedMap.set(user._id, {
        _id: user._id,
        name: user.name || user.username || 'User',
        avatar: user.avatar,
        lat: user.location.coordinates[1],
        lng: user.location.coordinates[0],
        isLive: !!user.isLiveSharing,
        bio: user.bio,
      });
    });

    // Then overlay/add live socket users (updates positions in real-time)
    for (const [userId, loc] of liveUsers) {
      // Skip self
      if (currentUser && userId === currentUser._id) continue;

      const existing = mergedMap.get(userId);
      if (existing) {
        // Update with live position
        existing.lat = loc.lat;
        existing.lng = loc.lng;
        existing.heading = loc.heading;
        existing.isLive = true;
      } else {
        // New live user not yet in DB results
        mergedMap.set(userId, {
          _id: userId,
          name: loc.name || 'User',
          avatar: loc.avatar || null,
          lat: loc.lat,
          lng: loc.lng,
          heading: loc.heading,
          isLive: true,
        });
      }
    }

    // Render markers for all merged users
    mergedMap.forEach((user) => {
      const borderColor = user.isLive ? '#10b981' : '#06b6d4';
      const shadowColor = user.isLive ? 'rgba(16,185,129,0.4)' : 'rgba(6,182,212,0.3)';
      const pulseClass  = user.isLive ? 'nearby-marker-live' : '';
      const initial     = (user.name || '?')[0].toUpperCase();

      const icon = L.divIcon({
        className: '',
        html: `<div class="${pulseClass}" style="
          width: 32px; height: 32px; border-radius: 50%;
          border: 2.5px solid ${borderColor};
          background: ${user.avatar ? `url(${user.avatar}) center/cover no-repeat` : 'var(--bg-elevated)'};
          box-shadow: 0 0 12px ${shadowColor};
          display: flex; align-items: center; justify-content: center;
          color: var(--text-primary); font-size: 12px; font-weight: 600;
          overflow: hidden; cursor: pointer;
        ">${!user.avatar ? initial : ''}</div>`,
        iconSize:   [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([user.lat, user.lng], { icon, zIndexOffset: 500 });

      // Popup with Profile + Message buttons
      const popupHtml = `
        <div style="text-align: center; min-width: 150px; font-family: inherit; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="
              width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
              border: 2px solid ${borderColor};
              background: ${user.avatar ? `url(${user.avatar}) center/cover` : 'var(--bg-elevated)'};
              display: flex; align-items: center; justify-content: center;
              font-size: 14px; font-weight: 600; color: var(--text-primary);
            ">${!user.avatar ? initial : ''}</div>
            <div style="text-align: left; min-width: 0;">
              <div style="font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.name}</div>
              ${user.isLive ? '<div style="font-size: 10px; color: #10b981; display: flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span> Live</div>' : ''}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button data-action="profile" data-user-id="${user._id}" style="
              flex: 1; padding: 6px 10px; border-radius: 8px;
              border: 1px solid rgba(255,255,255,0.12);
              background: rgba(255,255,255,0.06); color: inherit;
              cursor: pointer; font-size: 11px; font-weight: 500;
            ">Profile</button>
            <button data-action="message" data-user-id="${user._id}" style="
              flex: 1; padding: 6px 10px; border-radius: 8px;
              border: none; background: #06b6d4; color: white;
              cursor: pointer; font-size: 11px; font-weight: 500;
            ">Message</button>
          </div>
        </div>
      `;

      const popup = L.popup({
        className: 'nearby-user-popup',
        closeButton: false,
        offset: [0, -16],
      }).setContent(popupHtml);

      marker.bindPopup(popup);

      // Attach button event listeners when popup opens
      marker.on('popupopen', () => {
        const container = marker.getPopup().getElement();
        if (!container) return;

        const profileBtn = container.querySelector('[data-action="profile"]');
        const messageBtn = container.querySelector('[data-action="message"]');

        if (profileBtn) {
          profileBtn.addEventListener('click', () => {
            dispatch(openModal({ type: 'userProfile', data: { userId: user._id } }));
            marker.closePopup();
          });
        }

        if (messageBtn) {
          messageBtn.addEventListener('click', () => {
            handleMessageUser(user._id);
            marker.closePopup();
          });
        }
      });

      // Hover tooltip
      marker.bindTooltip(user.name, {
        direction:  'top',
        className:  'dark-tooltip',
        offset:     [0, -16],
      });

      marker.addTo(map);
      markers.push(marker);
    });

    // Cleanup: remove all markers when effect re-runs or component unmounts
    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [nearbyUsers, liveUsers, map, dispatch, currentUser, handleMessageUser]);

  return null; // purely imperative — no React DOM output
});

NearbyUsersLayer.displayName = 'NearbyUsersLayer';
export default NearbyUsersLayer;
