import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { Task, Category, Project, TaskContextValue } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCompletionSound } from '../hooks/useCompletionSound';

const defaultCategories: Category[] = [
  { id: '1', name: 'Work', color: '#ff4d4d' },
  { id: '2', name: 'Personal', color: '#4d79ff' },
  { id: '3', name: 'Study', color: '#4dff4d' },
];

const defaultProjects: Project[] = [
  { id: 'none', name: 'None', color: '#888888' }
];

export type SyncDecision = 'pending' | null;

interface SyncConflictData {
  cloudActiveTask: Task | null;
  cloudHistory: Task[];
  cloudCategories: Category[];
  cloudProjects: Project[];
  localActiveTask: Task | null;
  localHistory: Task[];
  localCategories: Category[];
  localProjects: Project[];
}

export interface TaskContextExtended extends TaskContextValue {
  syncConflict: SyncConflictData | null;
  resolveSyncConflict: (choice: 'merge' | 'replace_with_cloud' | 'keep_local') => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const TaskContext = createContext<TaskContextExtended | undefined>(undefined);

function hasLocalData(
  activeTask: Task | null,
  taskHistory: Task[],
  categories: Category[],
  projects: Project[]
): boolean {
  // Check if user has meaningful local data beyond defaults
  if (activeTask) return true;
  if (taskHistory.length > 0) return true;
  if (categories.length !== defaultCategories.length) return true;
  if (projects.length !== defaultProjects.length) return true;
  // Check if categories were modified from defaults
  const defaultCatNames = new Set(defaultCategories.map(c => c.name));
  if (categories.some(c => !defaultCatNames.has(c.name))) return true;
  const defaultProjNames = new Set(defaultProjects.map(p => p.name));
  if (projects.some(p => !defaultProjNames.has(p.name))) return true;
  return false;
}

function hasCloudData(data: Record<string, unknown>): boolean {
  if (data.activeTask) return true;
  if (Array.isArray(data.taskHistory) && data.taskHistory.length > 0) return true;
  return false;
}

function mergeTasks(localTasks: Task[], cloudTasks: Task[]): Task[] {
  const merged = new Map<string, Task>();
  // Add all local tasks
  for (const task of localTasks) {
    merged.set(task.id, task);
  }
  // Add cloud tasks, preferring newer completedAt or createdAt
  for (const task of cloudTasks) {
    const existing = merged.get(task.id);
    if (!existing) {
      merged.set(task.id, task);
    } else {
      // Keep the one with the later timestamp
      const existingTime = new Date(existing.completedAt || existing.createdAt).getTime();
      const cloudTime = new Date(task.completedAt || task.createdAt).getTime();
      if (cloudTime > existingTime) {
        merged.set(task.id, task);
      }
    }
  }
  return Array.from(merged.values());
}

function mergeItems<T extends { id: string; name: string }>(local: T[], cloud: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of local) {
    merged.set(item.id, item);
  }
  for (const item of cloud) {
    if (!merged.has(item.id)) {
      // Also check by name to avoid duplicates
      const existsByName = Array.from(merged.values()).some(m => m.name === item.name);
      if (!existsByName) {
        merged.set(item.id, item);
      }
    }
  }
  return Array.from(merged.values());
}

