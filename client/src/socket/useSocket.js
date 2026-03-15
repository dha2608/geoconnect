/**
 * useSocket.js — React hook that owns the socket lifecycle
 *
 * Responsibilities:
 *  • Connect when authenticated; disconnect on logout
 *  • Join personal user room (`user:<userId>`)
 *  • Fan out real-time events to Redux
 */

import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { connectSocket, disconnectSocket, getSocket } from './socket';
import { addNotification } from '../features/notifications/notificationSlice';
import { addMessage, updateMessage, setTyping } from '../features/messages/messageSlice';

export default function useSocket() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const activeConversation = useSelector(
    (state) => state.messages.activeConversation
  );

  // Stable refs to avoid stale closures in event handlers
  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    // Not authenticated → tear down socket
    if (!isAuthenticated || !user?._id) {
      disconnectSocket();
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = connectSocket(token);

    // Join personal room
    socket.emit('join_room', { userId: user._id });

    // ── Event handlers ──
    const handleNotification = (notification) => {
      dispatchRef.current(addNotification(notification));
    };

    const handleNewMessage = ({ message }) => {
      if (message) dispatchRef.current(addMessage(message));
    };

    const handleMessageEdited = ({ message }) => {
      if (message) dispatchRef.current(updateMessage(message));
    };

    const handleReactionUpdated = ({ message }) => {
      if (message) dispatchRef.current(updateMessage(message));
    };

    const handleTyping = ({ userId, isTyping }) => {
      const conversationId = activeConversationRef.current;
      if (!conversationId) return;
      dispatchRef.current(setTyping({ conversationId, userId, isTyping }));
    };

    const handleReconnect = () => {
      socket.emit('join_room', { userId: user._id });
    };

    socket.on('notification', handleNotification);
    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('typing', handleTyping);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('typing', handleTyping);
      socket.off('reconnect', handleReconnect);
      // Do NOT disconnect — socket survives re-renders.
      // Disconnect only happens when isAuthenticated becomes false.
    };
  }, [isAuthenticated, user?._id]);

  return getSocket;
}
