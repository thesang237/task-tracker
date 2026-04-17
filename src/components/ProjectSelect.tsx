import { useState, useCallback, useRef, useEffect } from 'react';
import type { Project } from '../types';
import { useTaskContext } from '../context/TaskContext';
import './ProjectSelect.scss';

interface ProjectSelectProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  onAddProject: (name: string, color?: string) => void;
}

const PRESET_COLORS = [
  '#ff4d4d', '#ff9933', '#ffd633', '#4dff4d', '#33ccff', '#4d79ff', '#b366ff', '#ff66b3', '#888888'
];

export function ProjectSelect({ projects, value, onChange, onAddProject }: ProjectSelectProps) {
  const { updateProject, deleteProject } = useTaskContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PRESET_COLORS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setEditingColorId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProject = useCallback(() => {
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim(), newProjectColor);
      setNewProjectName('');
      setIsAdding(false);
      setNewProjectColor(PRESET_COLORS[0]);
    }
  }, [newProjectName, newProjectColor, onAddProject]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProject();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewProjectName('');
    }
  }, [handleAddProject]);

  return (
    <div className="project-select" ref={dropdownRef}>
      <label className="project-select__label">Project</label>

      <div 
        className={`project-select__trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="project-select__trigger-content">
          {selectedProject ? (
            <>
              <span 
                className="project-select__color-dot" 
                style={{ backgroundColor: selectedProject.color || '#888888' }} 
              />
              {selectedProject.name}
            </>
          ) : 'Select a project'}
        </span>
        <span className="project-select__arrow">▼</span>
      </div>

      {isOpen && (
        <div className="project-select__dropdown-menu">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className={`project-select__item ${project.id === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(project.id);
                setIsOpen(false);
              }}
            >
              <div 
                className="project-select__color-wrapper"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingColorId(project.id === editingColorId ? null : project.id);
                }}
              >
                <span 
                  className={`project-select__color-dot ${project.id !== 'none' ? 'editable' : ''}`} 
                  style={{ backgroundColor: project.color || '#888888' }} 
                />
                {editingColorId === project.id && project.id !== 'none' && (
                  <div className="project-select__color-palette" onClick={e => e.stopPropagation()}>
                    {PRESET_COLORS.map(color => (
                      <div
                        key={color}
                        className="project-select__color-option"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProject(project.id, { color });
                          setEditingColorId(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="project-select__item-name">{project.name}</span>
              {confirmDeleteId === project.id ? (
                <div className="project-select__confirm-actions" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="project-select__confirm-btn project-select__confirm-btn--yes"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                      if (value === project.id) {
                        onChange('none');
                      }
                      setConfirmDeleteId(null);
                    }}
                    title="Confirm delete"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="project-select__confirm-btn project-select__confirm-btn--no"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
                    }}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`project-select__delete-btn ${project.id === 'none' ? 'hidden' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(project.id);
                  }}
                  disabled={project.id === 'none'}
                  title="Delete project"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {isAdding ? (
            <div className="project-select__add-row" onClick={e => e.stopPropagation()}>
              <div className="project-select__color-wrapper">
                <span 
                  className="project-select__color-dot editable" 
                  style={{ backgroundColor: newProjectColor }} 
                  onClick={() => setEditingColorId('new')}
                />
                {editingColorId === 'new' && (
                  <div className="project-select__color-palette palette-up" onClick={e => e.stopPropagation()}>
                    {PRESET_COLORS.map(color => (
                      <div
                        key={color}
                        className="project-select__color-option"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewProjectColor(color);
                          setEditingColorId(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Project name"
                className="project-select__add-input"
                autoFocus
              />
              <button
                type="button"
                className="project-select__save-btn"
                onClick={handleAddProject}
                disabled={!newProjectName.trim()}
              >
                ✓
              </button>
              <button
                type="button"
                className="project-select__cancel-btn"
                onClick={() => {
                  setIsAdding(false);
                  setNewProjectName('');
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div 
              className="project-select__add-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setIsAdding(true);
              }}
            >
              <span className="project-select__add-icon">+</span>
              New Project
            </div>
          )}
        </div>
      )}
    </div>
  );
}
