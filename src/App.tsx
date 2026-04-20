import { TaskProvider } from './context/TaskContext';
import { useTaskContext } from './context/TaskContext';
import { ActiveTask } from './components/ActiveTask';
import { TaskForm } from './components/TaskForm';
import { TaskHistory } from './components/TaskHistory';
import { SettingsMenu } from './components/SettingsMenu';
import './styles/main.scss';

function AppHeader() {
  const { taskHistory } = useTaskContext();

  const totalTasks = taskHistory.length;
  const totalMinutes = Math.round(
    taskHistory.reduce((sum, t) => sum + (t.timeSpent ?? t.time), 0) / 60
  );

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__logo">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 1 1 0 16A8 8 0 0 1 12 4zm.5 3.5a.5.5 0 0 0-1 0V12l3.5 3.5.707-.707L12.5 11.293V7.5z"/>
          </svg>
        </div>
        <div className="app-header__text">
          <h1>Focus</h1>
          <p>One task at a time</p>
        </div>
      </div>

      <div className="app-header__stats">
        <div className="app-header__stat">
          <div className="app-header__stat-value">{totalTasks}</div>
          <div className="app-header__stat-label">Completed</div>
        </div>
        <div className="app-header__stat">
          <div className="app-header__stat-value">{totalMinutes}</div>
          <div className="app-header__stat-label">Minutes</div>
        </div>
        
        <div className="app-header__divider" />
        <SettingsMenu />
      </div>
    </header>
  );
}

function AppContent() {
  return (
    <div className="app">
      <div className="container">
        <AppHeader />
        <div className="app-content">
          <div className="app-content__left">
            <ActiveTask />
            <TaskForm />
          </div>
          <div className="app-content__right">
            <TaskHistory />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}

export default App;
