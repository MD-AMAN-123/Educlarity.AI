import React, { useState } from 'react';
import { generateLearningPath } from '../services/geminiService';
import { LearningNode, AppView } from '../types';
import { Map, Lock, Unlock, CheckCircle, PlayCircle, Loader2, Info } from 'lucide-react';

interface LearningPathProps {
  onNavigate: (view: AppView, topic?: string) => void;
}

const LearningPath: React.FC<LearningPathProps> = ({ onNavigate }) => {
  const [subject, setSubject] = useState('');
  const [nodes, setNodes] = useState<LearningNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<LearningNode | null>(null);

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setLoading(true);
    setNodes([]);
    setSelectedNode(null);
    const path = await generateLearningPath(subject);
    setNodes(path);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12 animate-fade-in pb-32">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border dark:border-slate-700 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Map size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <Map size={24} />
            </div>
            AI Learning Roadmap
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xl">
            Our neural engine maps your knowledge graph. Enter a subject to generate your personalized path to mastery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics, Data Science, Guitar..."
              className="flex-1 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !subject}
              className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Build My Path'}
            </button>
          </div>
        </div>
      </div>

      {nodes.length > 0 && (
        <div className="relative pt-10 px-4">
          {/* S-curve connector line (simplified) */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 z-0 hidden md:block"></div>

          <div className="space-y-16 relative z-10">
            {nodes.map((node, index) => {
              const IsEven = index % 2 === 0;
              return (
                <div 
                  key={index} 
                  className={`flex flex-col md:flex-row items-center gap-8 ${IsEven ? 'md:flex-row' : 'md:flex-row-reverse text-right'}`}
                >
                  {/* Node Icon */}
                  <div className="relative">
                    <div className={`
                      w-24 h-24 rounded-full flex items-center justify-center border-8 transition-all duration-500 shadow-xl
                      ${node.status === 'MASTERED' ? 'bg-green-500 border-green-100 dark:border-green-900/30 text-white' : ''}
                      ${node.status === 'IN_PROGRESS' ? 'bg-blue-500 border-blue-100 dark:border-blue-900/30 text-white animate-pulse' : ''}
                      ${node.status === 'UNLOCKED' ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/30 text-white' : ''}
                      ${node.status === 'LOCKED' ? 'bg-slate-200 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400' : ''}
                    `}>
                      {node.status === 'MASTERED' && <CheckCircle size={40} />}
                      {node.status === 'IN_PROGRESS' && <PlayCircle size={40} />}
                      {node.status === 'UNLOCKED' && <Unlock size={40} />}
                      {node.status === 'LOCKED' && <Lock size={40} />}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border dark:border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                      Level {index + 1}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div
                    className={`
                      flex-1 w-full max-w-sm bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-lg cursor-pointer transition-all hover:scale-105 hover:shadow-2xl
                      ${selectedNode?.id === node.id ? 'ring-4 ring-indigo-500/20 md:ring-8' : ''}
                    `}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div className={`flex flex-col ${!IsEven ? 'md:items-end' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                           ${node.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                           ${node.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                           ${node.difficulty === 'Advanced' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                        `}>
                          {node.difficulty}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{node.title}</h3>
                    </div>
                    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 ${!IsEven ? 'md:text-right' : ''}`}>
                      {node.description}
                    </p>

                    {selectedNode?.id === node.id && (
                      <div className="mt-6 pt-6 border-t dark:border-slate-700 animate-fade-in">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl mb-6">
                           <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                            <Info size={14} /> AI Context
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                            "{node.rationale}"
                          </p>
                        </div>
                        <div className={`flex gap-3 ${!IsEven ? 'md:justify-end' : ''}`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(AppView.CONCEPT_COACH, node.title);
                            }}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-95"
                          >
                            Learn
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(AppView.EXAM_ARENA, node.title);
                            }}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                          >
                            Quiz
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPath;