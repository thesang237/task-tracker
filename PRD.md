# Task Tracker Web Application - Claude Prompt

## 📋 Project Overview

Build a task tracking web application that allows users to create, manage, and track their tasks. The application uses a single active task workflow where only one task can run at a time.

---

## 🛠 Tech Stack

- **Build Tool**: Vite
- **Framework**: React 18+ (functional components and hooks)
- **Styling**: SCSS (no Tailwind CSS)

---

## 🎯 Core Features

### 1. Task Creation

- [ ] **Task Name Input**: Text field for entering the task name (required)
- [ ] **Time Picker**: Select duration in hh:mm:ss format
  - Default value: "Now" (00:00:00)
  - Timer counts DOWN from selected time to 0
- [ ] **Category Selection**:
  - Select from existing categories
  - Create new category inline
- [ ] **Create Button**: Submit and start the task

### 2. Active Task Management

- [ ] **Single Active Task**: Only ONE task can be active at a time
- [ ] **Active Task Display**: Show current running task prominently
- [ ] **Control Buttons**:
  - **Edit**: Modify task name, time, or category
  - **Pause**: Pause the running timer (preserve remaining time)
  - **Stop**: Mark task as complete and move to history

### 3. Task History

- [ ] **History Table**: List all completed (past) tasks
- [ ] **Sorting**: Sort by date and time (most recent first)
- [ ] **Display Columns**: Task name, category, duration, completion time
- [ ] **Actions**: Optional ability to delete history items

### 4. Category Management

- [ ] **Default Categories**: Pre-populated list (e.g., "Work", "Personal", "Study")
- [ ] **Create New**: Ability to add new categories during task creation
- [ ] **Persistence**: Categories persist in localStorage

---

## 💾 Data Management

### LocalStorage Schema

```json
{
  "activeTask": {
    "id": "string",
    "name": "string",
    "time": "number (seconds)",
    "category": "string",
    "status": "active | paused | completed",
    "createdAt": "ISO date string",
    "completedAt": "ISO date string | null",
    "remainingTime": "number (seconds)"
  },
  "taskHistory": [
    {
      "id": "string",
      "name": "string",
      "time": "number (seconds)",
      "category": "string",
      "completedAt": "ISO date string"
    }
  ],
  "categories": [{ "id": "string", "name": "string" }]
}
```

### State Management

- Use React hooks: `useState`, `useReducer`, `useContext`
- Create `TaskContext` for global state management

---

## 📁 Project Structure

```
src/
├── components/
│   ├── TaskForm.tsx          # Task creation form
│   ├── ActiveTask.tsx        # Currently running task display
│   ├── TaskHistory.tsx       # History table
│   ├── CategorySelect.tsx    # Category dropdown with add new
│   ├── TimePicker.tsx        # Custom time picker (hh:mm:ss)
│   └── Button.tsx            # Reusable button component
├── hooks/
│   ├── useLocalStorage.ts    # localStorage hook
│   └── useTimer.ts           # Timer logic hook
├── context/
│   └── TaskContext.tsx       # Global state provider
├── types/
│   └── index.ts              # TypeScript interfaces
├── styles/
│   ├── _variables.scss       # SCSS variables (colors, spacing)
│   ├── _mixins.scss          # SCSS mixins
│   ├── _reset.scss           # CSS reset
│   └── main.scss             # Main styles
├── App.tsx
└── main.tsx
```

---

## 🎨 UI/UX Design

### Visual Requirements

- Clean, modern interface with minimal design
- Responsive layout (desktop and mobile friendly)
- Clear visual distinction between sections:
  - Active task section (highlighted/prominent)
  - Task creation form
  - History table

### Color Scheme (SCSS Variables)

```scss
$primary-color: #4a90e2;
$secondary-color: #50c878;
$warning-color: #ff9500;
$danger-color: #ff3b30;
$background-light: #f5f7fa;
$text-dark: #2c3e50;
$text-light: #7f8c8d;
$border-color: #e1e8ed;
```

### Timer Display

- Large, prominent countdown display
- Visual indicator for paused state
- Progress indicator (optional)

---

## 🔧 TypeScript Interfaces

```typescript
interface Task {
  id: string;
  name: string;
  time: number; // Total duration in seconds
  remainingTime: number;
  category: string;
  status: "active" | "paused" | "completed";
  createdAt: string; // ISO date string
  completedAt?: string;
}

interface Category {
  id: string;
  name: string;
}

interface TaskContextValue {
  activeTask: Task | null;
  taskHistory: Task[];
  categories: Category[];
  createTask: (task: Omit<Task, "id" | "status" | "createdAt">) => void;
  editTask: (id: string, updates: Partial<Task>) => void;
  pauseTask: () => void;
  resumeTask: () => void;
  stopTask: () => void;
  addCategory: (name: string) => void;
  deleteHistoryTask: (id: string) => void;
}
```

---

## ⚙️ Timer Logic

### Behavior Rules

1. **New Task Creation**:
   - Task becomes active immediately
   - Timer starts counting down
   - Previous active task moves to history

2. **Pause Functionality**:
   - Preserves remaining time
   - Timer display shows "PAUSED"
   - Resume continues from paused time

3. **Stop Functionality**:
   - Marks task as complete regardless of remaining time
   - Moves task to history table
   - Clears active task slot

4. **"Now" Default**:
   - 00:00:00 means task completes immediately
   - Timer shows 0 and immediately moves to history

---

## ✅ Implementation Checklist

### Phase 1: Project Setup

- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure SCSS
- [ ] Set up folder structure

### Phase 2: Core Components

- [ ] Create TypeScript interfaces
- [ ] Build useLocalStorage hook
- [ ] Build useTimer hook
- [ ] Create TaskContext provider

### Phase 3: Feature Components

- [ ] Implement TimePicker component
- [ ] Implement CategorySelect component
- [ ] Implement TaskForm component
- [ ] Implement ActiveTask component
- [ ] Implement TaskHistory component

### Phase 4: Styling

- [ ] Define SCSS variables
- [ ] Create mixins
- [ ] Style all components
- [ ] Ensure responsive design

### Phase 5: Integration & Testing

- [ ] Connect all components to state
- [ ] Test localStorage persistence
- [ ] Test timer functionality
- [ ] Test edge cases (pause, resume, stop)

### Phase 6: Deployment

- [ ] Build production bundle
- [ ] Deploy to hosting

---

## 📝 Additional Notes

1. **Accessibility**: Ensure keyboard navigation and ARIA labels
2. **Error Handling**: Handle localStorage quota exceeded, parsing errors
3. **Performance**: Use useMemo/useCallback for optimization
4. **Mobile**: Test on various screen sizes
