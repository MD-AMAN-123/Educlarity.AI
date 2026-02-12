import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Play, Square, Loader2, Volume2, Globe, Image as ImageIcon } from 'lucide-react';
import { CoachMode, ChatMessage, Language } from '../types';
import { generateCoachResponse, blobToBase64, generateVisualAid } from '../services/geminiService';

interface ConceptCoachProps {
  initialTopic?: string;
  onClearTopic?: () => void;
}

const ConceptCoach: React.FC<ConceptCoachProps> = ({ initialTopic, onClearTopic }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am Educlarity. How can I help you learn today?',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [mode, setMode] = useState<CoachMode>(CoachMode.LEARNING);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGeneratingImage]);

  // Auto-start revision if a topic is passed
  useEffect(() => {
    if (initialTopic && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const prompt = `I need to revise ${initialTopic}. Please give me a quick summary and ask me a conceptual question to check my understanding.`;
      handleSendMessage(prompt);
      if (onClearTopic) onClearTopic();
    }
  }, [initialTopic]);

  const handleSendMessage = async (text: string, audioBase64?: string) => {
    if (!text && !audioBase64) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text || (audioBase64 ? '(Voice Input)' : ''),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    setInputText('');

    try {
      // API Call
      const response = await generateCoachResponse(
        messages.map(m => ({ role: m.role, text: m.text })),
        text || "Process this audio",
        mode,
        language,
        audioBase64
      );

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        audioData: response.audioBase64,
        isAudio: !!response.audioBase64,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiMsg]);

      // Auto-play audio if present
      if (response.audioBase64) {
        playAudio(response.audioBase64);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVisual = async () => {
    const lastContext = messages[messages.length - 1].text;
    if (!lastContext) return;

    setIsGeneratingImage(true);
    // Add a placeholder message
    const placeholderId = 'generating-image';
    
    try {
      const imageData = await generateVisualAid(lastContext.substring(0, 100)); // pass simplified topic
      if (imageData) {
        const visualMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'model',
          text: 'Here is a visual aid to help you understand better:',
          imageData: imageData,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, visualMsg]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // or audio/webm
        const base64 = await blobToBase64(audioBlob);
        handleSendMessage('', base64);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is needed for voice features.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playAudio = (base64: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64}`); // Gemini TTS returns MP3 usually, or check header
    audio.play();
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen flex flex-col bg-slate-50 dark:bg-slate-950 relative">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shadow-sm">
        <div>
           <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
             <Globe className="w-5 h-5 text-indigo-500" />
             AI Concept Coach
           </h2>
           <p className="text-xs text-slate-500 dark:text-slate-400">Adaptive learning for {language}</p>
        </div>
        
        <div className="flex gap-2 text-sm">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="border dark:border-slate-700 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.values(Language).map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex">
            <button
              onClick={() => setMode(CoachMode.LEARNING)}
              className={`px-3 py-1 rounded-md transition-all ${mode === CoachMode.LEARNING ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Learning
            </button>
            <button
              onClick={() => setMode(CoachMode.ANSWER)}
              className={`px-3 py-1 rounded-md transition-all ${mode === CoachMode.ANSWER ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Answer
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
             <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
               msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border dark:border-slate-700 rounded-bl-none'
             }`}>
               {msg.text && <p className="leading-relaxed whitespace-pre-wrap" dir="auto">{msg.text}</p>}
               
               {msg.imageData && (
                 <div className="mt-3">
                   <img 
                      src={`data:image/png;base64,${msg.imageData}`} 
                      alt="Visual Aid" 
                      className="rounded-lg border dark:border-slate-600 shadow-sm w-full h-auto"
                   />
                 </div>
               )}

               {msg.isAudio && msg.audioData && (
                 <button 
                  onClick={() => playAudio(msg.audioData!)}
                  className="mt-2 flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors w-fit"
                 >
                   <Volume2 size={14} /> Play Voice Response
                 </button>
               )}
             </div>
             
             {/* Visual Aid Trigger */}
             {msg.role === 'model' && !msg.imageData && !msg.isAudio && (
               <button 
                onClick={handleGenerateVisual}
                className="mt-1 ml-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
               >
                 <ImageIcon size={12} /> Visualize this
               </button>
             )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none shadow-sm border dark:border-slate-700 flex items-center gap-2">
              <Loader2 className="animate-spin text-indigo-500" size={18} />
              <span className="text-slate-500 dark:text-slate-400 text-sm">Educlarity is thinking...</span>
            </div>
          </div>
        )}
        {isGeneratingImage && (
           <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none shadow-sm border dark:border-slate-700 flex items-center gap-2">
              <Loader2 className="animate-spin text-purple-500" size={18} />
              <span className="text-slate-500 dark:text-slate-400 text-sm">Generating diagram...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
        <div className="max-w-4xl mx-auto relative flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
            placeholder={isRecording ? "Listening..." : "Ask a doubt, request a quiz, or simplify a topic..."}
            className="flex-1 border dark:border-slate-700 rounded-full px-5 py-3 pr-12 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            disabled={isRecording || isProcessing || isGeneratingImage}
          />
          
          {/* Recording Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`absolute right-14 p-2 rounded-full transition-colors ${
              isRecording ? 'text-red-500 hover:bg-red-50 animate-pulse' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
          </button>

          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={(!inputText.trim() && !isRecording) || isProcessing || isGeneratingImage}
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-indigo-200 dark:hover:shadow-none"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2">
          AI can make mistakes. Check important info. Educlarity supports Hindi, English & regional nuances.
        </p>
      </div>
    </div>
  );
};

export default ConceptCoach;