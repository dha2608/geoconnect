/**
 * useMessaging.js — Real-time messaging actions over Socket.io
 *
 * Responsibilities:
 *  • joinConversation(id) — join the server-side conversation room so this
 *    client receives `new_message` and `typing` events for that conversation
 *  • sendMessage({ conversationId, text, locationPin }) — emit message_send
 *  • startTyping(conversationId) — emit typing_start + auto-stop after 3 s
 *  • stopTyping(conversationId)  — emit typing_stop and clear the auto-stop timer
 *
 * NOTE — Server gap:
 *   The server's `join_room` handler maps { userId } → `user:${userId}` room,
 *   but it broadcasts messages/typing to `conversation:${conversationId}`.
 *   Until the server exposes a dedicated `join_conversation` event, this hook
 *   emits `join_room` with `{ userId: conversationId }`, which causes the server
 *   to place this socket in `user:<conversationId>`. This won't match the
 *   `conversation:*` broadcast — a server-side `join_conversation` handler is
 *   the clean fix when that endpoint is added.
 *
 * Usage:
 *   const { joinConversation, sendMessage, startTyping, stopTyping } = useMessaging();
 */

import { useCallback, useRef } from 'react';
import { getSocket } from './socket';

/** How long (ms) without a keystroke before typing_stop is auto-sent */
const TYPING_DEBOUNCE_MS = 3_000;

export default function useMessaging() {
  /** Debounce timer for auto-stop typing */
  const typingTimerRef = useRef(null);

  // ── Join conversation room ─────────────────────────────────────────────
  /**
   * Join the server-side room for a conversation so socket events are received.
   *
   * @param {string} conversationId
   */
  const joinConversation = useCallback((conversationId) => {
    if (!conversationId) return;
    const socket = getSocket();

    if (!socket?.connected) {
      console.warn('[useMessaging] Socket not connected — cannot join conversation');
      return;
    }

    // TODO: replace with `join_conversation` once the server handler exists.
    //       Current server `join_room` routes to `user:${userId}`, not `conversation:*`.
    socket.emit('join_room', { userId: conversationId });
    console.log(`[useMessaging] Joined conversation room: ${conversationId}`);
  }, []);

  // ── Send message ──────────────────────────────────────────────────────
  /**
   * @param {{ conversationId: string, text?: string, locationPin?: object }} payload
   */
  const sendMessage = useCallback(({ conversationId, text, locationPin }) => {
    const socket = getSocket();

    if (!socket?.connected) {
      console.warn('[useMessaging] Socket not connected — message not sent');
      return;
    }

    if (!conversationId) {
      console.error('[useMessaging] sendMessage requires a conversationId');
      return;
    }

    socket.emit('message_send', {
      conversationId,
      text: text ?? '',
      locationPin: locationPin ?? null,
    });
  }, []);

  // ── Typing indicators ─────────────────────────────────────────────────
  /**
   * Emit typing_start and schedule an automatic typing_stop after 3 s.
   * Calling this repeatedly resets the debounce timer (mirrors real keystroke cadence).
   *
   * @param {string} conversationId
   */
  const startTyping = useCallback((conversationId) => {
    const socket = getSocket();
    if (!socket?.connected || !conversationId) return;

    socket.emit('typing_start', { conversationId });

    // Reset the auto-stop timer on every keystroke
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId });
      typingTimerRef.current = null;
    }, TYPING_DEBOUNCE_MS);
  }, []);

  /**
   * Explicitly emit typing_stop and cancel any pending auto-stop timer.
   *
   * @param {string} conversationId
   */
  const stopTyping = useCallback((conversationId) => {
    const socket = getSocket();

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (!socket?.connected || !conversationId) return;
    socket.emit('typing_stop', { conversationId });
  }, []);

  return {
    /** Join a conversation room to receive its messages and typing events */
    joinConversation,
    /** Emit a new message to a conversation */
    sendMessage,
    /** Signal that the user is typing (auto-stops after 3 s of inactivity) */
    startTyping,
    /** Explicitly signal the user stopped typing */
    stopTyping,
  };
}
