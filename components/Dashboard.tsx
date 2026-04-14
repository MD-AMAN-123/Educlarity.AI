import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { CheckCircle, Clock, Award, AlertTriangle, Globe, Sparkles, BrainCircuit, Zap, Camera, Flame, Trophy, Target } from 'lucide-react';
import { User, AppView, DashboardStats } from '../types';

interface DashboardProps {
  user: User;
  stats: DashboardStats;
  onNavigate: (view: AppView, topic?: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, stats, onNavigate }) => {
  const firstName = user.name.split(' ')[0];

  // Defensive check for stats to prevent runtime crashes
  const syllabusData = stats?.syllabusProgress || [];
  const activityData = stats?.weeklyActivity || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">

      {/* Branding Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 md:p-10 shadow-2xl">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 opacity-95"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
          <div className="space-y-6 max-w-2xl w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-sm">
                <BrainCircuit className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight leading-none">
                  EduFree<span className="text-purple-300">.AI</span>
                </span>
                <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold mt-0.5">
                  Learn Anytime. Anywhere. Even Offline.
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-3">
                Unlock your full <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200">
                  Academic Potential
                </span>
              </h2>
              <p className="text-indigo-100 text-base opacity-90 max-w-lg">
                Personalized AI tutoring, exam readiness, and concept mastery tailored for Indian students.
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-lg transition-transform hover:scale-[1.02]">
              <div className="bg-indigo-500/80 p-2.5 rounded-xl shadow-inner"><Globe className="w-5 h-5 text-white" /></div>
              <div>
                <p className="font-bold text-sm">Multilingual Support</p>
                <p className="text-xs text-indigo-200">Hindi, English, Urdu & more</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-lg transition-transform hover:scale-[1.02]">
              <div className="bg-purple-500/80 p-2.5 rounded-xl shadow-inner"><BrainCircuit className="w-5 h-5 text-white" /></div>
              <div>
                <p className="font-bold text-sm">Offline AI Tutor</p>
                <p className="text-xs text-indigo-200">On-device intelligent tutoring</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-lg transition-transform hover:scale-[1.02]">
              <div className="bg-pink-500/80 p-2.5 rounded-xl shadow-inner"><Zap className="w-5 h-5 text-white" /></div>
              <div>
                <p className="font-bold text-sm">Instant Doubt Solver</p>
                <p className="text-xs text-indigo-200">Scan & solve with camera</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Welcome back, {firstName}! 👋</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">You're on a roll! Keep up the great work.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-2xl flex items-center gap-2 border border-orange-100 dark:border-orange-500/20 shadow-sm">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-orange-600 dark:text-orange-400">Streak</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">{stats?.streak || 0} Days</p>
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-2xl flex items-center gap-2 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
            <span className="text-2xl">💎</span>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">Total XP</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">{stats?.xp?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ask AI Brain', icon: BrainCircuit, color: 'bg-indigo-600', view: AppView.CONCEPT_COACH },
          { label: 'Instant Quiz', icon: Zap, color: 'bg-amber-500', view: AppView.EXAM_ARENA },
          { label: 'Scan Doubt', icon: Camera, color: 'bg-emerald-500', view: AppView.DOUBT_SOLVER },
          { label: 'Learning Path', icon: Award, color: 'bg-green-500', view: AppView.LEARNING_PATH },
        ].map((action, i) => (
          <button
            key={i}
            onClick={() => onNavigate(action.view)}
            className="flex flex-col items-center justify-center p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group"
          >
            <div className={`${action.color} p-4 rounded-2xl text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
              <action.icon size={24} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Daily Goals */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Daily Goals</h3>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
                {stats?.dailyGoals?.filter(g => g.completed).length}/{stats?.dailyGoals?.length} Done
              </span>
            </div>
            <div className="space-y-4">
              {stats?.dailyGoals?.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 group cursor-pointer">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${goal.completed ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {goal.completed && <CheckCircle className="text-white w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${goal.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{goal.title}</p>
                    <p className="text-[10px] text-indigo-500 font-bold">+{goal.xp} XP</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
              + Add Custom Goal
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Mastery Stats</h3>
            <div className="space-y-4">
              {[
                { label: 'Topics Mastered', value: stats?.topicsMastered || 0, icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Study Hours', value: `${stats?.studyHours || 0}h`, icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Avg. Score', value: `${stats?.avgScore || 0}%`, icon: Award, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
               {/* Right Column: Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Chart - Realtime Weekly Focus */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Weekly Focus</h3>
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full animate-pulse">
                <Zap size={12} fill="currentColor" />
                Live Tracking
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} stroke="#94a3b8" />
                  <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: '#1e293b', color: '#fff' }}
                  />
                  <Bar dataKey="hours" fill="#4f46e5" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Circular Progress - Syllabus Coverage */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Syllabus Coverage</h3>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={syllabusData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
                  >
                    {syllabusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">
                  {syllabusData[0]?.value || 0}%
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">Mastered</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 text-sm mt-4 flex-wrap">
              {syllabusData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                  <span className="text-slate-600 dark:text-slate-400 text-xs font-bold">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI Personal Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats?.aiInsights ? (
            stats.aiInsights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500`}
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${insight.type === 'success' ? 'bg-green-500' :
                      insight.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                    }`} />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{insight.title}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed dark:border-slate-700">
              <p className="text-slate-400 text-sm">Generating fresh insights for you...</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Zap className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">
              <BrainCircuit size={12} /> Priority Recommendation
            </div>
            <h3 className="text-2xl font-bold">Recommended: Thermodynamics Revision</h3>
            <p className="text-indigo-100 max-w-xl opacity-90">Based on your recent mock test analysis, mastering Heat Transfer could boost your score by up to 12%.</p>
          </div>
          <button
            onClick={() => onNavigate(AppView.CONCEPT_COACH, 'Thermodynamics')}
            className="whitespace-nowrap bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.1)] active:scale-95 flex items-center gap-2"
          >
            Start Revision <Zap size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;