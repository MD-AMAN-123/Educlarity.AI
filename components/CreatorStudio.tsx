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
      // Pass the activeBot profile to the service to use its specific persona
      const response = await generateCoachResponse(
        messages.map(m => ({ role: m.role, text: m.text })),
        userMsg.text,
        CoachMode.LEARNING, // Default to learning mode for bots
        Language.ENGLISH,   // Default to English, though model adapts
        undefined,
        activeBot // <--- CRITICAL: Passing the bot profile here
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

  // If in Chat Mode
  if (activeBot) {
    return (
      <div className="h-[calc(100vh-64px)] md:h-full flex flex-col bg-slate-50">
        {/* Chat Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveBot(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
             </button>
             <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-2xl border">
                {activeBot.icon}
             </div>
             <div>
               <h3 className="font-bold text-slate-800">{activeBot.name}</h3>
               <p className="text-xs text-slate-500">{activeBot.subject} • {activeBot.personality}</p>
             </div>
          </div>
          <button onClick={() => setActiveBot(null)} className="text-sm text-slate-500 hover:text-red-500">
            End Chat
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm md:text-base ${
                  msg.role === 'user' 
                   ? 'bg-slate-800 text-white rounded-br-none' 
                   : 'bg-white text-slate-800 border rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.role === 'user' ? 'You' : activeBot.name}
                </span>
             </div>
           ))}
           {isProcessing && (
             <div className="flex justify-start animate-pulse">
               <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border text-sm text-slate-500 italic">
                 {activeBot.name} is thinking...
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t sticky bottom-0">
           <div className="max-w-4xl mx-auto flex items-center gap-3">
             <input
               type="text"
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               placeholder={`Ask ${activeBot.name} about ${activeBot.subject}...`}
               className="flex-1 border rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
               disabled={isProcessing}
               autoFocus
             />
             <button
               onClick={handleSendMessage}
               disabled={!inputText.trim() || isProcessing}
               className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg"
             >
               <Send size={20} />
             </button>
           </div>
        </div>
      </div>
    );
  }

  // Default Studio View
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="text-yellow-500" /> Creator Studio
        </h1>
        <p className="text-slate-500">Build your own study assistants without writing code.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creator Form */}
        <div className="bg-white p-6 rounded-xl border shadow-sm h-fit sticky top-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Bot size={20} className="text-indigo-600" /> Create New Bot
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bot Name</label>
              <input 
                type="text" 
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Physics Ph.D"
                value={newBot.name}
                onChange={e => setNewBot({...newBot, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject Expertise</label>
              <input 
                type="text" 
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Quantum Mechanics"
                value={newBot.subject}
                onChange={e => setNewBot({...newBot, subject: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teaching Style</label>
              <select 
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
              className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> Create Bot
            </button>
          </div>
        </div>

        {/* Bot List */}
        <div className="lg:col-span-2">
           <h3 className="font-semibold text-lg mb-4 text-slate-700">Your Assistants</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bots.map((bot) => (
              <div key={bot.id} className="bg-white p-6 rounded-xl border shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Bot size={64} />
                </div>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl bg-slate-50 p-3 rounded-lg shadow-inner">{bot.icon}</div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">{bot.name}</h4>
                    <p className="text-sm text-indigo-600 font-medium">{bot.subject}</p>
                    <p className="text-xs text-slate-500 mt-1 italic">"{bot.personality}"</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => startChat(bot)}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} /> Chat Now
                  </button>
                  <button 
                    onClick={() => setBots(bots.filter(b => b.id !== bot.id))}
                    className="p-2.5 border rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete Bot"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            
            {bots.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
                    <Bot className="mx-auto text-slate-300 mb-2" size={48} />
                    <p className="text-slate-500">No bots created yet. Use the form to make one!</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorStudio;