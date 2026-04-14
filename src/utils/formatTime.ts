/**
 * Format seconds as HH:MM:SS clock display.
 * e.g. 3661 → "01:01:01"
 */
export function formatTimeClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Format seconds as a human-readable string.
 * e.g. 3661 → "1h 1m 1s", 90 → "1m 30s", 5 → "5s"
 * Returns "—" for 0 (open-ended / no duration).
 */
export function formatTimeHuman(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Derive a deterministic HSL hue (0–360) from a string.
 * Used to color-code category pills consistently.
 */
export function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
