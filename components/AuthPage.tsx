import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, BrainCircuit, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // --- Supabase Sign In ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.user) {
          const user: User = {
            id: data.user.id,
            name: data.user.user_metadata.full_name || data.user.email?.split('@')[0] || 'Student',
            email: data.user.email || '',
            avatar: `https://ui-avatars.com/api/?name=${data.user.email}&background=6366f1&color=fff`
          };
          onLogin(user);
        }
      } else {
        // --- Supabase Sign Up ---
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          const user: User = {
            id: data.user.id,
            name: formData.name || data.user.email?.split('@')[0] || 'Student',
            email: data.user.email || '',
            avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=6366f1&color=fff`
          };
          onLogin(user);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error.message);
      alert(error.message); // Simple alert for feedback
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-6xl w-full grid md:grid-cols-2 bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden relative z-10 transition-all duration-500">

        {/* Left Side: Brand Visual */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-indigo-600/30 to-purple-900/10 border-r border-white/5 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>

          <div className="relative z-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-1000">
            <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.4)] mb-8 transform hover:scale-105 transition-transform duration-500">
              <BrainCircuit className="text-white w-24 h-24" />
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter mb-4">
              EduFree<span className="text-indigo-400">.AI</span>
            </h1>
            <p className="text-indigo-200/60 text-xl font-medium tracking-[0.3em] uppercase">
              Learn Anytime. Anywhere. Even Offline.
            </p>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 md:p-16 flex flex-col justify-center relative">
          <div className="absolute top-8 right-8 flex items-center gap-2">
            <span className="text-slate-400 text-sm">{isLogin ? "No account?" : "Have an account?"}</span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </div>

          <div className="max-w-md mx-auto w-full">
            <div className="mb-10 block md:hidden">
              <div className="flex items-center gap-2 mb-6">
                <BrainCircuit className="text-indigo-500 w-8 h-8" />
                <span className="text-xl font-bold text-white">EduFree.AI</span>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-3">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-400 mb-10 text-lg">
              {isLogin
                ? 'Sign in to continue your learning journey.'
                : 'Join our community of future-ready learners.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Full Name</label>
                  <div className="relative group grayscale focus-within:grayscale-0 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserIcon className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Arjun Verma"
                      className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Email Address</label>
                <div className="relative group grayscale focus-within:grayscale-0 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-slate-400">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setFormData({ name: '', email: '', password: '' });
                      }}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative group grayscale focus-within:grayscale-0 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-900/20 disabled:opacity-70"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-slate-500 text-sm font-medium">Trusted by learners worldwide</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        .right-8 {
          right: 0rem !important; /* using !important to override tailwind's inline or linked utility classes effectively if needed */
        }
      `}</style>
    </div>
  );
};

export default AuthPage;