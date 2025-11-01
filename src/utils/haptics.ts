// Haptic feedback utilities for swipe interactions

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  // Try modern Vibration API first
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30
    };
    navigator.vibrate(patterns[style]);
    return;
  }

  // Try iOS haptic feedback (requires user gesture)
  if (window && 'ontouchstart' in window) {
    try {
      // iOS haptic feedback through audio context (silent)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0.01; // Nearly silent
      oscillator.frequency.value = 200;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.01);
    } catch (e) {
      // Haptics not supported, fail silently
    }
  }
};

export const swipeHaptics = {
  like: () => triggerHaptic('medium'),
  dislike: () => triggerHaptic('light'),
  wishlist: () => triggerHaptic('heavy'),
  return: () => triggerHaptic('light'),
  selection: () => triggerHaptic('light')
};
