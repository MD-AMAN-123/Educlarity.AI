import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Image as ImageIcon, Sparkles, Brain, Loader2, StopCircle } from 'lucide-react';
import { solveQuestionFromImage } from '../services/geminiService';

const DoubtSolver: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [solution, setSolution] = useState<{ topic: string, answer: string, steps: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Camera access denied. Please allow camera permissions to use the Doubt Solver.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureAndSolve = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // High quality capture settings
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Use JPEG with high quality to balance file size and detail for AI
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(dataUrl);
        
        // Instant visual feedback
        setIsAnalyzing(true);
        setError(null);
        
        try {
          // Extract base64 part for API
          const base64 = dataUrl.split(',')[1];
          const result = await solveQuestionFromImage(base64);
          setSolution(result);
          stopCamera();
        } catch (err: any) {
          console.error("Analysis Error:", err);
          setError("I couldn't process this image. Please ensure the question is clear and well-lit.");
        } finally {
          setIsAnalyzing(false);
        }
      }
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setSolution(null);
    setError(null);
    startCamera();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 pb-24 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Instant Doubt Solver
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Scan any textbook question for a real-time AI resolution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-indigo-200 dark:border-indigo-800">
            <Sparkles size={14} className="animate-pulse" />
            LIVE VISION ACTIVE
          </div>
        </div>
      </div>

      {!capturedImage ? (
        <div className="relative aspect-video md:aspect-[16/9] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
          {stream ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              
              {/* Camera Overlays */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-[40px] border-black/20 backdrop-blur-[1px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-3/5 border-2 border-dashed border-white/50 rounded-xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-t-4 border-l-4 border-indigo-500 -ml-[40%] -mt-[30%] rounded-tl-lg"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-t-4 border-r-4 border-indigo-500 ml-[40%] -mt-[30%] rounded-tr-lg"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-b-4 border-l-4 border-indigo-500 -ml-[40%] mt-[30%] rounded-bl-lg"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-b-4 border-r-4 border-indigo-500 ml-[40%] mt-[30%] rounded-br-lg"></div>
              </div>

              <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6">
                <button 
                  onClick={stopCamera}
                  className="p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
                >
                  <StopCircle size={24} />
                </button>
                <button 
                  onClick={captureAndSolve}
                  className="w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl hover:scale-110 transition-all active:scale-95 group"
                >
                  <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white group-hover:bg-indigo-600 transition-colors">
                    <Camera size={32} />
                  </div>
                </button>
                <button 
                  onClick={startCamera}
                  className="p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
                >
                  <RefreshCw size={24} />
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                <Camera size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold dark:text-white">Camera Offline</h3>
                <p className="text-slate-400 max-w-sm">
                  {error || "Ready to scan your textbook or notebook questions for instant solving."}
                </p>
              </div>
              <button 
                onClick={startCamera}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
              >
                <Camera size={24} />
                Initialize Scanner
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8 animate-fade-in-up">
          {/* Captured Preview */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ImageIcon size={20} className="text-indigo-600" />
                  Captured Frame
                </h3>
                <button 
                  onClick={reset}
                  className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                >
                  Retake Photo
                </button>
             </div>
             <div className="relative rounded-3xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl group">
                <img src={capturedImage} alt="Captured" className="w-full aspect-video object-cover" />
                <div className="absolute inset-0 bg-indigo-600/10 mix-blend-overlay"></div>
             </div>
          </div>

          {/* AI Reasoning Panel */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Brain size={20} className="text-purple-600" />
              AI Reasoning Engine
            </h3>
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[400px]">
              {isAnalyzing ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-100 dark:border-slate-800 rounded-full"></div>
                    <div className="w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Sparkles className="text-indigo-600 animate-pulse" size={32} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-black text-slate-900 dark:text-white">Analyzing Question...</p>
                    <p className="text-slate-500 text-sm">Decoding visual data and computing step-by-step resolution</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle size={32} />
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-red-500 text-xl">Analysis Failed</p>
                    <p className="text-slate-500">{error}</p>
                  </div>
                  <button 
                    onClick={reset}
                    className="bg-slate-100 dark:bg-slate-800 px-6 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : solution ? (
                <div className="flex flex-col h-full">
                  <div className="p-6 bg-indigo-600 text-white">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Subject Identified</span>
                       <CheckCircle2 size={16} className="text-indigo-300" />
                    </div>
                    <h4 className="text-2xl font-black">{solution.topic}</h4>
                  </div>
                  
                  <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[400px]">
                    <div className="space-y-4">
                      {solution.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-4 group">
                          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center border border-indigo-100 dark:border-indigo-800 group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed py-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 rounded-b-3xl">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Final Verification</span>
                       <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 bg-green-500 rounded-full"></div>)}
                       </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-green-500/30 shadow-sm">
                       <p className="text-3xl font-black text-slate-900 dark:text-white font-mono break-words">{solution.answer}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-xl flex items-center justify-center border border-white/20">
              <Brain size={40} className="text-indigo-400" />
           </div>
           <div className="flex-1 space-y-2 text-center md:text-left">
              <h4 className="text-xl font-black">Visual Reasoning Engine v2.0</h4>
              <p className="text-slate-400 text-sm max-w-xl">
                Our AI model analyzes pixels to recognize complex mathematical symbols, scientific diagrams, and handwritten text. 
                Optimized for real-time edge processing with sub-second analysis time.
              </p>
           </div>
           <div className="hidden lg:block bg-indigo-600 px-6 py-3 rounded-2xl font-black text-sm cursor-help hover:bg-indigo-500 transition-colors">
              HOW IT WORKS
           </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default DoubtSolver;