function isDataDifferent(
  localActiveTask: Task | null,
  localHistory: Task[],
  cloudActiveTask: Task | null,
  cloudHistory: Task[]
): boolean {
  // Compare active task IDs
  const localActiveId = localActiveTask?.id ?? null;
  const cloudActiveId = cloudActiveTask?.id ?? null;
  if (localActiveId !== cloudActiveId) return true;

  // Compare history lengths
  if (localHistory.length !== cloudHistory.length) return true;

  // Compare history task IDs
  const localIds = new Set(localHistory.map(t => t.id));
  const cloudIds = new Set(cloudHistory.map(t => t.id));
  if (localIds.size !== cloudIds.size) return true;
  for (const id of localIds) {
    if (!cloudIds.has(id)) return true;
  }

  return false;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTask, setActiveTask] = useLocalStorage<Task | null>('taskTracker_activeTask', null);
  const [taskHistory, setTaskHistory] = useLocalStorage<Task[]>('taskTracker_history', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('taskTracker_categories', defaultCategories);
  const [projects, setProjects] = useLocalStorage<Project[]>('taskTracker_projects', defaultProjects);
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('taskTracker_soundEnabled', true);

  const [syncConflict, setSyncConflict] = useState<SyncConflictData | null>(null);

  // Sync title and prepare completion sound
  useDocumentTitle(activeTask);
  const playCompletionSound = useCompletionSound(soundEnabled);

  const activeTaskRef = useRef(activeTask);
  activeTaskRef.current = activeTask;

  const localStateRef = useRef({ activeTask, taskHistory, categories, projects });
  localStateRef.current = { activeTask, taskHistory, categories, projects };

  // Track whether we're currently applying data FROM firebase to prevent echo writes
  const isSyncingFromFirebase = useRef(false);
  // Track pending local writes to suppress echo snapshots
  const pendingLocalWrite = useRef(false);
  // Track whether initial sync with Firebase has been handled for this login session
  const initialSyncDone = useRef(false);
  // Previous user uid to detect login transitions
  const prevUserUid = useRef<string | null>(null);

  // Reset initialSyncDone when user changes; clear local data on logout
  useEffect(() => {
    const currentUid = user?.uid ?? null;
    const wasLoggedIn = prevUserUid.current !== null;
    const isNowLoggedOut = currentUid === null;

    if (currentUid !== prevUserUid.current) {
      initialSyncDone.current = false;

      // User just logged out — clear all local data
      if (wasLoggedIn && isNowLoggedOut) {
        isSyncingFromFirebase.current = true;
        setActiveTask(null);
        setTaskHistory([]);
        setCategories(defaultCategories);
        setProjects(defaultProjects);
        setTimeout(() => { isSyncingFromFirebase.current = false; }, 300);
      }

      prevUserUid.current = currentUid;
    }
  }, [user, setActiveTask, setTaskHistory, setCategories, setProjects]);

  // Sync from Firebase — handles initial conflict detection + live updates
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);

    const handleInitialSync = async () => {
      try {
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          // No cloud data — push local data up
          await setDoc(userDocRef, localStateRef.current);
          initialSyncDone.current = true;
          return;
        }

        const cloudData = snap.data();
        const localHasData = hasLocalData(
          localStateRef.current.activeTask,
          localStateRef.current.taskHistory,
          localStateRef.current.categories,
          localStateRef.current.projects
        );
        const cloudHasData = hasCloudData(cloudData);

        if (localHasData && cloudHasData) {
          const cloudActiveTask = cloudData.activeTask ?? null;
          const cloudHistory = (cloudData.taskHistory ?? []) as Task[];
          const cloudCategories = (cloudData.categories ?? defaultCategories) as Category[];
          const cloudProjects = (cloudData.projects ?? defaultProjects) as Project[];

          // Only show conflict dialog if data is actually different
          const different = isDataDifferent(
            localStateRef.current.activeTask,
            localStateRef.current.taskHistory,
            cloudActiveTask,
            cloudHistory
          );

          if (different) {
            setSyncConflict({
              cloudActiveTask,
              cloudHistory,
              cloudCategories,
              cloudProjects,
              localActiveTask: localStateRef.current.activeTask,
              localHistory: localStateRef.current.taskHistory,
              localCategories: localStateRef.current.categories,
              localProjects: localStateRef.current.projects,
            });
            // Don't mark sync as done until user resolves
            return;
          }

          // Data is the same — no conflict, just apply cloud data silently
          isSyncingFromFirebase.current = true;
          setActiveTask(cloudActiveTask);
          setTaskHistory(cloudHistory);
          setCategories(cloudCategories);
          setProjects(cloudProjects);
          setTimeout(() => { isSyncingFromFirebase.current = false; }, 300);
          initialSyncDone.current = true;
          return;
        }

        if (cloudHasData && !localHasData) {
          // Cloud has data, local is empty — apply cloud data
          isSyncingFromFirebase.current = true;
          if (cloudData.activeTask !== undefined) setActiveTask(cloudData.activeTask);
          if (cloudData.taskHistory) setTaskHistory(cloudData.taskHistory);
          if (cloudData.categories) setCategories(cloudData.categories);
          if (cloudData.projects) setProjects(cloudData.projects);
          setTimeout(() => { isSyncingFromFirebase.current = false; }, 300);
        }
        // If local has data but cloud doesn't have meaningful data, push local up
        if (localHasData && !cloudHasData) {
          await setDoc(userDocRef, localStateRef.current, { merge: true });
        }

        initialSyncDone.current = true;
      } catch (err) {
        console.error("Initial sync error:", err);
        initialSyncDone.current = true; // Don't block on errors
      }
    };

    handleInitialSync();

    // Live sync listener — only active after initial sync is resolved
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (!initialSyncDone.current) return; // Wait for initial sync resolution
      if (!snap.exists()) return;
      if (snap.metadata.hasPendingWrites) return; // Ignore local echoes
      if (pendingLocalWrite.current) {
        // We have a pending local write; this snapshot is likely our own echo
        pendingLocalWrite.current = false;
        return;
      }

      const data = snap.data();
      isSyncingFromFirebase.current = true;

      if (data.activeTask !== undefined) setActiveTask(data.activeTask);
      if (data.taskHistory) setTaskHistory(data.taskHistory);
      if (data.categories) setCategories(data.categories);
      if (data.projects) setProjects(data.projects);

      setTimeout(() => { isSyncingFromFirebase.current = false; }, 300);
    });

    return () => unsubscribe();
  }, [user, setActiveTask, setTaskHistory, setCategories, setProjects]);

  // Resolve sync conflict
  const resolveSyncConflict = useCallback((choice: 'merge' | 'replace_with_cloud' | 'keep_local') => {
    if (!syncConflict || !user) return;

    const userDocRef = doc(db, 'users', user.uid);

    // Block the live snapshot listener for all branches — prevents echo from undoing the choice
    isSyncingFromFirebase.current = true;
    // Always mark a pending write so the next onSnapshot echo is suppressed
    pendingLocalWrite.current = true;

    if (choice === 'replace_with_cloud') {
      setActiveTask(syncConflict.cloudActiveTask);
      setTaskHistory(syncConflict.cloudHistory);
      setCategories(syncConflict.cloudCategories);
      setProjects(syncConflict.cloudProjects);
      // No write needed — cloud is already authoritative
      pendingLocalWrite.current = false;
    } else if (choice === 'keep_local') {
      // Push local data up to cloud; local state stays as-is
      setDoc(userDocRef, localStateRef.current, { merge: true })
        .catch(err => console.error("Error pushing local data to Firebase:", err));
    } else if (choice === 'merge') {
      const mergedHistory = mergeTasks(syncConflict.localHistory, syncConflict.cloudHistory);
      const mergedCategories = mergeItems(syncConflict.localCategories, syncConflict.cloudCategories);
      const mergedProjects = mergeItems(syncConflict.localProjects, syncConflict.cloudProjects);
      // For active task: prefer local if it exists, else cloud
      const mergedActiveTask = syncConflict.localActiveTask ?? syncConflict.cloudActiveTask;

      setActiveTask(mergedActiveTask);
      setTaskHistory(mergedHistory);
      setCategories(mergedCategories);
      setProjects(mergedProjects);

      // Push merged data to cloud
      setDoc(userDocRef, {
        activeTask: mergedActiveTask,
        taskHistory: mergedHistory,
        categories: mergedCategories,
        projects: mergedProjects,
      }, { merge: true }).catch(err => console.error("Error pushing merged data:", err));
    }

    setSyncConflict(null);
    initialSyncDone.current = true;
    // Release the snapshot block after 800ms — safely outlasts any Firestore echo round-trip
    setTimeout(() => { isSyncingFromFirebase.current = false; }, 800);
  }, [syncConflict, user, setActiveTask, setTaskHistory, setCategories, setProjects]);

  // Sync to Firebase (debounced) — writes local changes to cloud
  useEffect(() => {
    if (!user || isSyncingFromFirebase.current || !initialSyncDone.current) return;

    const timeoutId = setTimeout(() => {
      pendingLocalWrite.current = true;
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        activeTask,
        taskHistory,
        categories,
        projects
      }, { merge: true }).catch(err => console.error("Error syncing to Firebase", err));
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
      
      playCompletionSound();
      setTaskHistory(prev => [completedTask, ...prev]);
      setActiveTask(null);
    }
  }, [activeTask, setTaskHistory, setActiveTask, playCompletionSound]);

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

  const value: TaskContextExtended = {
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
    syncConflict,
    resolveSyncConflict,
    soundEnabled,
    setSoundEnabled,
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
