import { useEffect } from 'react';
import { formatTimeClock } from '../utils/formatTime';
import type { Task } from '../types';

/**
 * Updates document.title to reflect the current active task state.
 *
 * | State             | Title                          |
 * |-------------------|--------------------------------|
 * | No active task    | Focus — Task Tracker           |
 * | Active (timed)    | ▶ 04:32 — Design review        |
 * | Active (open)     | ▶ 12:05 — Research notes        |
 * | Paused            | ⏸ 04:32 — Design review        |
 */
export function useDocumentTitle(activeTask: Task | null) {
  useEffect(() => {
    if (!activeTask) {
      document.title = 'Focus — Task Tracker';
      return;
    }

    const isPaused = activeTask.status === 'paused';
    const icon = isPaused ? '⏸' : '▶';
    const isOpenEnded = activeTask.time === 0;
    const time = isOpenEnded
      ? formatTimeClock(activeTask.timeSpent)
      : formatTimeClock(activeTask.remainingTime);

    document.title = `${icon} ${time} — ${activeTask.name}`;
  }, [activeTask]);
}
