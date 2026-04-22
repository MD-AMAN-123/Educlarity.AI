import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Save, User, ArrowLeft, Send, Trash2, MessageCircle } from 'lucide-react';
import { StudyBot, ChatMessage, CoachMode, Language } from '../types';
import { generateCoachResponse } from '../services/geminiService';

const CreatorStudio: React.FC = () => {
  // --- Bot Management State ---
  const [bots, setBots] = useState<StudyBot[]>([
    { id: '1', name: 'History Buddy', subject: 'History', personality: 'Storyteller', icon: '📜' },
    { id: '2', name: 'Code Ninja', subject: 'Computer Science', personality: 'Strict & Efficient', icon: '💻' },
    { id: '3', name: 'Ayurveda Expert', subject: 'Health & Wellness', personality: 'Calm & Holistic', icon: '🌿' },
  ]);

  const [newBot, setNewBot] = useState({ name: '', subject: '', personality: 'Friendly' });

  // --- Active Chat State ---
  const [activeBot, setActiveBot] = useState<StudyBot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeBot) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeBot]);

  const handleCreate = () => {
    if (!newBot.name) return;
    const bot: StudyBot = {
      id: Date.now().toString(),
      name: newBot.name,
      subject: newBot.subject,
      personality: newBot.personality,
      icon: '🤖'
    };
    setBots([...bots, bot]);
    setNewBot({ name: '', subject: '', personality: 'Friendly' });
  };

  const startChat = (bot: StudyBot) => {
    setActiveBot(bot);
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: `Hello! I am ${bot.name}, your ${bot.subject} assistant. How can I help you today?`,
        timestamp: Date.now()
      }
    ]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeBot) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    setInputText('');

    try {
      const response = await generateCoachResponse(
        messages.map(m => ({ role: m.role, text: m.text })),
        userMsg.text,
        CoachMode.LEARNING,
        Language.ENGLISH,
        undefined,
        activeBot
      );

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (activeBot) {
    return (
      <div className="h-[calc(100vh-64px)] md:h-full flex flex-col bg-slate-50 dark:bg-slate-950">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveBot(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
             </button>
             <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-2xl border dark:border-slate-700">
                {activeBot.icon}
             </div>
             <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{activeBot.name}</h3>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500 tracking-wider font-mono">{activeBot.subject} • {activeBot.personality}</p>
             </div>
          </div>
          <button onClick={() => setActiveBot(null)} className="text-sm font-bold text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            End Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-3xl p-5 shadow-sm text-sm md:text-base leading-relaxed ${
                  msg.role === 'user' 
                   ? 'bg-indigo-600 text-white rounded-br-none' 
                   : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border dark:border-slate-700 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 mt-2 px-2 uppercase tracking-tight">
                  {msg.role === 'user' ? 'Me' : activeBot.name}
                </span>
             </div>
           ))}
           {isProcessing && (
             <div className="flex justify-start">
               <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl rounded-bl-none shadow-sm border dark:border-slate-700 flex items-center gap-2">
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
                 </div>
                 <span className="text-xs font-bold text-slate-500 italic">{activeBot.name} is formulating a response...</span>
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-t dark:border-slate-800 sticky bottom-0">
           <div className="max-w-4xl mx-auto flex items-center gap-3">
             <input
               type="text"
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               placeholder={`Message ${activeBot.name}...`}
               className="flex-1 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
               disabled={isProcessing}
               autoFocus
             />
             <button
               onClick={handleSendMessage}
               disabled={!inputText.trim() || isProcessing}
               className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
             >
               <Send size={24} />
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      <header className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
            <Sparkles className="text-amber-500" size={32} />
          </div>
          Creator <span className="text-indigo-600">Studio</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Build hyper-personalized AI tutors tailored to your learning style.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border dark:border-slate-700 shadow-xl h-fit sticky top-6">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2 dark:text-white">
            <Bot size={24} className="text-indigo-600" /> New Assistant
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Bot Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="e.g. History Guru"
                value={newBot.name}
                onChange={e => setNewBot({...newBot, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Expertise</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="e.g. World War II"
                value={newBot.subject}
                onChange={e => setNewBot({...newBot, subject: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Personality</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:text-white"
                value={newBot.personality}
                onChange={e => setNewBot({...newBot, personality: e.target.value})}
              >
                <option>Friendly & Encouraging</option>
                <option>Strict & Academic</option>
                <option>Socratic (Question based)</option>
                <option>Funny & Casual</option>
                <option>Explain like I am 5</option>
              </select>
            </div>
            <button 
              onClick={handleCreate}
              disabled={!newBot.name || !newBot.subject}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg active:scale-95"
            >
              <Save size={20} /> Deploy Bot
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl text-slate-800 dark:text-white">Active Assistants</h3>
              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-black">
                {bots.length} TOTAL
              </span>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {bots.map((bot) => (
              <div key={bot.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-md hover:border-indigo-500 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col h-full ring-offset-2 hover:ring-2 ring-indigo-500/20">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform"></div>
                
                <div className="flex items-start gap-4 mb-6 relative z-10">
                  <div className="text-4xl bg-indigo-50 dark:bg-slate-900 p-4 rounded-2xl shadow-inner border dark:border-slate-700 group-hover:rotate-6 transition-transform">
                    {bot.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xl text-slate-900 dark:text-white truncate">{bot.name}</h4>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold tracking-tight mb-1">{bot.subject}</p>
                    <div className="flex items-center gap-1.5 opacity-60 text-[10px] font-bold uppercase tracking-tighter dark:text-slate-400">
                      <Bot size={12} /> {bot.personality}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto relative z-10">
                  <button 
                    onClick={() => startChat(bot)}
                    className="flex-1 bg-slate-900 dark:bg-slate-700 text-white py-3 rounded-2xl text-sm font-bold hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-600"
                  >
                    <MessageCircle size={18} /> Start Session
                  </button>
                  <button 
                    onClick={() => setBots(bots.filter(b => b.id !== bot.id))}
                    className="p-3 bg-red-50 dark:bg-red-900/10 border dark:border-red-900/30 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {bots.length === 0 && (
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed dark:border-slate-700 p-16 text-center">
              <Bot className="mx-auto text-slate-300 dark:text-slate-700 mb-6" size={80} />
              <h4 className="text-xl font-bold dark:text-white">Your Studio is Empty</h4>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2 font-medium">Create your first custom AI tutor to populate your studio workspace.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorStudio;