import React, { useState, useEffect } from 'react';
import { generateTeacherInsights } from '../services/geminiService';
import { TeacherInsight, Student } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GraduationCap, Users, AlertCircle, TrendingUp, Loader2, Lock, User as UserIcon, ArrowRight, Download, Plus, Trash2, X, Search, FileText, Save, ChevronLeft, Edit2 } from 'lucide-react';
import { addStudent, removeStudent, updateStudent } from '../services/studentService';

interface TeacherDashboardProps {
  user: User | null;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, isAuthenticated, setIsAuthenticated, students, setStudents }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const [insights, setInsights] = useState<TeacherInsight[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Real-time Feature States ---
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- Add/Edit Student Form State ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Track which student is being edited
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    grade: '',
    attendance: '',
    status: 'Stable'
  });
  
  // Mock class data to simulate what goes into the AI
  const mockClassData = [
    { topic: "Kinematics", avgScore: 85, difficultyLevel: "Easy" },
    { topic: "Thermodynamics", avgScore: 45, difficultyLevel: "Hard" },
    { topic: "Electromagnetism", avgScore: 60, difficultyLevel: "Medium" },
    { topic: "Optics", avgScore: 72, difficultyLevel: "Medium" },
    { topic: "Modern Physics", avgScore: 55, difficultyLevel: "Hard" }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      const fetchInsights = async () => {
        const res = await generateTeacherInsights(JSON.stringify(mockClassData));
        setInsights(res || []);
        setLoading(false);
      };
      fetchInsights();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.username.toLowerCase() === 'teacher' && credentials.password === 'admin') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid Access. Try username: teacher, password: admin');
    }
  };

  // --- Export Report Logic ---
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      // Create CSV Content
      const headers = "Topic,Average Score,Difficulty Level\n";
      const rows = mockClassData.map(d => `${d.topic},${d.avgScore}%,${d.difficultyLevel}`).join("\n");
      const csvContent = headers + rows;

      // Trigger Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "Class_Performance_Report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
    }, 1000); // Simulate generation time
  };

  // --- Manage Students Logic ---
  const handleRemoveStudent = async (id: string, e: React.MouseEvent) => {
    // Prevent event bubbling to row
    e.stopPropagation();
    
    // We use a simple confirm. If this fails, we can replace with a custom modal.
    // For now, let's assume confirm is fine but ensure state update happens reliably.
    if (window.confirm("Delete this student permanently?")) {
        try {
            // Immediate UI update (Optimistic)
            setStudents(prev => prev.filter(s => s.id !== id));
            
            // Background sync - don't await blocking UI
            removeStudent(id).catch(err => console.error("Sync delete failed", err));
        } catch (err) {
            console.error("Delete handler error", err);
        }
    }
  };

  const handleEditClick = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewStudentData({
        name: student.name,
        grade: student.grade,
        attendance: student.attendance,
        status: student.status
    });
    setEditingId(student.id);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setNewStudentData({ name: '', grade: '', attendance: '', status: 'Stable' });
  };

  const handleSaveStudent = async () => {
    if (!newStudentData.name || !newStudentData.grade || !newStudentData.attendance) {
      alert("Please fill in all fields.");
      return;
    }

    setIsAddingStudent(true);
    
    // Ensure attendance has %
    const formattedAttendance = newStudentData.attendance.includes('%') 
      ? newStudentData.attendance 
      : `${newStudentData.attendance}%`;

    const payload = {
      name: newStudentData.name,
      grade: newStudentData.grade,
      attendance: formattedAttendance,
      status: newStudentData.status as 'At Risk' | 'Stable' | 'Excelling'
    };

    if (editingId) {
        // --- UPDATE EXISTING STUDENT ---
        const updatedStudent = await updateStudent(editingId, payload);
        if (updatedStudent) {
            setStudents(prev => prev.map(s => s.id === editingId ? updatedStudent : s));
            handleCloseForm();
        } else {
             // Fallback for UI if backend fails but we want to show update for demo
             setStudents(prev => prev.map(s => s.id === editingId ? { ...s, ...payload } : s));
             handleCloseForm();
        }
    } else {
        // --- ADD NEW STUDENT ---
        if (!user) {
            alert("No authenticated user found.");
            setIsAddingStudent(false);
            return;
        }
        const savedStudent = await addStudent(payload, user.id);
        if (savedStudent) {
            setStudents(prev => [savedStudent, ...prev]);
            handleCloseForm();
        } else {
             // Mock fallback
             const mockId = Date.now().toString();
             setStudents(prev => [{ id: mockId, ...payload } as Student, ...prev]);
             handleCloseForm();
        }
    }
    setIsAddingStudent(false);
  };

  const handleViewFullRegister = () => {
    // 1. Reset any filters to show all in UI
    setSearchQuery(''); 

    // 2. Generate and download CSV
    const headers = "Student ID,Name,Current Grade,Attendance,Academic Status\n";
    const rows = students.map(s => `${s.id},${s.name},${s.grade},${s.attendance},${s.status}`).join("\n");
    const csvContent = headers + rows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Full_Student_Register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.id.includes(searchQuery)
  );

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-fade-in p-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-white/20 dark:border-slate-800">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-indigo-50/50 dark:ring-indigo-900/10 rotate-3 group-hover:rotate-0 transition-transform">
              <GraduationCap className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Teacher <span className="text-indigo-600">Portal</span></h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 text-center font-medium leading-relaxed">
              Authenticate to access the Class Management System & AI Student Analytics.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">ADMIN USERNAME</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="text"
                  required 
                  placeholder="teacher"
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 outline-none transition-all bg-slate-50 dark:bg-slate-800 dark:text-white"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">SECURE ACCESS KEY</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  required
                  placeholder="admin"
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 outline-none transition-all bg-slate-50 dark:bg-slate-800 dark:text-white"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4.5 rounded-2xl font-black hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-4 text-sm"
            >
              INITIALIZE PORTAL <ArrowRight size={20} />
            </button>
          </form>
          
          <div className="mt-8 text-center">
             <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">© 2024 EDUFREE.AI • SECURED ENVIRONMENT</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in relative pb-24">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl">
              <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={32} />
            </div>
            Teacher <span className="text-indigo-600">Console</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Physics 12th • Section A • <span className="text-indigo-500">Live Analytics</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 px-5 py-3 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={20} />}
            {isExporting ? 'Exporting...' : 'Export Analytics'}
          </button>
          <button 
            onClick={() => { setIsStudentModalOpen(true); handleCloseForm(); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <Users size={20} /> Manage Cohort
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Enrolled', value: students.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
          { label: 'Attention Required', value: students.filter(s => s.status === 'At Risk').length, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30' },
          { label: 'Average Score', value: '72%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border dark:border-slate-700 shadow-sm flex items-center gap-6">
            <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl shadow-inner`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border dark:border-slate-700 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-xl text-slate-800 dark:text-white">Performance Matrix</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Score</span>
                </div>
              </div>
           </div>
           <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={mockClassData}>
                  <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(99, 102, 241, 0.05)'}} 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2">
               <TrendingUp className="text-purple-500" /> AI Insights Engine
            </h3>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-black rounded-lg">LIVE ANALYSIS</span>
          </div>
          
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-16 h-16">
                 <div className="absolute inset-0 border-4 border-indigo-100 dark:border-slate-700 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Processing Data...</span>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 max-h-[320px] custom-scrollbar">
              {(insights || []).map((insight, idx) => (
                <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-slate-900 dark:text-white">{insight.topic}</h4>
                    <span className={`text-[10px] px-2 py-1 rounded-lg font-black tracking-tight ${
                      insight.avgScore < 50 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {insight.avgScore}% SCORE
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{insight.recommendation}</p>
                  <div className="flex gap-4 pt-4 border-t dark:border-slate-800">
                     <button className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 uppercase tracking-widest transition-colors">Assign Support Task</button>
                     <button className="text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-slate-600 uppercase tracking-widest transition-colors">Deep Dive</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Management Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] border dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {showAddForm ? (editingId ? 'Edit Student Profile' : 'Register New Student') : 'Cohort Management'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                    {showAddForm ? 'Update academic details and attendance records.' : 'Overview of all enrolled student performance.'}
                </p>
              </div>
              <button 
                onClick={() => setIsStudentModalOpen(false)}
                className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            {showAddForm ? (
                /* Add/Edit Student Form */
                <div className="p-8 flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Full Name</label>
                            <input 
                                type="text"
                                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Aditi Rao"
                                value={newStudentData.name}
                                onChange={(e) => setNewStudentData({...newStudentData, name: e.target.value})}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Current Grade</label>
                            <select 
                                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                value={newStudentData.grade}
                                onChange={(e) => setNewStudentData({...newStudentData, grade: e.target.value})}
                            >
                                <option value="" disabled>Select Grade</option>
                                <option value="A+">A+</option>
                                <option value="A">A</option>
                                <option value="B+">B+</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Attendance (%)</label>
                            <input 
                                type="number"
                                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. 85"
                                value={newStudentData.attendance.replace('%','')}
                                onChange={(e) => setNewStudentData({...newStudentData, attendance: e.target.value})}
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <select 
                                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                value={newStudentData.status}
                                onChange={(e) => setNewStudentData({...newStudentData, status: e.target.value})}
                            >
                                <option value="Stable">Stable</option>
                                <option value="Excelling">Excelling</option>
                                <option value="At Risk">At Risk</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t mt-2">
                         <button 
                            type="button"
                            onClick={handleCloseForm}
                            className="text-slate-500 font-medium hover:text-slate-800 flex items-center gap-1"
                         >
                            <ChevronLeft size={18} /> Back to List
                         </button>
                         <button 
                            type="button"
                            onClick={handleSaveStudent}
                            disabled={isAddingStudent || !newStudentData.name}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-indigo-200 transition-all"
                         >
                            {isAddingStudent ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {editingId ? 'Update Student' : 'Save Student'}
                         </button>
                    </div>
                </div>
            ) : (
                /* Student List View */
                <>
                    <div className="p-4 border-b bg-slate-50 flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search student..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button 
                        onClick={() => { setShowAddForm(true); setEditingId(null); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Student
                    </button>
                    </div>

                    <div className="overflow-auto p-0 flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                            <tr>
                            <th className="px-6 py-4 font-semibold">Name</th>
                            <th className="px-6 py-4 font-semibold">Current Grade</th>
                            <th className="px-6 py-4 font-semibold">Attendance</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                <div className="font-medium text-slate-900">{student.name}</div>
                                <div className="text-xs text-slate-500">ID: #{student.id.slice(-4)}</div>
                                </td>
                                <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    student.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                                    student.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                                    'bg-orange-100 text-orange-800'
                                }`}>
                                    {student.grade}
                                </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{student.attendance}</td>
                                <td className="px-6 py-4">
                                <span className={`text-xs font-bold ${
                                    student.status === 'At Risk' ? 'text-red-500' :
                                    student.status === 'Excelling' ? 'text-green-600' : 'text-slate-600'
                                }`}>
                                    {student.status}
                                </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                      type="button"
                                      onClick={(e) => handleEditClick(student, e)}
                                      className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
                                      title="Edit Student"
                                  >
                                      <Edit2 size={18} />
                                  </button>
                                  <button 
                                      type="button"
                                      onClick={(e) => handleRemoveStudent(student.id, e)}
                                      className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                                      title="Delete Student"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                                </div>
                                </td>
                            </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                {students.length === 0 
                                    ? "No students found. Add one to get started." 
                                    : "No students match your search."}
                                </td>
                            </tr>
                            )}
                        </tbody>
                    </table>
                    </div>

                    <div className="p-4 border-t bg-slate-50 rounded-b-2xl text-xs text-slate-500 flex justify-between items-center">
                        <span>Showing {filteredStudents.length} students</span>
                        <button 
                            onClick={handleViewFullRegister}
                            className="text-indigo-600 font-medium hover:underline flex items-center gap-1"
                        >
                            <FileText size={14} /> View Full Register
                        </button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;