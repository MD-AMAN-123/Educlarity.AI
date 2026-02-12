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
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
       <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Map className="text-indigo-600" /> Adaptive Learning Path
        </h2>
        <p className="text-slate-600 mb-4">
          Educlarity analyzes your weak areas and dynamically adjusts your curriculum.
        </p>
        <div className="flex gap-4">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter any topic (e.g. Guitar, French, Physics, MBA)..."
            className="flex-1 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !subject}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Path'}
          </button>
        </div>
      </div>

      {nodes.length > 0 && (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-200 z-0"></div>

          <div className="space-y-8 relative z-10">
            {nodes.map((node, index) => (
              <div key={index} className="flex gap-6">
                {/* Icon Marker */}
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center border-4 bg-white shrink-0
                  ${node.status === 'MASTERED' ? 'border-green-500 text-green-500' : ''}
                  ${node.status === 'IN_PROGRESS' ? 'border-blue-500 text-blue-500' : ''}
                  ${node.status === 'UNLOCKED' ? 'border-indigo-500 text-indigo-500' : ''}
                  ${node.status === 'LOCKED' ? 'border-slate-300 text-slate-300' : ''}
                `}>
                  {node.status === 'MASTERED' && <CheckCircle size={28} />}
                  {node.status === 'IN_PROGRESS' && <PlayCircle size={28} />}
                  {node.status === 'UNLOCKED' && <Unlock size={28} />}
                  {node.status === 'LOCKED' && <Lock size={28} />}
                </div>

                {/* Card */}
                <div 
                  className={`flex-1 bg-white p-6 rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedNode?.id === node.id ? 'ring-2 ring-indigo-500' : ''}`}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-800">{node.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded font-bold
                       ${node.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' : ''}
                       ${node.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' : ''}
                       ${node.difficulty === 'Advanced' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {node.difficulty}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-2">{node.description}</p>
                  
                  {selectedNode?.id === node.id && (
                     <div className="mt-4 pt-4 border-t bg-slate-50 p-4 rounded-lg">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-2">
                           <Info size={16} /> Why this topic? (Explainable AI)
                        </h4>
                        <p className="text-sm text-slate-700 italic">"{node.rationale}"</p>
                        <div className="mt-4 flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(AppView.CONCEPT_COACH, node.title);
                            }}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                          >
                            Start Lesson
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(AppView.EXAM_ARENA, node.title);
                            }}
                            className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg text-sm hover:bg-indigo-50 transition-colors font-medium"
                          >
                            Take Quiz
                          </button>
                        </div>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPath;