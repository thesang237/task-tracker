import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { formatTimeHuman, stringToHue } from '../utils/formatTime';
import { EditTaskModal } from './EditTaskModal';
import type { Task } from '../types';
import './TaskHistory.scss';

type SortField = 'completedAt' | 'name' | 'category' | 'timeSpent';
type SortOrder = 'asc' | 'desc';
type GroupField = 'none' | 'category' | 'project';

const SORT_LABELS: Record<SortField, string> = {
  completedAt: 'Recent',
  name: 'Name',
  category: 'Category',
  timeSpent: 'Time',
};

const GROUP_LABELS: Record<GroupField, string> = {
  none: 'None',
  category: 'Category',
  project: 'Project',
};

export function TaskHistory() {
  const { taskHistory, deleteHistoryTask, updateHistoryTask } = useTaskContext();
  const [sortField, setSortField] = useState<SortField>('completedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [groupField, setGroupField] = useState<GroupField>('none');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setIsGroupOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setIsSortOpen(false);
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

  const groupedHistory = useMemo(() => {
    if (groupField === 'none') {
      return { 'All Tasks': sortedHistory };
    }

    const groups = sortedHistory.reduce((acc, task) => {
      const key = groupField === 'category' 
        ? task.category 
        : (task.project && task.project !== 'None' ? task.project : 'No Project');
        
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    // Sort the group keys alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, Task[]>);
  }, [sortedHistory, groupField]);


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
          <div className="task-history__controls">
            <div className="task-history__control-group" ref={sortRef}>
              <span className="task-history__control-label">Sort:</span>
              <div className="task-history__dropdown">
                <button 
                  className={`task-history__dropdown-trigger ${isSortOpen ? 'task-history__dropdown-trigger--active' : ''}`}
                  onClick={() => setIsSortOpen(!isSortOpen)}
                >
                  {SORT_LABELS[sortField]}
                  <span className="task-history__sort-arrow">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                </button>
                {isSortOpen && (
                  <div className="task-history__dropdown-menu">
                    {(Object.keys(SORT_LABELS) as SortField[]).map(field => (
                      <button
                        key={field}
                        className={`task-history__dropdown-item ${sortField === field ? 'task-history__dropdown-item--active' : ''}`}
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
            </div>

            <div className="task-history__control-group" ref={groupRef}>
              <span className="task-history__control-label">Group:</span>
              <div className="task-history__dropdown">
                <button 
                  className={`task-history__dropdown-trigger ${isGroupOpen ? 'task-history__dropdown-trigger--active' : ''}`}
                  onClick={() => setIsGroupOpen(!isGroupOpen)}
                >
                  {GROUP_LABELS[groupField]}
                  <span className="task-history__sort-arrow">▼</span>
                </button>
                {isGroupOpen && (
                  <div className="task-history__dropdown-menu">
                    {(Object.keys(GROUP_LABELS) as GroupField[]).map(field => (
                      <button
                        key={field}
                        className={`task-history__dropdown-item ${groupField === field ? 'task-history__dropdown-item--active' : ''}`}
                        onClick={() => { setGroupField(field); setIsGroupOpen(false); }}
                      >
                        {GROUP_LABELS[field]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
          {Object.entries(groupedHistory).map(([groupName, tasks]) => (
            <div key={groupName} className="task-history__group">
              {groupField !== 'none' && (
                <div className="task-history__group-header">
                  {groupName} <span className="task-history__group-count">{tasks.length}</span>
                </div>
              )}
              {tasks.map((task) => {
                const hue = stringToHue(task.category);
                const timeSpent = task.timeSpent ?? task.time;
                const wasEarly = task.time > 0 && timeSpent < task.time;

                return (
                  <div 
                    key={task.id} 
                    className="task-history__item"
                    onClick={() => setEditingTask(task)}
                  >
                    <div
                      className="task-history__item-accent"
                      style={{ background: `hsl(${hue}, 60%, 50%)` }}
                    />

                    <div className="task-history__item-body">
                      <div className="task-history__item-top">
                        <span className="task-history__item-name">{task.name}</span>
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

                        {task.project && task.project !== 'None' && (
                          <span className="task-history__item-project">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                            {task.project}
                          </span>
                        )}

                      </div>

                      {task.note && (
                        <div className="task-history__item-note">
                          {task.note.length > 80 ? task.note.substring(0, 80) + '...' : task.note}
                        </div>
                      )}
                    </div>

                    <div className="task-history__item-duration-col">
                      <span className="task-history__item-duration">
                        {formatTimeHuman(timeSpent)}
                        {wasEarly && (
                          <span className="task-history__item-of"> / {formatTimeHuman(task.time)}</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              {groupField !== 'none' && (
                <div className="task-history__group-footer">
                  <span className="task-history__group-footer-label">Total Time:</span>
                  <div className="task-history__item-duration-col">
                    <span className="task-history__group-footer-duration">
                      {formatTimeHuman(tasks.reduce((acc, t) => acc + (t.timeSpent ?? t.time), 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={updateHistoryTask}
          onDelete={() => {
            deleteHistoryTask(editingTask.id);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
