import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConceptCoach from './components/ConceptCoach';
import ExamArena from './components/ExamArena';
import CreatorStudio from './components/CreatorStudio';
import EcoTracker from './components/EcoTracker';
import LearningPath from './components/LearningPath';
import TeacherDashboard from './components/TeacherDashboard';
import CustomerSupport from './components/CustomerSupport';
import AuthPage from './components/AuthPage';
import { AppView, User, DashboardStats, Student } from './types';
import { LifeBuoy } from 'lucide-react';
import { fetchStudents } from './services/studentService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | undefined>(undefined);

  // --- Teacher Portal State (Lifted for shared access) ---
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  
  // Initialize with empty array
  const [students, setStudents] = useState<Student[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch Students from Supabase or LocalStorage
  useEffect(() => {
    const loadStudents = async () => {
      // 1. Try to load from LocalStorage first for persistence in demo mode
      const savedStudents = localStorage.getItem('educlarity_students');
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
        setIsDataLoaded(true);
        return;
      }

      // 2. If no local data, fetch from DB
      const data = await fetchStudents();
      if (data && data.length > 0) {
        setStudents(data);
      } else {
        // 3. Fallback to mock data if DB is empty or not connected
        const mocks: Student[] = [
            { id: '1', name: 'Arjun Verma', grade: 'A', attendance: '92%', status: 'Excelling' },
            { id: '2', name: 'Priya Sharma', grade: 'B+', attendance: '88%', status: 'Stable' },
            { id: '3', name: 'Rahul Singh', grade: 'C', attendance: '75%', status: 'At Risk' },
            { id: '4', name: 'Ananya Gupta', grade: 'A+', attendance: '98%', status: 'Excelling' },
            { id: '5', name: 'Vikram Malhotra', grade: 'C-', attendance: '60%', status: 'At Risk' },
        ];
        setStudents(mocks);
      }
      setIsDataLoaded(true);
    };
    loadStudents();
  }, []);

  // Sync state changes to LocalStorage
  useEffect(() => {
    // Only save if initial load is complete to prevent overwriting with empty array
    if (isDataLoaded) {
      localStorage.setItem('educlarity_students', JSON.stringify(students));
    }
  }, [students, isDataLoaded]);

  // --- Real-time Analytics State ---
  const [stats, setStats] = useState<DashboardStats>({
    topicsMastered: 42,
    studyHours: 28.0,
    avgScore: 78,
    weakAreas: 3,
    weeklyActivity: [
      { day: 'Mon', hours: 2.5 },
      { day: 'Tue', hours: 3.8 },
      { day: 'Wed', hours: 1.5 },
      { day: 'Thu', hours: 4.2 },
      { day: 'Fri', hours: 3.0 },
      { day: 'Sat', hours: 5.5 },
      { day: 'Sun', hours: 2.0 },
    ],
    syllabusProgress: [
      { name: 'Mastered', value: 65, color: '#10b981' },
      { name: 'In Progress', value: 25, color: '#f59e0b' },
      { name: 'To Learn', value: 10, color: '#cbd5e1' },
    ]
  });

  // Effect: Simulate Real-time tracking when user is studying
  useEffect(() => {
    let interval: any;

    // Only track time if user is in learning-focused views
    if (currentView === AppView.CONCEPT_COACH || currentView === AppView.EXAM_ARENA) {
      interval = setInterval(() => {
        setStats(prev => {
          // Determine current day index (0=Mon, 6=Sun) for demo simply use Fri (4) or rotate
          // For accurate demo visual, let's update 'Fri' which is index 4 in our static array
          const todayIndex = 4; 
          
          const newActivity = [...prev.weeklyActivity];
          newActivity[todayIndex] = {
            ...newActivity[todayIndex],
            hours: parseFloat((newActivity[todayIndex].hours + 0.01).toFixed(2)) // Increment by 0.01 hours
          };

          return {
            ...prev,
            studyHours: parseFloat((prev.studyHours + 0.01).toFixed(2)),
            weeklyActivity: newActivity
          };
        });
      }, 6000); // Update every 6 seconds to show movement
    }

    return () => clearInterval(interval);
  }, [currentView]);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(AppView.DASHBOARD);
    setIsTeacherAuthenticated(false); // Reset teacher auth on logout
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleNavigate = (view: AppView, topic?: string) => {
    setCurrentView(view);
    if (topic) {
      setActiveTopic(topic);
    }
  };

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard user={user} stats={stats} onNavigate={handleNavigate} />;
      case AppView.CONCEPT_COACH:
        return (
          <ConceptCoach 
            initialTopic={activeTopic} 
            onClearTopic={() => setActiveTopic(undefined)} 
          />
        );
      case AppView.EXAM_ARENA:
        return (
          <ExamArena 
            initialTopic={activeTopic}
            onClearTopic={() => setActiveTopic(undefined)}
          />
        );
      case AppView.CREATOR_STUDIO:
        return <CreatorStudio />;
      case AppView.ECO_TRACKER:
        return <EcoTracker />;
      case AppView.LEARNING_PATH:
        return <LearningPath onNavigate={handleNavigate} />;
      case AppView.TEACHER_DASHBOARD:
        return (
          <TeacherDashboard 
            isAuthenticated={isTeacherAuthenticated}
            setIsAuthenticated={setIsTeacherAuthenticated}
            students={students}
            setStudents={setStudents}
          />
        );
      case AppView.CUSTOMER_SUPPORT:
        return (
          <CustomerSupport 
            isTeacherAuthenticated={isTeacherAuthenticated}
            students={students}
            setStudents={setStudents}
          />
        );
      default:
        return <Dashboard user={user} stats={stats} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans overflow-hidden transition-colors duration-200 relative">
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => handleNavigate(view)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        user={user}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
      />
      
      <main className="flex-1 overflow-auto w-full pt-16 md:pt-0">
        {renderView()}
      </main>

      {/* Sticky Help & Support FAB - Only visible on Student Dashboard and Teacher Dashboard */}
      {(currentView === AppView.DASHBOARD || currentView === AppView.TEACHER_DASHBOARD) && (
        <button
          onClick={() => handleNavigate(AppView.CUSTOMER_SUPPORT)}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all z-50 hover:scale-110 flex items-center justify-center group"
          aria-label="Help & Support"
        >
          <LifeBuoy size={28} />
          {/* Tooltip */}
          <span className="absolute right-full mr-3 bg-slate-900 dark:bg-slate-800 text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium shadow-sm">
            Help & Support
          </span>
        </button>
      )}
    </div>
  );
};

export default App;