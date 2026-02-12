import React, { useState, useEffect } from 'react';
import { BookOpen, BarChart2, MessageCircle, PenTool, Layout, Leaf, Menu, X, Map, GraduationCap, LogOut, Edit2, Check, Moon, Sun } from 'lucide-react';
import { AppView, User } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isMobileMenuOpen, setIsMobileMenuOpen, user, onLogout, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: Layout },
    { id: AppView.LEARNING_PATH, label: 'Learning Path', icon: Map },
    { id: AppView.CONCEPT_COACH, label: 'AI Coach', icon: MessageCircle },
    { id: AppView.EXAM_ARENA, label: 'Exam Arena', icon: PenTool },
    { id: AppView.CREATOR_STUDIO, label: 'Creator Studio', icon: BookOpen },
    { id: AppView.TEACHER_DASHBOARD, label: 'Teacher Dash', icon: GraduationCap },
    { id: AppView.ECO_TRACKER, label: 'Eco Impact', icon: Leaf },
  ];

  const handleSave = () => {
    if (newName.trim()) {
      onUpdateUser({ ...user, name: newName });
    }
    setIsEditing(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 z-50 flex items-center justify-between px-4 transition-colors duration-200">
        <div className="flex items-center gap-2">
           <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Educlarity<span className="text-orange-500">.AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-600 dark:text-slate-300"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen flex flex-col
      `}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b dark:border-slate-800 hidden md:flex shrink-0">
             <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Educlarity<span className="text-orange-500">.AI</span></span>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-16 md:mt-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}
                  `}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          
          {/* Desktop Dark Toggle */}
          <div className="px-4 pb-2 hidden md:block">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div className="p-4 border-t dark:border-slate-800 space-y-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-4 text-white shadow-md">
              <p className="text-xs font-medium opacity-80">Exam Streak</p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-2xl font-bold">12</span>
                <span className="text-sm mb-1">days</span>
              </div>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border dark:border-slate-700">
              <img 
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} 
                alt={user.name}
                className="w-10 h-10 rounded-full border border-white dark:border-slate-600 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full text-sm border rounded px-1 py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') setIsEditing(false);
                      }}
                    />
                    <button onClick={handleSave} className="text-green-600 hover:text-green-700 p-0.5 bg-green-50 dark:bg-green-900/30 rounded">
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setNewName(user.name); setIsEditing(true); }}>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate select-none">{user.name}</p>
                    <button 
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Edit name"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;