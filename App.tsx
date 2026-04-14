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
import DoubtSolver from './components/DoubtSolver';
import SmartAnalytics from './components/SmartAnalytics';
import { AppView, User, DashboardStats, Student } from './types';
import { LifeBuoy, Layout, MessageCircle, PenTool, Camera, Menu } from 'lucide-react';
import { fetchStudents } from './services/studentService';
import { generateDashboardInsights } from './services/geminiService';
import { logUserLogin } from './services/authService';
import { fetchUserStats, saveUserStats } from './services/statsService';

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
      if (!user) return;

      // Fetch from DB for the specific user
      const data = await fetchStudents(user.id);
      if (data && data.length > 0) {
        setStudents(data);
      } else {
        // Fallback to mock data if DB is empty for this user
        const mocks: Student[] = [
          { id: '1', name: 'Arjun Verma', grade: 'A', attendance: '92%', status: 'Excelling' },
          { id: '2', name: 'Priya Sharma', grade: 'B+', attendance: '88%', status: 'Stable' },
          { id: '3', name: 'Rahul Singh', grade: 'C', attendance: '75%', status: 'At Risk' },
        ];
        setStudents(mocks);
      }
      setIsDataLoaded(true);
    };
    loadStudents();
  }, [user]);

  // Sync state changes to LocalStorage
  useEffect(() => {
    // Only save if initial load is complete to prevent overwriting with empty array
    if (isDataLoaded) {
      localStorage.setItem('edufree_students', JSON.stringify(students));
    }
  }, [students, isDataLoaded]);

  // --- Real-time Analytics State ---
  const [stats, setStats] = useState<DashboardStats>({
    topicsMastered: 42,
    studyHours: 28.0,
    avgScore: 78,
    weakAreas: 3,
    streak: 12,
    xp: 2450,
    dailyGoals: [
      { id: '1', title: 'Complete 3 Physics problems', completed: true, xp: 50 },
      { id: '2', title: 'Watch 1 concept video', completed: false, xp: 30 },
      { id: '3', title: 'Take a daily mock quiz', completed: false, xp: 100 },
    ],
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

  const handleLogin = async (authenticatedUser: User) => {
    setUser(authenticatedUser);
    
    // Store user login in Supabase
    logUserLogin(authenticatedUser);

    // Try to restore stats from Supabase
    const savedStats = await fetchUserStats(authenticatedUser.id);
    
    if (savedStats) {
      setStats(savedStats);
    } else {
      // Generate fresh stats for the new user session
      const freshStats: DashboardStats = {
        topicsMastered: Math.floor(Math.random() * 20) + 30, // 30-50
        studyHours: parseFloat((Math.random() * 10 + 20).toFixed(1)), // 20-30
        avgScore: Math.floor(Math.random() * 15) + 75, // 75-90
        weakAreas: Math.floor(Math.random() * 3) + 2, // 2-5
        streak: Math.floor(Math.random() * 5) + 5,
        xp: Math.floor(Math.random() * 1000) + 1000,
        dailyGoals: [
          { id: '1', title: 'Complete 3 problems', completed: Math.random() > 0.5, xp: 50 },
          { id: '2', title: 'Watch 1 video', completed: Math.random() > 0.5, xp: 30 },
          { id: '3', title: 'Take quiz', completed: Math.random() > 0.5, xp: 100 },
        ],
        weeklyActivity: [
          { day: 'Mon', hours: parseFloat((Math.random() * 2 + 1.5).toFixed(1)) },
          { day: 'Tue', hours: parseFloat((Math.random() * 3 + 2).toFixed(1)) },
          { day: 'Wed', hours: parseFloat((Math.random() * 2 + 1).toFixed(1)) },
          { day: 'Thu', hours: parseFloat((Math.random() * 4 + 3).toFixed(1)) },
          { day: 'Fri', hours: parseFloat((Math.random() * 3 + 2.5).toFixed(1)) },
          { day: 'Sat', hours: parseFloat((Math.random() * 5 + 4).toFixed(1)) },
          { day: 'Sun', hours: parseFloat((Math.random() * 2 + 1).toFixed(1)) },
        ],
        syllabusProgress: [
          { name: 'Mastered', value: Math.floor(Math.random() * 10) + 60, color: '#10b981' },
          { name: 'In Progress', value: Math.floor(Math.random() * 10) + 20, color: '#f59e0b' },
          { name: 'To Learn', value: 10, color: '#cbd5e1' },
        ],
        aiInsights: undefined
      };
      setStats(freshStats);
      // Save the initial stats
      await saveUserStats(authenticatedUser.id, freshStats);
    }

    // Fetch AI insights asynchronously if needed (or keep current logic)
    try {
      const currentStats = savedStats || stats;
      const insights = await generateDashboardInsights(authenticatedUser.name, currentStats);
      setStats(prev => {
        const updated = { ...prev, aiInsights: insights };
        saveUserStats(authenticatedUser.id, updated);
        return updated;
      });
    } catch (error) {
      console.error("Failed to generate insights:", error);
    }
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
            user={user}
            isAuthenticated={isTeacherAuthenticated}
            setIsAuthenticated={setIsTeacherAuthenticated}
            students={students}
            setStudents={setStudents}
          />
        );
      case AppView.CUSTOMER_SUPPORT:
        return (
          <CustomerSupport
            user={user}
            isTeacherAuthenticated={isTeacherAuthenticated}
            students={students}
            setStudents={setStudents}
          />
        );
      case AppView.DOUBT_SOLVER:
        return <DoubtSolver />;
      case AppView.SMART_ANALYTICS:
        return <SmartAnalytics stats={stats} />;
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

      <main className="flex-1 overflow-auto w-full pt-16 md:pt-0 pb-20 md:pb-0">
        {renderView()}
      </main>

      {/* Premium Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t dark:border-slate-800 z-50 px-6 flex items-center justify-between pb-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {[
          { id: AppView.DASHBOARD, icon: Layout, label: 'Home' },
          { id: AppView.CONCEPT_COACH, icon: MessageCircle, label: 'Coach' },
          { id: AppView.DOUBT_SOLVER, icon: Camera, label: 'Solver' },
          { id: AppView.EXAM_ARENA, icon: PenTool, label: 'Exams' },
          { id: 'more', icon: Menu, label: 'More' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isMore = item.id === 'more';
          
          return (
            <button
              key={item.id}
              onClick={() => isMore ? setIsMobileMenuOpen(true) : handleNavigate(item.id as AppView)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              {isActive && <div className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>}
            </button>
          );
        })}
      </nav>

      {/* Sticky Help & Support FAB - Only visible on Student Dashboard and Teacher Dashboard */}
      {(currentView === AppView.DASHBOARD || currentView === AppView.TEACHER_DASHBOARD) && (
        <button
          onClick={() => handleNavigate(AppView.CUSTOMER_SUPPORT)}
          className="fixed bottom-24 md:bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all z-50 hover:scale-110 flex items-center justify-center group"
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