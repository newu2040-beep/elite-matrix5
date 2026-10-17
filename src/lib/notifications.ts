// Push Notifications & Apple-style Audio / Haptic Feedback Utility

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
}

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'denied' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Notification permission request error:', err);
    return 'denied';
  }
}

/**
 * Plays a crystalline, Apple-style two-tone success chime using the Web Audio API.
 * Requires 0 external audio assets and plays reliably with zero latency.
 */
export function playAppleSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Harmonic tones: C6 (1046.5Hz) & E6 (1318.5Hz) & G6 (1567.98Hz)
    const tones = [
      { freq: 1046.5, timeOffset: 0.0, duration: 0.45 },
      { freq: 1318.5, timeOffset: 0.08, duration: 0.55 },
      { freq: 1567.98, timeOffset: 0.16, duration: 0.8 },
    ];

    tones.forEach(({ freq, timeOffset, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + timeOffset);

      gain.gain.setValueAtTime(0.0001, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.12, now + timeOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + duration + 0.05);
    });
  } catch (e) {
    console.warn('Audio chime playback omitted or unsupported:', e);
  }
}

/**
 * Triggers device haptic feedback if supported (e.g. mobile Safari / Chrome)
 */
export function triggerHapticSuccess() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 100]);
    }
  } catch {
    // Ignore haptic failures
  }
}

/**
 * Dispatches a native push notification, plays harmonic chime, and triggers haptic pulse
 */
export function sendCompleteNotification(title: string, options?: NotificationOptions) {
  // Always trigger sound & haptics
  playAppleSuccessChime();
  triggerHapticSuccess();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: true, // We already play our bespoke chime
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Direct notification failed, attempting SW fallback:', e);
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
        });
      }
    }
  }
}
