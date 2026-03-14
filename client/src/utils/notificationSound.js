/**
 * Notification sound utility using Web Audio API
 * Generates a pleasant notification chime without any external audio files
 */

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a pleasant notification chime
 * @param {'default' | 'message' | 'success' | 'warning'} type
 */
export function playNotificationSound(type = 'default') {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Gain node for volume envelope
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'message': {
        // Two-note ascending chime
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc1.connect(gainNode);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc1.start(now);
        osc1.stop(now + 0.4);
        break;
      }
      case 'success': {
        // Three-note ascending arpeggio
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc2.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc2.connect(gainNode);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc2.start(now);
        osc2.stop(now + 0.5);
        break;
      }
      case 'warning': {
        // Two descending notes
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(440, now); // A4
        osc3.frequency.setValueAtTime(349.23, now + 0.15); // F4
        osc3.connect(gainNode);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc3.start(now);
        osc3.stop(now + 0.4);
        break;
      }
      default: {
        // Single soft ping
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
    }
  } catch (e) {
    // Silently fail — audio is a nice-to-have
    console.warn('[notificationSound] Failed to play:', e.message);
  }
}

/**
 * Request browser notification permission
 * @returns {Promise<boolean>} whether permission was granted
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a browser push notification
 * @param {string} title
 * @param {object} options - { body, icon, tag, data }
 */
export function showBrowserNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn('[browserNotification] Failed:', e.message);
  }
}
