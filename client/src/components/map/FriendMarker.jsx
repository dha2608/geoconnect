/**
 * FriendMarker.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Renders animated moving dots on the map for friends who are live-sharing
 * their location via Socket.io.
 *
 * Each friend marker:
 *  • Pulsing green dot (distinguishes from user's blue dot)
 *  • Avatar overlay when profile data is loaded
 *  • Tooltip with name on hover
 *  • Popup on click: name, "last seen" timestamp, "Message" button
 *  • Smoothly transitions position via CSS transition on the Leaflet icon
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useDispatch } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import useLocationSharing from '../../socket/useLocationSharing';
import { userApi } from '../../api/userApi';
import { openModal } from '../../features/ui/uiSlice';
import Avatar from '../ui/Avatar';

// ─── Icon Factory ─────────────────────────────────────────────────────────────

/**
 * Creates a Leaflet DivIcon for a live-sharing friend.
 * If avatar URL is provided, shows a small circular avatar.
 * Otherwise, shows a pulsing green dot.
 */
function createFriendIcon(avatar, name) {
  if (avatar) {
    return L.divIcon({
      className: '',
      html: `
        <div class="friend-marker-avatar" title="${name ?? ''}">
          <img src="${avatar}" alt="" />
          <span class="friend-pulse-ring"></span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  // Fallback: pulsing green dot with initial
  const initial = (name ?? '?').charAt(0).toUpperCase();
  return L.divIcon({
    className: '',
    html: `
      <div class="friend-marker-dot">
        <span class="friend-dot-initial">${initial}</span>
        <span class="friend-pulse-ring"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ─── Single Friend Marker ─────────────────────────────────────────────────────

function SingleFriendMarker({ userId, lat, lng, heading, timestamp }) {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const fetchedRef = useRef(false);

  // Fetch friend profile once
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    userApi
      .getProfile(userId)
      .then((res) => setProfile(res.data?.user || res.data))
      .catch(() => {
        /* silent — use fallback icon */
      });
  }, [userId]);

  const name = profile?.displayName || profile?.name || profile?.username || null;
  const avatar = profile?.avatar || null;
  const icon = createFriendIcon(avatar, name);

  const timeAgo = timestamp
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : 'just now';

  const handleMessage = useCallback(() => {
    // Open messaging panel with this friend
    dispatch(openModal({ modal: 'messages', data: { userId, userName: name } }));
  }, [dispatch, userId, name]);

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      zIndexOffset={900}
    >
      {/* Hover tooltip */}
      <Tooltip
        direction="top"
        offset={[0, -20]}
        className="friend-tooltip"
        permanent={false}
      >
        <span className="text-xs font-semibold">
          {name ?? 'Friend'} — {heading != null ? `${Math.round(heading)}°` : 'live'}
        </span>
      </Tooltip>

      {/* Click popup */}
      <Popup
        className="friend-popup"
        closeButton={false}
        autoPan={false}
        offset={[0, -18]}
      >
        <div className="flex flex-col items-center gap-2 p-1 min-w-[140px]">
          {/* Avatar + name */}
          <div className="flex items-center gap-2">
            {avatar ? (
              <img
                src={avatar}
                alt={name ?? ''}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-accent-success/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-success/20 flex items-center justify-center text-sm font-bold text-accent-success">
                {(name ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-txt-primary leading-tight">
                {name ?? 'Friend'}
              </span>
              <span className="text-[10px] text-txt-muted">{timeAgo}</span>
            </div>
          </div>

          {/* Message button */}
          <button
            onClick={handleMessage}
            className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30
                       transition-colors"
          >
            💬 Message
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

// ─── FriendMarker Layer ───────────────────────────────────────────────────────

export default function FriendMarker() {
  const { friendLocations } = useLocationSharing();

  if (friendLocations.size === 0) return null;

  return (
    <>
      {Array.from(friendLocations.entries()).map(([userId, loc]) => (
        <SingleFriendMarker
          key={userId}
          userId={userId}
          lat={loc.lat}
          lng={loc.lng}
          heading={loc.heading}
          timestamp={loc.timestamp}
        />
      ))}
    </>
  );
}
