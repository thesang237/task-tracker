import { useState, useCallback, useEffect } from 'react';
import type { Task } from '../types';
import { useTaskContext } from '../context/TaskContext';
import { CategorySelect } from './CategorySelect';
import { ProjectSelect } from './ProjectSelect';
import './EditTaskModal.scss';

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => void;
  onDelete?: () => void;
}

export function EditTaskModal({ task, onClose, onSave, onDelete }: EditTaskModalProps) {
  const { categories, projects, addCategory, addProject } = useTaskContext();
  
  const [name, setName] = useState(task.name);
  const [hours, setHours] = useState(Math.floor(task.timeSpent / 3600));
  const [minutes, setMinutes] = useState(Math.floor((task.timeSpent % 3600) / 60));
  const [seconds, setSeconds] = useState(task.timeSpent % 60);
  
  const [categoryId, setCategoryId] = useState(
    categories.find(c => c.name === task.category)?.id || categories[0]?.id || ''
  );
  const [projectId, setProjectId] = useState(
    projects.find(p => p.name === task.project)?.id || 'none'
  );

  const handleSave = useCallback(() => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const category = categories.find(c => c.id === categoryId);
    const project = projects.find(p => p.id === projectId);

    onSave(task.id, {
      name,
      timeSpent: totalSeconds,
      category: category?.name || task.category,
      project: project?.name || 'None',
    });
    onClose();
  }, [task.id, task.category, name, hours, minutes, seconds, categoryId, projectId, categories, projects, onSave, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const formatNumber = (num: number): string => num.toString().padStart(2, '0');

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal__header">
          <h3>Edit Task</h3>
          <button className="edit-modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="edit-modal__content">
          <div className="edit-modal__field">
            <label htmlFor="edit-name">Task Name</label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name"
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="edit-modal__field">
            <label>Duration (hh:mm:ss)</label>
            <div className="edit-modal__time-inputs">
              <div className="edit-modal__time-field">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={formatNumber(hours)}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span>h</span>
              </div>
              <span className="edit-modal__time-sep">:</span>
              <div className="edit-modal__time-field">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formatNumber(minutes)}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
                <span>m</span>
              </div>
              <span className="edit-modal__time-sep">:</span>
              <div className="edit-modal__time-field">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formatNumber(seconds)}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
                <span>s</span>
              </div>
            </div>
          </div>
          
          <div className="edit-modal__dropdowns" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <ProjectSelect 
                projects={projects} 
                value={projectId} 
                onChange={setProjectId} 
                onAddProject={addProject} 
              />
            </div>
            <div>
              <CategorySelect 
                categories={categories} 
                value={categoryId} 
                onChange={setCategoryId} 
                onAddCategory={addCategory} 
              />
            </div>
          </div>
        </div>

        <div className="edit-modal__footer">
          {onDelete ? (
            <div className="edit-modal__footer-left">
              <button 
                className="edit-btn edit-btn--danger" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to permanently delete this task?')) {
                    onDelete();
                  }
                }}
                title="Delete task"
              >
                Delete
              </button>
            </div>
          ) : <div />}
          <div className="edit-modal__footer-right">
            <button className="edit-btn edit-btn--cancel" onClick={onClose}>Cancel</button>
            <button className="edit-btn edit-btn--save" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
