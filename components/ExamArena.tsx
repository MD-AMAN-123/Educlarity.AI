import React, { useState, useEffect, useRef } from 'react';
import { generateQuiz, checkOriginality } from '../services/geminiService';
import { QuizQuestion } from '../types';
import { Loader2, Check, X, AlertTriangle, BookOpen } from 'lucide-react';

interface ExamArenaProps {
  initialTopic?: string;
  onClearTopic?: () => void;
}

const ExamArena: React.FC<ExamArenaProps> = ({ initialTopic, onClearTopic }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Responsible AI: Anti-cheat Essay area
  const [essayText, setEssayText] = useState('');
  const [originalityResult, setOriginalityResult] = useState<{ score: number, analysis: string } | null>(null);
  const [checkingOriginality, setCheckingOriginality] = useState(false);

  const hasInitializedRef = useRef(false);

  // Auto-generate quiz if topic is passed via navigation
  useEffect(() => {
    if (initialTopic && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setTopic(initialTopic);
      generateQuizInternal(initialTopic);
      if (onClearTopic) onClearTopic();
    }
  }, [initialTopic, onClearTopic]);

  const [timeLeft, setTimeLeft] = useState(600);
  const [totalTime] = useState(600);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let timer: any;
    if (timerActive && timeLeft > 0 && !submitted) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setSubmitted(true);
      setTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft, submitted]);

  const generateQuizInternal = async (topicStr: string) => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    setTimerActive(false);
    setTimeLeft(totalTime);
    setQuiz([]);

    try {
      let questions: QuizQuestion[] = [];
      if (navigator.onLine) {
        questions = await generateQuiz(topicStr, 'Medium');
      } else {
        const { offlineAIService } = await import('../services/offlineAiService');
        const prompt = `Generate 5 challenging multiple choice questions for the topic: ${topicStr}. Provide response in this exact JSON format: [{"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0, "explanation": "..."}]`;
        const response = await offlineAIService.generateResponse([
          { role: 'system', content: 'You are a quiz master. Create challenging educational quizzes. Output ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ]);
        
        // Robust JSON parsing
        const jsonMatch = response.match(/\[.*\]/s);
        const jsonStr = jsonMatch ? jsonMatch[0] : response;
        questions = JSON.parse(jsonStr);
      }

      if (questions && questions.length > 0) {
        setQuiz(questions);
        setError(null);
        setTimerActive(true);
      } else {
        setError("Failed to generate quiz questions.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate quiz. Check your connection or AI model status.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic) return;
    await generateQuizInternal(topic);
  };

  const handleOptionSelect = (qId: number, optIdx: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimerActive(false);
  };

  const handleOriginalityCheck = async () => {
    if (!essayText) return;
    setCheckingOriginality(true);
    const res = await checkOriginality(essayText);
    setOriginalityResult(res);
    setCheckingOriginality(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-1 flex items-center gap-2">
          <BookOpen className="text-indigo-600" /> EduFree Adaptive Quizzes
        </h2>
        <p className="text-xs text-slate-500 mb-4">Difficulty adjusts based on your performance in real-time.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic (e.g. Organic Chemistry, Indian History)..."
            className="flex-1 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-2xl px-6 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !topic}
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Start Assessment'}
          </button>
        </div>
      </div>

      {quiz.length > 0 && (
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col gap-2">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Time Remaining:</span>
                <span className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500">
                {quiz.filter((q, i) => answers[q.id] !== undefined).length} / {quiz.length} Answered
              </div>
           </div>
           <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${timeLeft < 60 ? 'bg-red-500' : 'bg-indigo-600'}`}
                style={{ width: `${(timeLeft / totalTime) * 100}%` }}
              ></div>
           </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-shake">
          <AlertTriangle size={20} />
          <p className="text-sm font-bold">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline font-bold">Dismiss</button>
        </div>
      )}

      {loading && quiz.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 opacity-50"></div>
          <div className="relative flex flex-col items-center">
            <Loader2 className="animate-spin text-indigo-600 mb-6" size={60} />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Curating Your Assessment</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">EduFree AI is synthesizing questions for "{topic}"</p>
            <div className="mt-8 flex gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      )}

      {!loading && quiz.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <BookOpen size={48} className="mb-4 opacity-20" />
          <p>Enter a topic above to begin your real-time assessment</p>
        </div>
      )}

      {quiz.length > 0 && (
        <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {loading && (
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center justify-between text-indigo-700 text-sm animate-pulse">
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={16} />
                Updating quiz content in real-time...
              </div>
              <span className="text-[10px] font-bold bg-indigo-200 px-2 py-0.5 rounded uppercase">On-Device Processing</span>
            </div>
          )}

          {quiz.map((q, idx) => {
            const isCorrect = answers[q.id] === q.correctAnswerIndex;
            const userAnswer = answers[q.id];

            return (
              <div key={q.id} className="bg-white p-6 rounded-xl border shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Q{idx + 1}. {q.question}</h3>
                  {submitted && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      onClick={() => handleOptionSelect(q.id, oIdx)}
                      className={`
                        p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors
                        ${!submitted && userAnswer === oIdx ? 'bg-indigo-50 border-indigo-500' : ''}
                        ${!submitted && userAnswer !== oIdx ? 'hover:bg-slate-50' : ''}
                        ${submitted && q.correctAnswerIndex === oIdx ? 'bg-green-50 border-green-500' : ''}
                        ${submitted && userAnswer === oIdx && userAnswer !== q.correctAnswerIndex ? 'bg-red-50 border-red-500' : ''}
                      `}
                    >
                      <span className="text-slate-700">{opt}</span>
                      {submitted && q.correctAnswerIndex === oIdx && <Check size={18} className="text-green-600" />}
                      {submitted && userAnswer === oIdx && userAnswer !== q.correctAnswerIndex && <X size={18} className="text-red-600" />}
                    </div>
                  ))}
                </div>

                {submitted && q.explanation && (
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {!submitted && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg hover:shadow-green-200 transition-all"
              >
                Submit Test
              </button>
            </div>
          )}
        </div>
      )}

      {/* Responsible AI Section */}
      <div className="mt-12 pt-8 border-t">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-orange-500" /> Responsible AI Check
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">Essay / Answer Originality Checker</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Paste your essay here to check for AI plagiarism or citation needs..."
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
            ></textarea>
            <button
              onClick={handleOriginalityCheck}
              disabled={checkingOriginality || !essayText}
              className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900"
            >
              {checkingOriginality ? 'Analyzing...' : 'Check Originality'}
            </button>
          </div>

          {originalityResult && (
            <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: originalityResult.score > 80 ? '#10b981' : '#f59e0b' }}>
                  {originalityResult.score}/100
                </div>
                <p className="text-sm text-slate-500 uppercase tracking-wide font-bold">Originality Score</p>
              </div>
              <div className="mt-4 bg-slate-50 p-3 rounded text-sm text-slate-700">
                {originalityResult.analysis}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamArena;