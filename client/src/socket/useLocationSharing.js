/**
 * useLocationSharing.js — Live location sharing with mutual-follower broadcast
 *
 * Responsibilities:
 *  • Toggle geolocation watchPosition → emit `location_update` to server
 *  • Emit `stop_sharing` and clear watch on stop
 *  • Listen to `friend_location` / `friend_offline` and maintain a Map of
 *    live friend positions for the map layer to consume
 *
 * Usage:
 *   const { isSharing, startSharing, stopSharing, friendLocations } = useLocationSharing();
 *
 *   friendLocations: Map<userId, { lat, lng, heading, timestamp }>
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from './socket';

const DEBUG = import.meta.env.DEV;
const log = (...args) => DEBUG && console.log(...args);
const logWarn = (...args) => DEBUG && console.warn(...args);
const logError = (...args) => DEBUG && console.error(...args);

/** Geolocation options — high accuracy, allow up to 10 s cached positions */
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 10_000,   // ms
  timeout: 15_000,       // ms
};

export default function useLocationSharing() {
  const [isSharing, setIsSharing] = useState(false);
  /** @type {[Map<string, {lat:number, lng:number, heading:number|null, timestamp:number}>]} */
  const [friendLocations, setFriendLocations] = useState(new Map());

  // watchId can legitimately be 0, so use null as the "not watching" sentinel
  const watchIdRef = useRef(null);

  // ── Start sharing ─────────────────────────────────────────────────────────
  const startSharing = useCallback(() => {
    const socket = getSocket();

    if (!socket) {
      logWarn('[useLocationSharing] Socket not connected — cannot start sharing');
      return;
    }

    if (!navigator.geolocation) {
      logError('[useLocationSharing] Geolocation API not available in this browser');
      return;
    }

    if (watchIdRef.current !== null) {
      // Already watching — no-op
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        socket.emit('location_update', {
          lat: coords.latitude,
          lng: coords.longitude,
          heading: coords.heading ?? null,
        });
      },
      (err) => {
        logError('[useLocationSharing] Geolocation error:', err.message);
        // On permission denied, clean up gracefully
        if (err.code === err.PERMISSION_DENIED) stopSharing();
      },
      GEO_OPTIONS
    );

    setIsSharing(true);
    log('[useLocationSharing] Started sharing location');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop sharing ──────────────────────────────────────────────────────────
  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const socket = getSocket();
    socket?.emit('stop_sharing');

    setIsSharing(false);
    log('[useLocationSharing] Stopped sharing location');
  }, []);

  // ── Listen for friend location events ────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleFriendLocation = ({ userId, lat, lng, heading, timestamp }) => {
      setFriendLocations((prev) => {
        const next = new Map(prev);
        next.set(userId, { lat, lng, heading: heading ?? null, timestamp });
        return next;
      });
    };

    const handleFriendOffline = ({ userId }) => {
      setFriendLocations((prev) => {
        if (!prev.has(userId)) return prev; // Avoid unnecessary re-renders
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('friend_location', handleFriendLocation);
    socket.on('friend_offline', handleFriendOffline);

    return () => {
      socket.off('friend_location', handleFriendLocation);
      socket.off('friend_offline', handleFriendOffline);

      // Clean up geolocation watch if the component unmounts while sharing
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []); // Re-subscribe only if needed — socket is a stable singleton

  return {
    /** Whether the local user is currently broadcasting their position */
    isSharing,
    /** Start GPS watchPosition and begin emitting location_update */
    startSharing,
    /** Stop GPS watchPosition and emit stop_sharing */
    stopSharing,
    /** Live map of userId → { lat, lng, heading, timestamp } for online friends */
    friendLocations,
  };
}
