import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, BrainCircuit } from 'lucide-react';
import { User } from '../types';

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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate secure network request delay for Email/Password
    setTimeout(() => {
      // Create mock user
      const name = isLogin ? (formData.email.split('@')[0] || 'Student') : formData.name;
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

      const user: User = {
        id: Date.now().toString(),
        name: formattedName,
        email: formData.email,
        avatar: `https://ui-avatars.com/api/?name=${formattedName}&background=4f46e5&color=fff`
      };

      onLogin(user);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[650px]">

        {/* Left Side - Abstract Brand Visual */}
        <div className="md:w-1/2 bg-slate-900 relative flex flex-col items-center justify-center p-8 md:p-12 text-white overflow-hidden">
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 opacity-95"></div>
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>

          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl mb-6 transform rotate-3">
              <BrainCircuit className="text-white w-14 h-14" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Educlarity.AI</h1>
            <p className="text-indigo-200 text-sm font-medium tracking-widest mt-2 uppercase">Future of Learning</p>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="md:w-1/2 p-8 md:p-12 bg-white flex flex-col justify-center relative">

          <div className="absolute top-8 right-8">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 px-6 py-2.5 rounded-full"
            >
              {isLogin ? "Create Account" : "Log In"}
            </button>
          </div>

          <div className="max-w-sm mx-auto w-full mt-12 md:mt-0">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-slate-500 mb-8">
              {isLogin
                ? 'Please enter your details to sign in.'
                : 'Join the community of top learners today.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arjun Verma"
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setFormData({ name: '', email: '', password: '' });
                    }}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6366f1] text-white py-3.5 rounded-xl font-bold hover:bg-[#4f46e5] transition-all flex items-center justify-center gap-2 mt-4 shadow-md shadow-indigo-100"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;