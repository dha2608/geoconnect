/**
 * useSocket.js — React hook that owns the socket lifecycle
 *
 * Responsibilities:
 *  • Connect when the user is authenticated; disconnect when they log out
 *  • Join the personal user room (`user:<userId>`) on the server
 *  • Fan out real-time events to Redux:
 *      notification  → notificationSlice.addNotification
 *      new_message   → messageSlice.addMessage
 *      typing        → messageSlice.setTyping  (conversationId sourced from activeConversation)
 *
 * Mount this hook **once** at the app root (e.g. <App> or a layout component)
 * so the socket persists across page navigation.
 */

import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { connectSocket, disconnectSocket, getSocket } from './socket';
import { addNotification } from '../features/notifications/notificationSlice';
import { addMessage, setTyping } from '../features/messages/messageSlice';

export default function useSocket() {
  const dispatch = useDispatch();

  // Auth state
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  // activeConversation used to tag incoming `typing` events with a conversationId,
  // because the server emits { userId, isTyping } without repeating the conversationId.
  const activeConversation = useSelector(
    (state) => state.messages.activeConversation
  );

  // Keep a stable ref to activeConversation so event handlers don't go stale
  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Guard against duplicate listener registration across StrictMode double-invocations
  const listenersRegistered = useRef(false);

  useEffect(() => {
    // ── Not authenticated: ensure socket is torn down ──────────────────────
    if (!isAuthenticated || !user?._id) {
      disconnectSocket();
      listenersRegistered.current = false;
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('[useSocket] No access token found — skipping connection');
      return;
    }

    const socket = connectSocket(token);

    // ── One-time listener registration ─────────────────────────────────────
    if (!listenersRegistered.current) {
      // Join the personal room so the server can target this client directly
      socket.emit('join_room', { userId: user._id });

      // ── notification ────────────────────────────────────────────────────
      const handleNotification = (notification) => {
        dispatch(addNotification(notification));
      };

      // ── new_message ─────────────────────────────────────────────────────
      // Server emits: { conversationId, text, sender, locationPin, timestamp }
      const handleNewMessage = (message) => {
        dispatch(addMessage(message));
      };

      // ── typing ──────────────────────────────────────────────────────────
      // Server emits { userId, isTyping } to the conversation room.
      // We tag it with the activeConversation id from the ref so Redux
      // knows which conversation's indicator to update.
      const handleTyping = ({ userId, isTyping }) => {
        const conversationId = activeConversationRef.current;
        if (!conversationId) return; // Ignore if no active conversation is open
        dispatch(setTyping({ conversationId, userId, isTyping }));
      };

      socket.on('notification', handleNotification);
      socket.on('new_message', handleNewMessage);
      socket.on('typing', handleTyping);

      // Re-join personal room after every reconnect
      const handleReconnect = () => {
        socket.emit('join_room', { userId: user._id });
      };
      socket.on('reconnect', handleReconnect);

      listenersRegistered.current = true;

      // ── Cleanup ─────────────────────────────────────────────────────────
      return () => {
        socket.off('notification', handleNotification);
        socket.off('new_message', handleNewMessage);
        socket.off('typing', handleTyping);
        socket.off('reconnect', handleReconnect);
        listenersRegistered.current = false;
        // Note: we intentionally do NOT call disconnectSocket() here so the
        // connection survives re-renders. Disconnection happens only when
        // isAuthenticated becomes false (handled at the top of this effect).
      };
    }
  }, [isAuthenticated, user?._id, dispatch]);

  // Expose the getter so consumers can send events without a separate import
  return getSocket;
}
