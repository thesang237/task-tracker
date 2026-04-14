export interface Task {
  id: string;
  name: string;
  time: number;        // Total duration in seconds (0 = open-ended)
  remainingTime: number;
  timeSpent: number;   // Actual elapsed seconds
  category: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;   // ISO date string
  completedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface TaskFormData {
  name: string;
  time: number;
  category: string;
}

export interface TaskContextValue {
  activeTask: Task | null;
  taskHistory: Task[];
  categories: Category[];
  createTask: (task: Omit<Task, 'id' | 'status' | 'createdAt' | 'completedAt'>) => void;
  editTask: (id: string, updates: Partial<Task>) => void;
  pauseTask: () => void;
  resumeTask: () => void;
  stopTask: () => void;
  cancelTask: () => void;
  addCategory: (name: string, color?: string) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  deleteHistoryTask: (id: string) => void;
}
