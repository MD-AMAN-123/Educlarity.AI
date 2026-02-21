import React, { useState, useRef, useEffect } from 'react';
import { LifeBuoy, MessageSquare, Mail, Phone, ChevronDown, ChevronUp, Send, Loader2, CheckCircle, FileText } from 'lucide-react';
import { generateSupportResponse } from '../services/geminiService';
import { ChatMessage, Student } from '../types';
import { addStudent, removeStudent } from '../services/studentService';

interface CustomerSupportProps {
  isTeacherAuthenticated?: boolean;
  students?: Student[];
  setStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
}

const CustomerSupport: React.FC<CustomerSupportProps> = ({ isTeacherAuthenticated, students, setStudents }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'ticket'>('chat');
  
  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: isTeacherAuthenticated 
        ? 'Welcome, Teacher! I can help you manage your class. You can ask me to "Add a new student called Rahul with Grade A" or "Delete Arjun Verma".'
        : 'Hi there! I am the Educlarity Support Bot. How can I help you with your account or studies today?',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Ticket State ---
  const [ticketForm, setTicketForm] = useState({ subject: '', category: 'Technical Issue', description: '' });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  // --- FAQ State ---
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // --- Tool Handlers for Teacher Mode ---
  const handleToolAddStudent = async (studentData: any): Promise<string> => {
    if (!setStudents) return "Error: Data access unavailable.";
    
    // Default values if AI misses some fields
    const newStudent = {
      name: studentData.name || "Unknown Student",
      grade: studentData.grade || "C",
      attendance: studentData.attendance || "0%",
      status: studentData.status || "Stable"
    };

    const added = await addStudent(newStudent as any);
    if (added) {
      setStudents(prev => [added, ...prev]);
      return `Successfully added student: ${added.name} (ID: ${added.id}).`;
    }
    return "Failed to add student due to a database error.";
  };

  const handleToolRemoveStudent = async (name: string): Promise<string> => {
    if (!setStudents || !students) return "Error: Data access unavailable.";
    
    // Find ID by Name (Case insensitive)
    const target = students.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
    
    if (!target) {
      return `Error: Could not find any student named "${name}". Please check the spelling.`;
    }

    const removed = await removeStudent(target.id);
    if (removed) {
       setStudents(prev => prev.filter(s => s.id !== target.id));
       return `Successfully removed student: ${target.name}.`;
    }
    return "Failed to delete student due to a database error.";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      // Define actions object only if teacher is authenticated
      const actions = isTeacherAuthenticated && setStudents ? {
        addStudent: handleToolAddStudent,
        removeStudent: handleToolRemoveStudent
      } : undefined;

      const responseText = await generateSupportResponse(
        messages.map(m => ({ role: m.role, text: m.text })),
        userMsg.text,
        isTeacherAuthenticated ? students : undefined,
        actions
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I encountered an error processing your request. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitted(true);
    // Simulate API call
    setTimeout(() => {
        setTicketForm({ subject: '', category: 'Technical Issue', description: '' });
        setTimeout(() => setTicketSubmitted(false), 3000);
    }, 1500);
  };

  const faqs = [
    { q: "How do I reset my password?", a: "Go to Profile Settings > Security > Change Password. If you are logged out, click 'Forgot Password' on the login screen." },
    { q: "Is the content available offline?", a: "Currently, you need an active internet connection to access the AI Coach and Exams. We are working on an offline mode!" },
    { q: "How is my Originality Score calculated?", a: "We use Gemini AI to analyze your text patterns against common AI-generated structures and known databases." },
    { q: "Can I upgrade my plan?", a: "Yes! Navigate to Settings > Subscription to view our Premium plans for unlimited AI queries." },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LifeBuoy className="text-blue-200" size={32} /> Help & Support Center
            </h1>
            <p className="text-blue-100 mt-2 max-w-xl">
              Need help? Chat with our AI agent for instant answers, or submit a ticket for our human support team.
            </p>
          </div>
          <div className="flex gap-3">
             <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20 text-center min-w-[100px]">
                <p className="text-xs text-blue-200 uppercase font-bold">Avg Wait</p>
                <p className="text-xl font-bold">Instant</p>
             </div>
             <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20 text-center min-w-[100px]">
                <p className="text-xs text-blue-200 uppercase font-bold">Status</p>
                <div className="flex items-center justify-center gap-1">
                   <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                   <p className="text-xl font-bold">Online</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: FAQ & Contact */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
               <h3 className="font-bold text-slate-800 dark:text-slate-100">Frequently Asked Questions</h3>
            </div>
            <div>
              {faqs.map((faq, idx) => (
                <div key={idx} className="border-b dark:border-slate-700 last:border-0">
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{faq.q}</span>
                    {openFaq === idx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {openFaq === idx && (
                    <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm p-6">
             <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Other Ways to Connect</h3>
             <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                   <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><Mail size={20} /></div>
                   <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Email Us</p>
                      <p className="font-medium">support@educlarity.com</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                   <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400"><Phone size={20} /></div>
                   <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Call Us (India)</p>
                      <p className="font-medium">+91 90590 89036</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Interactive Console */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm flex flex-col h-[600px]">
           {/* Console Header/Tabs */}
           <div className="flex border-b dark:border-slate-700">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'chat' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' 
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare size={18} /> AI Assistant
              </button>
              <button 
                onClick={() => setActiveTab('ticket')}
                className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'ticket' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' 
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText size={18} /> Submit Ticket
              </button>
           </div>

           {/* Console Content */}
           <div className="flex-1 overflow-hidden relative">
              
              {/* Chat View */}
              {activeTab === 'chat' && (
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-xl rounded-bl-none flex items-center gap-2">
                                    <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={16} />
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Agent typing...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={isTeacherAuthenticated ? "e.g., Add student Rahul (Grade A), or Delete Arjun" : "Describe your issue..."}
                                className="flex-1 border dark:border-slate-600 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                                disabled={isProcessing}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || isProcessing}
                                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
              )}

              {/* Ticket View */}
              {activeTab === 'ticket' && (
                <div className="h-full p-6 overflow-y-auto">
                    {ticketSubmitted ? (
                        <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ticket Submitted!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">
                                Reference ID: #TRX-{Math.floor(Math.random() * 10000)}<br/>
                                We will get back to you within 24 hours.
                            </p>
                            <button 
                                onClick={() => setTicketSubmitted(false)}
                                className="mt-6 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                            >
                                Submit another ticket
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleTicketSubmit} className="space-y-4 max-w-lg mx-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Issue Category</label>
                                <select 
                                    className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                                    value={ticketForm.category}
                                    onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                                >
                                    <option>Technical Issue</option>
                                    <option>Billing & Subscription</option>
                                    <option>Content Error</option>
                                    <option>Feature Request</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                                    placeholder="Brief summary of the issue"
                                    value={ticketForm.subject}
                                    onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea 
                                    required
                                    className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none bg-white dark:bg-slate-800 dark:text-white"
                                    placeholder="Please provide details about what happened..."
                                    value={ticketForm.description}
                                    onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                                ></textarea>
                            </div>
                            <button 
                                type="submit"
                                className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity"
                            >
                                Submit Ticket
                            </button>
                        </form>
                    )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;