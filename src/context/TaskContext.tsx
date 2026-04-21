import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { Task, Category, Project, TaskContextValue } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';

const defaultCategories: Category[] = [
  { id: '1', name: 'Work', color: '#ff4d4d' },
  { id: '2', name: 'Personal', color: '#4d79ff' },
  { id: '3', name: 'Study', color: '#4dff4d' },
];

const defaultProjects: Project[] = [
  { id: 'none', name: 'None', color: '#888888' }
];

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTask, setActiveTask] = useLocalStorage<Task | null>('taskTracker_activeTask', null);
  const [taskHistory, setTaskHistory] = useLocalStorage<Task[]>('taskTracker_history', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('taskTracker_categories', defaultCategories);
  const [projects, setProjects] = useLocalStorage<Project[]>('taskTracker_projects', defaultProjects);

  const activeTaskRef = useRef(activeTask);
  activeTaskRef.current = activeTask;

  const localStateRef = useRef({ activeTask, taskHistory, categories, projects });
  localStateRef.current = { activeTask, taskHistory, categories, projects };

  const isSyncingRef = useRef(false);

  // Sync from Firebase
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);

    const checkAndMigrate = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          // First time config - write local data
          await setDoc(userDocRef, localStateRef.current);
        }
      } catch (err) {
        console.error("Migration error:", err);
      }
    };
    checkAndMigrate();

    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      // Don't apply changes that originated locally and haven't synced to server
      if (snap.exists() && !snap.metadata.hasPendingWrites) {
        const data = snap.data();
        isSyncingRef.current = true;
        
        if (data.activeTask !== undefined) setActiveTask(data.activeTask);
        if (data.taskHistory) setTaskHistory(data.taskHistory);
        if (data.categories) setCategories(data.categories);
        if (data.projects) setProjects(data.projects);
        
        // Reset syncing flag shortly after setting state
        setTimeout(() => { isSyncingRef.current = false; }, 200);
      }
    });

    return () => unsubscribe();
  }, [user, setActiveTask, setTaskHistory, setCategories, setProjects]);

  // Sync to Firebase (debounced)
  useEffect(() => {
    if (!user || isSyncingRef.current) return;

    const timeoutId = setTimeout(() => {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        activeTask,
        taskHistory,
        categories,
        projects
      }, { merge: true }).catch(err => console.error("Error syncing to FIrebase", err));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [user, activeTask, taskHistory, categories, projects]);

  // Migrate old tasks to explicitly have an empty note field
  useEffect(() => {
    if (activeTask && !('note' in activeTask)) {
      setActiveTask(prev => prev ? { ...prev, note: prev.note ?? '' } : prev);
    }

    const needsHistoryMigration = taskHistory.some(task => !('note' in task));
    if (needsHistoryMigration) {
      setTaskHistory(prev => prev.map(task => ({ ...task, note: task.note ?? '' })));
    }
  }, [taskHistory, activeTask, setTaskHistory, setActiveTask]);


  // Timer: one stable interval per active task. Runs for both timed and open-ended tasks.
  useEffect(() => {
    if (!activeTask || activeTask.status !== 'active') {
      return;
    }

    const isOpenEnded = activeTask.time === 0;
    let lastTick = Date.now();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTick) / 1000);

      if (elapsedSeconds < 1) return;

      // Advance lastTick by the exact number of logical seconds we're processing
      lastTick += elapsedSeconds * 1000;

      setActiveTask(prev => {
        if (!prev || prev.status !== 'active') return prev;

        // Open-ended: just increment timeSpent, no countdown
        if (isOpenEnded) {
          return { ...prev, timeSpent: prev.timeSpent + elapsedSeconds };
        }

        // Timed: countdown
        if (prev.remainingTime <= elapsedSeconds) {
          // Complete — handled in a separate effect below to avoid setState-in-setState
          return { ...prev, remainingTime: 0, timeSpent: prev.time };
        }

        return {
          ...prev,
          remainingTime: prev.remainingTime - elapsedSeconds,
          timeSpent: prev.timeSpent + elapsedSeconds,
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

  const addProject = useCallback((name: string, color?: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color: color || '#888888',
    };
    setProjects(prev => [...prev, newProject]);
  }, [setProjects]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, [setProjects]);

  const deleteHistoryTask = useCallback((id: string) => {
    setTaskHistory(prev => prev.filter(task => task.id !== id));
  }, [setTaskHistory]);

  const updateHistoryTask = useCallback((id: string, updates: Partial<Task>) => {
    setTaskHistory(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  }, [setTaskHistory]);

  const importData = useCallback((data: { tasks: Task[]; categories: Category[]; projects: Project[] }) => {
    // Neutralize any active task
    setActiveTask(null);
    
    // Set new data
    setTaskHistory(data.tasks);
    setCategories(data.categories);
    setProjects(data.projects);
  }, [setActiveTask, setTaskHistory, setCategories, setProjects]);

  const value: TaskContextValue = {
    activeTask,
    taskHistory,
    categories,
    projects,
    createTask,
    editTask,
    pauseTask,
    resumeTask,
    stopTask,
    cancelTask,
    addCategory,
    updateCategory,
    deleteCategory,
    addProject,
    updateProject,
    deleteProject,
    updateHistoryTask,
    deleteHistoryTask,
    importData,
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
