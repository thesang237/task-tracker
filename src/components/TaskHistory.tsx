import { useState, useCallback, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { formatTimeHuman, stringToHue } from '../utils/formatTime';
import './TaskHistory.scss';

type SortField = 'completedAt' | 'name' | 'category' | 'timeSpent';
type SortOrder = 'asc' | 'desc';

const SORT_LABELS: Record<SortField, string> = {
  completedAt: 'Recent',
  name: 'Name',
  category: 'Category',
  timeSpent: 'Time',
};

export function TaskHistory() {
  const { taskHistory, deleteHistoryTask } = useTaskContext();
  const [sortField, setSortField] = useState<SortField>('completedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField]);

  const sortedHistory = useMemo(() => {
    return [...taskHistory].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'completedAt': {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : -Infinity;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : -Infinity;
          comparison = aTime - bTime;
          break;
        }
        case 'name': comparison = a.name.localeCompare(b.name); break;
        case 'category': comparison = a.category.localeCompare(b.category); break;
        case 'timeSpent': comparison = (a.timeSpent ?? a.time) - (b.timeSpent ?? b.time); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [taskHistory, sortField, sortOrder]);

  const formatDateTime = (isoString?: string): string => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="task-history">
      <div className="task-history__header">
        <h2 className="task-history__title">
          History
          {taskHistory.length > 0 && (
            <span className="task-history__count">{taskHistory.length}</span>
          )}
        </h2>

        {taskHistory.length > 0 && (
          <div className="task-history__sort-bar">
            {(Object.keys(SORT_LABELS) as SortField[]).map(field => (
              <button
                key={field}
                className={`task-history__sort-btn ${sortField === field ? 'task-history__sort-btn--active' : ''}`}
                onClick={() => handleSort(field)}
              >
                {SORT_LABELS[field]}
                {sortField === field && (
                  <span className="task-history__sort-arrow">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {taskHistory.length === 0 ? (
        <div className="task-history__empty">
          <div className="task-history__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <p className="task-history__empty-title">No history yet</p>
          <p className="task-history__empty-sub">Completed tasks will appear here</p>
        </div>
      ) : (
        <div className="task-history__list">
          {sortedHistory.map((task) => {
            const hue = stringToHue(task.category);
            const timeSpent = task.timeSpent ?? task.time;
            const wasEarly = task.time > 0 && timeSpent < task.time;

            return (
              <div key={task.id} className="task-history__item">
                <div
                  className="task-history__item-accent"
                  style={{ background: `hsl(${hue}, 60%, 50%)` }}
                />

                <div className="task-history__item-body">
                  <div className="task-history__item-top">
                    <span className="task-history__item-name">{task.name}</span>
                    <span className="task-history__item-time">
                      {formatDateTime(task.completedAt)}
                    </span>
                  </div>

                  <div className="task-history__item-meta">
                    <span
                      className="task-history__item-category"
                      style={{
                        background: `hsl(${hue}, 60%, 92%)`,
                        color: `hsl(${hue}, 50%, 28%)`,
                      }}
                    >
                      {task.category}
                    </span>

                    <span className="task-history__item-duration">
                      {formatTimeHuman(timeSpent)}
                      {wasEarly && (
                        <span className="task-history__item-of"> / {formatTimeHuman(task.time)}</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="task-history__item-actions">
                  {confirmDeleteId === task.id ? (
                    <>
                      <button
                        className="task-history__action-btn task-history__action-btn--confirm"
                        onClick={() => { deleteHistoryTask(task.id); setConfirmDeleteId(null); }}
                        title="Confirm delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button
                        className="task-history__action-btn task-history__action-btn--cancel"
                        onClick={() => setConfirmDeleteId(null)}
                        title="Cancel"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </>
                  ) : (
                    <button
                      className="task-history__action-btn task-history__action-btn--delete"
                      onClick={() => setConfirmDeleteId(task.id)}
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
