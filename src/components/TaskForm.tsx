import { useState, useCallback, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { TimePicker } from './TimePicker';
import { CategorySelect } from './CategorySelect';
import { Button } from './Button';
import './TaskForm.scss';

export function TaskForm() {
  const { categories, createTask, addCategory, activeTask } = useTaskContext();
  const [name, setName] = useState('');
  const [time, setTime] = useState(0);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [confirmPreempt, setConfirmPreempt] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Reset confirm state if active task changes
  useEffect(() => {
    setConfirmPreempt(false);
  }, [activeTask?.id]);

  const doCreate = useCallback(() => {
    const category = categories.find(c => c.id === categoryId);
    createTask({
      name: name.trim(),
      time,
      remainingTime: time,
      timeSpent: 0,
      category: category?.name || 'Uncategorized',
    });
    setName('');
    setTime(0);
    setConfirmPreempt(false);
  }, [name, time, categoryId, categories, createTask]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (activeTask && !confirmPreempt) {
      setConfirmPreempt(true);
      return;
    }

    doCreate();
  }, [name, activeTask, confirmPreempt, doCreate]);

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2 className="task-form__title">Create New Task</h2>

      {confirmPreempt && (
        <div className="task-form__warning">
          <p>Starting a new task will complete <strong>"{activeTask?.name}"</strong> and save it to history.</p>
          <div className="task-form__warning-actions">
            <Button type="submit" variant="primary">Yes, start new task</Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmPreempt(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="task-form__field">
        <label htmlFor="task-name" className="task-form__label">
          Task Name <span className="task-form__required">*</span>
        </label>
        <input
          id="task-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you working on?"
          className="task-form__input"
          autoComplete="off"
          required
        />
      </div>

      <TimePicker value={time} onChange={setTime} />

      <CategorySelect
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        onAddCategory={addCategory}
      />

      {!confirmPreempt && (
        <Button type="submit" variant="primary" disabled={!name.trim()} className="task-form__submit">
          {time === 0 ? 'Start & Complete' : 'Start Task'}
        </Button>
      )}
    </form>
  );
}
