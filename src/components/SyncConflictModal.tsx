import { useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { formatTimeHuman, stringToHue } from '../utils/formatTime';
import type { Task } from '../types';
import './SyncConflictModal.scss';

function TaskPreviewItem({ task }: { task: Task }) {
  const hue = stringToHue(task.category);
  return (
    <div className="sync-preview__item">
      <div className="sync-preview__item-accent" style={{ background: `hsl(${hue}, 60%, 50%)` }} />
      <div className="sync-preview__item-body">
        <span className="sync-preview__item-name">{task.name}</span>
        <div className="sync-preview__item-meta">
          <span
            className="sync-preview__item-cat"
            style={{
              background: `hsl(${hue}, 60%, 14%)`,
              color: `hsl(${hue}, 70%, 70%)`,
            }}
          >
            {task.category}
          </span>
          {task.project && task.project !== 'None' && (
            <span className="sync-preview__item-project">{task.project}</span>
          )}
        </div>
      </div>
      <span className="sync-preview__item-duration">
        {formatTimeHuman(task.timeSpent ?? task.time)}
      </span>
    </div>
  );
}

interface PanelProps {
  side: 'local' | 'cloud';
  activeTask: Task | null;
  history: Task[];
  onKeep: () => void;
}

function DataPanel({ side, activeTask, history, onKeep }: PanelProps) {
  const isLocal = side === 'local';
  const preview = history.slice(0, 4);
  const overflow = history.length - preview.length;

  return (
    <div className={`sync-panel sync-panel--${side}`}>
      <div className="sync-panel__header">
        <div className="sync-panel__icon">
          {isLocal ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          )}
        </div>
        <div className="sync-panel__title-group">
          <span className="sync-panel__title">{isLocal ? 'Local' : 'Cloud'}</span>
          <span className="sync-panel__count">
            {history.length} task{history.length !== 1 ? 's' : ''}
            {activeTask ? ' + active' : ''}
          </span>
        </div>
      </div>

      <div className="sync-panel__body">
        {activeTask && (
          <div className="sync-panel__active">
            <span className="sync-panel__active-label">Active task</span>
            <div className="sync-panel__active-name">{activeTask.name}</div>
          </div>
        )}

        {history.length === 0 && !activeTask ? (
          <div className="sync-panel__empty">No tasks</div>
        ) : (
          <div className="sync-preview__list">
            {preview.map(task => (
              <TaskPreviewItem key={task.id} task={task} />
            ))}
            {overflow > 0 && (
              <div className="sync-preview__overflow">+{overflow} more</div>
            )}
          </div>
        )}
      </div>

      <button className={`sync-panel__keep-btn sync-panel__keep-btn--${side}`} onClick={onKeep}>
        {isLocal ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Keep Local
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
            Use Cloud
          </>
        )}
      </button>
    </div>
  );
}

export function SyncConflictModal() {
  const { syncConflict, resolveSyncConflict } = useTaskContext();

  useEffect(() => {
    if (!syncConflict) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveSyncConflict('keep_local');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [syncConflict, resolveSyncConflict]);

  if (!syncConflict) return null;

  const mergedCount = new Set([
    ...syncConflict.localHistory.map(t => t.id),
    ...syncConflict.cloudHistory.map(t => t.id),
  ]).size;

  return (
    <div className="sync-modal-overlay">
      <div className="sync-modal">
        {/* Header */}
        <div className="sync-modal__header">
          <div className="sync-modal__header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>
          <div>
            <h3 className="sync-modal__title">Data Sync Conflict</h3>
            <p className="sync-modal__subtitle">
              Both local and cloud have different tasks. Choose how to proceed.
            </p>
          </div>
        </div>

        {/* Side-by-side panels */}
        <div className="sync-modal__panels">
          <DataPanel
            side="local"
            activeTask={syncConflict.localActiveTask}
            history={syncConflict.localHistory}
            onKeep={() => resolveSyncConflict('keep_local')}
          />

          <div className="sync-modal__divider">
            <span className="sync-modal__divider-vs">vs</span>
          </div>

          <DataPanel
            side="cloud"
            activeTask={syncConflict.cloudActiveTask}
            history={syncConflict.cloudHistory}
            onKeep={() => resolveSyncConflict('replace_with_cloud')}
          />
        </div>

        {/* Merge footer */}
        <div className="sync-modal__footer">
          <button
            className="sync-modal__merge-btn"
            onClick={() => resolveSyncConflict('merge')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
              <path d="M6 21V9a9 9 0 0 0 9 9" />
            </svg>
            Merge Both
            <span className="sync-modal__merge-count">{mergedCount} tasks total</span>
            <span className="sync-modal__merge-badge">Recommended</span>
          </button>
        </div>
      </div>
    </div>
  );
}
