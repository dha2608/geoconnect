/**
 * useMessaging.js — Real-time messaging actions over Socket.io
 *
 * Responsibilities:
 *  • joinConversation(id) — join conversation room for messages + typing events
 *  • sendMessage({ conversationId, message }) — emit message with full data
 *  • emitEditMessage({ conversationId, message }) — broadcast edited message
 *  • emitReaction({ conversationId, message }) — broadcast reaction change
 *  • startTyping / stopTyping — typing indicators with 3s auto-stop
 */

import { useCallback, useRef, useEffect } from 'react';
import { getSocket } from './socket';

const TYPING_DEBOUNCE_MS = 3_000;

export default function useMessaging() {
  const typingTimerRef = useRef(null);

  // Cleanup typing timer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  const joinConversation = useCallback((conversationId) => {
    if (!conversationId) return;
    const socket = getSocket();
    if (!socket?.connected) return;

    socket.emit('join_conversation', { conversationId });
  }, []);

  const sendMessage = useCallback(({ conversationId, message }) => {
    const socket = getSocket();
    if (!socket?.connected || !conversationId) return;

    socket.emit('message_send', { conversationId, message });
  }, []);

  const emitEditMessage = useCallback(({ conversationId, message }) => {
    const socket = getSocket();
    if (!socket?.connected || !conversationId) return;

    socket.emit('message_edit', { conversationId, message });
  }, []);

  const emitReaction = useCallback(({ conversationId, message }) => {
    const socket = getSocket();
    if (!socket?.connected || !conversationId) return;

    socket.emit('reaction_add', { conversationId, message });
  }, []);

  const startTyping = useCallback((conversationId) => {
    const socket = getSocket();
    if (!socket?.connected || !conversationId) return;

    socket.emit('typing_start', { conversationId });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId });
      typingTimerRef.current = null;
    }, TYPING_DEBOUNCE_MS);
  }, []);

  const stopTyping = useCallback((conversationId) => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const socket = getSocket();
    if (!socket?.connected || !conversationId) return;
    socket.emit('typing_stop', { conversationId });
  }, []);

  return { joinConversation, sendMessage, emitEditMessage, emitReaction, startTyping, stopTyping };
}
