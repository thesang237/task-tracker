import { useCallback, useRef } from 'react';

/**
 * Synthesizes a two-note chime (C5 → E5) using the Web Audio API.
 * No external audio files needed. Works in background tabs.
 *
 * Returns a stable `playChime()` function.
 */
export function useCompletionSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    if (!enabled) return;

    try {
      // Reuse or create AudioContext
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;

      // Resume if suspended (autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Three-note chime: C5 → E5 → G5 (major triad, uplifting)
      const notes = [523.25, 659.25, 783.99];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const onset = now + i * 0.15;
        gain.gain.setValueAtTime(0, onset);
        gain.gain.linearRampToValueAtTime(0.25, onset + 0.02); // quick attack
        gain.gain.exponentialRampToValueAtTime(0.001, onset + 0.6); // smooth decay

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(onset);
        osc.stop(onset + 0.6);
      });
    } catch (err) {
      console.warn('Could not play completion chime:', err);
    }
  }, [enabled]);

  return playChime;
}
