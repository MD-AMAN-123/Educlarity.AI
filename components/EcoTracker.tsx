import React from 'react';
import { Leaf, TreeDeciduous, FileText, Wind } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const EcoTracker: React.FC = () => {
  const data = [
    { month: 'Jan', paperSaved: 120 },
    { month: 'Feb', paperSaved: 250 },
    { month: 'Mar', paperSaved: 180 },
    { month: 'Apr', paperSaved: 320 },
    { month: 'May', paperSaved: 450 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="mb-8 bg-green-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-10 -translate-y-10">
           <Leaf size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Leaf className="text-green-400" /> Eco Impact Tracker
          </h1>
          <p className="text-green-200 mt-2 max-w-xl">
            By using digital exams and AI tutors, Educlarity.AI helps reduce paper waste. 
            Here is your contribution to a greener India.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
           <div className="flex items-center gap-4">
             <div className="p-3 bg-green-50 rounded-lg text-green-600"><FileText size={24} /></div>
             <div>
               <p className="text-sm text-slate-500">Paper Sheets Saved</p>
               <p className="text-2xl font-bold text-slate-900">1,320</p>
             </div>
           </div>
           <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Wind size={24} /></div>
             <div>
               <p className="text-sm text-slate-500">CO2 Avoided</p>
               <p className="text-2xl font-bold text-slate-900">5.4 kg</p>
             </div>
           </div>
           <div className="flex items-center gap-4">
             <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><TreeDeciduous size={24} /></div>
             <div>
               <p className="text-sm text-slate-500">Equivalent Trees</p>
               <p className="text-2xl font-bold text-slate-900">0.2</p>
             </div>
           </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-xl border shadow-sm md:col-span-2">
           <h3 className="font-semibold text-lg text-slate-800 mb-4">Paper Savings Trend (Sheets)</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data}>
                 <defs>
                   <linearGradient id="colorPaper" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="month" axisLine={false} tickLine={false} />
                 <YAxis axisLine={false} tickLine={false} />
                 <Tooltip />
                 <Area type="monotone" dataKey="paperSaved" stroke="#16a34a" fillOpacity={1} fill="url(#colorPaper)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
      
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-orange-800">Did you know?</h3>
          <p className="text-orange-700 text-sm">One student switching to digital learning for a year saves approximately 2 trees worth of paper!</p>
        </div>
        <button className="whitespace-nowrap bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors">
          Share Impact
        </button>
      </div>
    </div>
  );
};

export default EcoTracker;