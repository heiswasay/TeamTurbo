/**
 * Chrome Desktop & System Notification Service
 * Supports Notification API, sound synth chimes, and fallback handling.
 */
import faviconIcon from '../images/favicon.png';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  soundEnabled?: boolean;
  onClick?: () => void;
}

/**
 * Check if the browser supports Desktop Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission state
 */
export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

/**
 * Request notification permission from the user in Chrome
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const perm = await window.Notification.requestPermission();
    if (perm === 'granted') {
      // Send a confirmation desktop notification
      sendChromeNotification({
        title: '🔔 Notifications Enabled',
        body: 'You will now receive instant Chrome desktop alerts for new tasks, handovers, and reviews.',
        tag: 'welcome-notification',
        soundEnabled: true,
      });
    }
    return perm;
  } catch (err) {
    console.warn('Notification permission request failed:', err);
    return getNotificationPermissionStatus();
  }
}

/**
 * Play a clean, gentle synthetic audio chime via Web Audio API
 */
export function playNotificationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Note 1 (High bell ding)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2 (Harmonic echo)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.08); // E6
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

/**
 * Dispatches a native desktop notification if permission is granted
 */
export function sendChromeNotification({
  title,
  body,
  tag,
  icon = faviconIcon,
  soundEnabled = true,
  onClick,
}: DesktopNotificationPayload): boolean {
  if (soundEnabled) {
    playNotificationChime();
  }

  if (!isNotificationSupported() || window.Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new window.Notification(title, {
      body,
      icon,
      tag: tag || `tracker-notif-${Date.now()}`,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClick) onClick();
    };

    // Auto-close notification after 8 seconds
    setTimeout(() => {
      try {
        notification.close();
      } catch {
        // Already closed
      }
    }, 8000);

    return true;
  } catch (err) {
    console.warn('Failed to display Chrome notification:', err);
    return false;
  }
}
