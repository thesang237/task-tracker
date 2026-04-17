import { useState, useCallback } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Button } from './Button';
import { TimePicker } from './TimePicker';
import { CategorySelect } from './CategorySelect';
import { ProjectSelect } from './ProjectSelect';
import { formatTimeClock, stringToHue } from '../utils/formatTime';
import './ActiveTask.scss';

const RING_R = 88;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function RingTimer({ progress, isPaused, isOpenEnded }: { progress: number; isPaused: boolean; isOpenEnded: boolean }) {
  const dashOffset = RING_CIRCUMFERENCE * (1 - (isOpenEnded ? 1 : progress));
  return (
    <svg className="active-task__ring" viewBox="0 0 200 200">
      {/* track */}
      <circle
        cx="100" cy="100" r={RING_R}
        className="active-task__ring-track"
      />
      {/* progress arc */}
      <circle
        cx="100" cy="100" r={RING_R}
        className={`active-task__ring-fill ${isPaused ? 'active-task__ring-fill--paused' : ''} ${isOpenEnded ? 'active-task__ring-fill--open' : ''}`}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}

export function ActiveTask() {
  const { activeTask, pauseTask, resumeTask, stopTask, cancelTask, editTask, categories, addCategory, projects, addProject } = useTaskContext();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTime, setEditTime] = useState(0);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editProjectId, setEditProjectId] = useState('none');

  const handleStartEdit = useCallback(() => {
    if (!activeTask) return;
    setEditName(activeTask.name);
    setEditTime(activeTask.time);
    setEditCategoryId(categories.find(c => c.name === activeTask.category)?.id || categories[0]?.id || '');
    setEditProjectId(projects.find(p => p.name === activeTask.project)?.id || 'none');
    setIsEditing(true);
    setConfirmStop(false);
    setConfirmCancel(false);
  }, [activeTask, categories, projects]);

  const handleSaveEdit = useCallback(() => {
    if (!activeTask) return;
    const category = categories.find(c => c.id === editCategoryId);
    const project = projects.find(p => p.id === editProjectId);
    const newRemainingTime = editTime < activeTask.remainingTime ? editTime : activeTask.remainingTime;
    editTask(activeTask.id, {
      name: editName.trim() || activeTask.name,
      time: editTime,
      remainingTime: newRemainingTime,
      category: category?.name || activeTask.category,
      project: project?.name || activeTask.project || 'None',
    });
    setIsEditing(false);
  }, [activeTask, editName, editTime, editCategoryId, editProjectId, categories, projects, editTask]);

  const handlePauseResume = useCallback(() => {
    if (activeTask?.status === 'paused') resumeTask();
    else pauseTask();
  }, [activeTask, pauseTask, resumeTask]);

  const handleStop = useCallback(() => { stopTask(); setConfirmStop(false); }, [stopTask]);
  const handleCancel = useCallback(() => { cancelTask(); setConfirmCancel(false); }, [cancelTask]);

  if (!activeTask) {
    return (
      <div className="active-task active-task--empty">
        <div className="active-task__empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 3"/>
          </svg>
        </div>
        <p className="active-task__empty-title">No active task</p>
        <p className="active-task__empty-sub">Create a task below to start focusing</p>
      </div>
    );
  }

  const isPaused = activeTask.status === 'paused';
  const isOpenEnded = activeTask.time === 0;
  const progress = isOpenEnded ? 1 : (activeTask.remainingTime / activeTask.time);
  const hue = stringToHue(activeTask.category);

  return (
    <div className={`active-task ${isPaused ? 'active-task--paused' : ''}`}>
      {/* Category glow strip */}
      <div
        className="active-task__cat-strip"
        style={{ background: `hsl(${hue}, 60%, 50%)` }}
      />

      {isEditing ? (
        <div className="active-task__edit">
          <div className="active-task__edit-header">
            <span className="active-task__edit-label">Edit task</span>
          </div>
          <div className="active-task__field">
            <label>Task name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="active-task__input"
              autoFocus
            />
          </div>
          <TimePicker value={editTime} onChange={setEditTime} />
          
          <div className="active-task__dropdowns" style={{display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <ProjectSelect projects={projects} value={editProjectId} onChange={setEditProjectId} onAddProject={addProject} />
            </div>
            <div>
              <CategorySelect categories={categories} value={editCategoryId} onChange={setEditCategoryId} onAddCategory={addCategory} />
            </div>
          </div>
          
          <div className="active-task__actions">
            <Button variant="primary" onClick={handleSaveEdit}>Save changes</Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Timer ring area */}
          <div className="active-task__ring-wrap">
            <RingTimer progress={progress} isPaused={isPaused} isOpenEnded={isOpenEnded} />
            <div className="active-task__ring-center">
              <div className={`active-task__time ${isPaused ? 'active-task__time--paused' : ''}`}>
                {isOpenEnded
                  ? formatTimeClock(activeTask.timeSpent)
                  : formatTimeClock(activeTask.remainingTime)
                }
              </div>
              <div className="active-task__time-label">
                {isPaused ? 'paused' : isOpenEnded ? 'elapsed' : 'remaining'}
              </div>
            </div>
          </div>

          {/* Task info */}
          <div className="active-task__info">
            <h3 className="active-task__name">{activeTask.name}</h3>
            <div className="active-task__meta-pills" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                className="active-task__category-pill"
                style={{
                  background: `hsl(${hue}, 60%, 92%)`,
                  color: `hsl(${hue}, 50%, 28%)`,
                }}
              >
                {activeTask.category}
              </span>
              {activeTask.project && activeTask.project !== 'None' && (
                <span className="active-task__project-pill" style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  color: '#ccc', 
                  padding: '2px 8px', 
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  {activeTask.project}
                </span>
              )}
            </div>
          </div>

          {/* Confirm overlays */}
          {confirmCancel ? (
            <div className="active-task__confirm">
              <p>Delete this task? It won't be saved.</p>
              <div className="active-task__actions">
                <Button variant="danger" onClick={handleCancel}>Delete</Button>
                <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Keep it</Button>
              </div>
            </div>
          ) : confirmStop ? (
            <div className="active-task__confirm">
              <p>Stop and save to history?</p>
              <div className="active-task__actions">
                <Button variant="primary" onClick={handleStop}>Save to history</Button>
                <Button variant="secondary" onClick={() => setConfirmStop(false)}>Keep going</Button>
              </div>
            </div>
          ) : (
            <div className="active-task__controls">
              <button className="active-task__icon-btn active-task__icon-btn--edit" onClick={handleStartEdit} title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>

              <button
                className={`active-task__play-btn ${isPaused ? 'active-task__play-btn--resume' : ''}`}
                onClick={handlePauseResume}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                )}
              </button>

              <button className="active-task__icon-btn active-task__icon-btn--stop" onClick={() => setConfirmStop(true)} title="Stop & save">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </button>

              <button className="active-task__icon-btn active-task__icon-btn--cancel" onClick={() => setConfirmCancel(true)} title="Cancel task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
