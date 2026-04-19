export interface Task {
  id: string;
  name: string;
  time: number;        // Total duration in seconds (0 = open-ended)
  remainingTime: number;
  timeSpent: number;   // Actual elapsed seconds
  category: string;
  project?: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;   // ISO date string
  completedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
}

export interface TaskFormData {
  name: string;
  time: number;
  category: string;
  project?: string;
}

export interface TaskContextValue {
  activeTask: Task | null;
  taskHistory: Task[];
  categories: Category[];
  projects: Project[];
  createTask: (task: Omit<Task, 'id' | 'status' | 'createdAt' | 'completedAt'>) => void;
  editTask: (id: string, updates: Partial<Task>) => void;
  pauseTask: () => void;
  resumeTask: () => void;
  stopTask: () => void;
  cancelTask: () => void;
  addCategory: (name: string, color?: string) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addProject: (name: string, color?: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  updateHistoryTask: (id: string, updates: Partial<Task>) => void;
  deleteHistoryTask: (id: string) => void;
  importData: (data: { tasks: Task[]; categories: Category[]; projects: Project[] }) => void;
}
