import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import type { Task, Category, TaskContextValue } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

const defaultCategories: Category[] = [
  { id: '1', name: 'Work', color: '#ff4d4d' },
  { id: '2', name: 'Personal', color: '#4d79ff' },
  { id: '3', name: 'Study', color: '#4dff4d' },
];

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [activeTask, setActiveTask] = useLocalStorage<Task | null>('taskTracker_activeTask', null);
  const [taskHistory, setTaskHistory] = useLocalStorage<Task[]>('taskTracker_history', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('taskTracker_categories', defaultCategories);

  // Ref for reading activeTask synchronously in callbacks that can't use state
  const activeTaskRef = useRef(activeTask);
  activeTaskRef.current = activeTask;

  // Timer: one stable interval per active task. Runs for both timed and open-ended tasks.
  useEffect(() => {
    if (!activeTask || activeTask.status !== 'active') {
      return;
    }

    const isOpenEnded = activeTask.time === 0;

    const interval = window.setInterval(() => {
      setActiveTask(prev => {
        if (!prev || prev.status !== 'active') return prev;

        // Open-ended: just increment timeSpent, no countdown
        if (isOpenEnded) {
          return { ...prev, timeSpent: prev.timeSpent + 1 };
        }

        // Timed: countdown
        if (prev.remainingTime <= 1) {
          // Complete — handled in a separate effect below to avoid setState-in-setState
          return { ...prev, remainingTime: 0, timeSpent: prev.time };
        }

        return {
          ...prev,
          remainingTime: prev.remainingTime - 1,
          timeSpent: prev.timeSpent + 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  // Recreate only when task id, status, or timed/open-ended mode changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTask?.id, activeTask?.status, activeTask?.time]);

  // When a timed task hits 0, move it to history
  useEffect(() => {
    if (activeTask && activeTask.status === 'active' && activeTask.time > 0 && activeTask.remainingTime === 0) {
      const completedTask: Task = {
        ...activeTask,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };
      setTaskHistory(prev => [completedTask, ...prev]);
      setActiveTask(null);
    }
  }, [activeTask?.remainingTime, activeTask?.status]);

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'status' | 'createdAt' | 'completedAt'>) => {
    const current = activeTaskRef.current;
    if (current) {
      // Preempt existing task — save it to history as completed
      const completedTask: Task = {
        ...current,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };
      setTaskHistory(prev => [completedTask, ...prev]);
    }

    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: undefined,
    };

    setActiveTask(newTask);
  }, [setActiveTask, setTaskHistory]);

  const editTask = useCallback((id: string, updates: Partial<Task>) => {
    setActiveTask(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, ...updates };
    });
  }, [setActiveTask]);

  const pauseTask = useCallback(() => {
    setActiveTask(prev => {
      if (!prev) return prev;
      return { ...prev, status: 'paused' };
    });
  }, [setActiveTask]);

  const resumeTask = useCallback(() => {
    setActiveTask(prev => {
      if (!prev) return prev;
      return { ...prev, status: 'active' };
    });
  }, [setActiveTask]);

  const stopTask = useCallback(() => {
    const current = activeTaskRef.current;
    if (!current) return;
    const completedTask: Task = {
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    setTaskHistory(prev => [completedTask, ...prev]);
    setActiveTask(null);
  }, [setActiveTask, setTaskHistory]);

  const cancelTask = useCallback(() => {
    setActiveTask(null);
  }, [setActiveTask]);

  const addCategory = useCallback((name: string, color?: string) => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      color: color || '#888888',
    };
    setCategories(prev => [...prev, newCategory]);
  }, [setCategories]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [setCategories]);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, [setCategories]);

  const deleteHistoryTask = useCallback((id: string) => {
    setTaskHistory(prev => prev.filter(task => task.id !== id));
  }, [setTaskHistory]);

  const value: TaskContextValue = {
    activeTask,
    taskHistory,
    categories,
    createTask,
    editTask,
    pauseTask,
    resumeTask,
    stopTask,
    cancelTask,
    addCategory,
    updateCategory,
    deleteCategory,
    deleteHistoryTask,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
