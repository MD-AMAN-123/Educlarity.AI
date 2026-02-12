import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { CheckCircle, Clock, Award, AlertTriangle, Globe, Sparkles, BrainCircuit, Zap } from 'lucide-react';
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
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-10 shadow-2xl">
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
                        Educlarity<span className="text-purple-300">.AI</span>
                     </span>
                     <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold mt-0.5">
                        Future of Learning
                     </span>
                   </div>
                </div>

                <div>
                  <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                     Unlock your full <br/>
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
             <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto min-w-[280px]">
                 <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-lg transition-transform hover:scale-[1.02]">
                    <div className="bg-indigo-500/80 p-2.5 rounded-xl shadow-inner"><Globe className="w-5 h-5 text-white" /></div>
                    <div>
                       <p className="font-bold text-sm">Multilingual Support</p>
                       <p className="text-xs text-indigo-200">Hindi, English, Urdu & more</p>
                    </div>
                 </div>
                 
                 <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-lg transition-transform hover:scale-[1.02]">
                    <div className="bg-purple-500/80 p-2.5 rounded-xl shadow-inner"><Sparkles className="w-5 h-5 text-white" /></div>
                    <div>
                       <p className="font-bold text-sm">Smart Concept Coach</p>
                       <p className="text-xs text-indigo-200">Adaptive explanations</p>
                    </div>
                 </div>
             </div>
        </div>
      </div>

      <header className="flex justify-between items-end border-b dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hello, {firstName}! 👋</h1>
          <p className="text-slate-500 dark:text-slate-400">You are 85% ready for your JEE Mains Mock Test.</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Topics Mastered', value: stats?.topicsMastered || 0, icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Study Hours', value: `${stats?.studyHours || 0}h`, icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Avg. Score', value: `${stats?.avgScore || 0}%`, icon: Award, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Weak Areas', value: stats?.weakAreas || 0, icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Realtime Weekly Focus */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Weekly Focus</h3>
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
                   cursor={{ fill: '#f1f5f9' }} 
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Circular Progress - Syllabus Coverage */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Syllabus Coverage</h3>
          <div className="h-64 relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={syllabusData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {syllabusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {syllabusData[0]?.value || 0}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Mastered</span>
            </div>
          </div>
          <div className="flex justify-center gap-3 text-sm mt-4 flex-wrap">
             {syllabusData.map((d, i) => (
               <div key={i} className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                 <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">{d.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
      
      {/* Recommended Actions */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Recommended: Thermodynamics Revision</h3>
            <p className="text-indigo-100 mt-1">You scored low on the last mock test. Let's fix that!</p>
          </div>
          <button 
            onClick={() => onNavigate(AppView.CONCEPT_COACH, 'Thermodynamics')}
            className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-md"
          >
            Start Revision
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;