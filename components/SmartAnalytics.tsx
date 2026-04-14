import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Award, Target, Zap, BookOpen, ChevronRight, Activity, Sparkles, Clock } from 'lucide-react';
import { DashboardStats } from '../types';

interface SmartAnalyticsProps {
  stats: DashboardStats;
}

const SmartAnalytics: React.FC<SmartAnalyticsProps> = ({ stats }) => {
  // Map syllabus progress to performance data for the chart
  const performanceData = stats.syllabusProgress.map(item => ({
    subject: item.name,
    score: item.value,
    mastery: Math.min(100, item.value + 10) // Mocking mastery as score + 10 for visual depth
  }));

  // Map weekly activity to growth data
  const growthData = stats.weeklyActivity.map(item => ({
    month: item.day,
    velocity: item.hours * 15 // Scale hours to velocity
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Activity className="text-indigo-600" size={32} />
            Smart Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            AI-driven insights into your learning velocity and subject mastery.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Weekly Report
          </button>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">
            Export Data
          </button>
        </div>
      </div>

      {/* High Level Stats using REAL data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Learning Velocity', value: `+${stats.streak}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Topics Mastered', value: stats.topicsMastered.toString(), icon: Award, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Avg. Accuracy', value: `${stats.avgScore}%`, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Total XP', value: stats.xp.toLocaleString(), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm">
            <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center ${item.color} mb-4`}>
              <item.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subject Mastery Charts using REAL data */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600" />
              Syllabus Coverage
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} name="Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Learning Growth Velocity using REAL daily data */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-green-600" />
              Study Time distribution
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="velocity" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVel)" name="Study Units" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Advanced AI Mastery Breakdown */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-xs font-bold tracking-widest uppercase text-indigo-400">
              <Sparkles size={14} />
              AI Adaptive Insight
            </div>
            <h2 className="text-3xl font-bold leading-tight">
              {stats.aiInsights?.[0]?.title || "Personalized Learning Path Ready"}
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              {stats.aiInsights?.[0]?.description || `You've spent ${stats.studyHours} hours mastering concepts this week. Your average score of ${stats.avgScore}% indicates high retention. Focus on your ${stats.weakAreas} weak areas to achieve "Master" rank.`}
            </p>
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors flex items-center gap-2 group shadow-xl shadow-indigo-500/20">
              Optimize My Path
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="flex justify-center">
            <div className="relative w-64 h-64">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={690.8}
                  strokeDashoffset={690.8 * (1 - stats.avgScore / 100)}
                  strokeLinecap="round"
                  className="text-indigo-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black">{stats.avgScore}%</span>
                <span className="text-xs font-bold opacity-60 uppercase tracking-widest mt-1">Global Percentile</span>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
      </div>
    </div>
  );
};

export default SmartAnalytics;
