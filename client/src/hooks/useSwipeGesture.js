import { useCallback, useRef } from 'react';

/**
 * useSwipeGesture – detect horizontal touch swipes.
 *
 * @param {Object}    options
 * @param {() => void} [options.onSwipeLeft]    – fired on left swipe  (←)
 * @param {() => void} [options.onSwipeRight]   – fired on right swipe (→)
 * @param {number}    [options.threshold=50]    – minimum px distance to count
 * @param {number}    [options.maxDuration=300] – max ms the gesture may last
 * @param {number}    [options.edgeWidth=Infinity]
 *   Only trigger right-swipe when the touch started within this many px from
 *   the left edge of the screen.  Left swipes are never edge-restricted.
 *
 * @returns {{ onTouchStart, onTouchMove, onTouchEnd }}
 *   Spread these onto any React element to activate gesture detection.
 */
export default function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold   = 50,
  maxDuration = 300,
  edgeWidth   = Infinity,
} = {}) {
  const gesture = useRef(null);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    gesture.current = {
      startX:    touch.clientX,
      startY:    touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  // Passive placeholder — kept for completeness / future drag feedback
  const onTouchMove = useCallback(() => {}, []);

  const onTouchEnd = useCallback((e) => {
    if (!gesture.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - gesture.current.startX;
    const dy = touch.clientY - gesture.current.startY;
    const dt = Date.now() - gesture.current.startTime;
    const { startX } = gesture.current;
    gesture.current = null;

    // Reject slow, short, or vertical-dominant gestures
    if (dt > maxDuration)              return;
    if (Math.abs(dx) < threshold)      return;
    if (Math.abs(dy) > Math.abs(dx))   return; // vertical-dominant → ignore

    if (dx > 0) {
      // Right swipe — only fire when started within edgeWidth px from left edge
      if (startX <= edgeWidth) onSwipeRight?.();
    } else {
      // Left swipe — no edge restriction
      onSwipeLeft?.();
    }
  }, [onSwipeLeft, onSwipeRight, threshold, maxDuration, edgeWidth]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
