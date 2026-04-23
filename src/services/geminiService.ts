import type {
  CoachMode,
  Language,
  QuizQuestion,
  LearningNode,
  TeacherInsight,
  Student,
  StudyBot,
  AIInsight,
  DashboardStats,
  Assignment
} from "../types";

/* ===============================
   BACKEND AI PROXY
   All requests now go through /api/ai
   to keep your API key secure.
================================ */

const API_ENDPOINT = "/api/ai";

async function callAIBackend(task: string, payload: any) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || "Backend AI failed");
  }

  return response.json();
}

/**
 * STREAMING HELPER
 */
async function streamAIBackend(payload: any, onChunk: (text: string) => void) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: "stream", payload: { ...payload, stream: true } }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Streaming failed" }));
    throw new Error(errorData.error || "Backend streaming failed");
  }

  const reader = response.body?.getReader();
  const textDecoder = new TextDecoder();
  
  if (!reader) throw new Error("ReadableStream not supported");

  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = textDecoder.decode(value);
    fullText += chunk;
    onChunk(fullText);
  }
}

/* ===============================
   PUBLIC API
================================ */

export async function streamCoachResponse(
  history: { role: string; text: string }[],
  currentMessage: string,
  mode: CoachMode,
  language: Language,
  onChunk: (text: string) => void,
  bot?: StudyBot,
  audioBase64?: string
): Promise<void> {
  const systemPrompt = bot
    ? `You are "${bot.name}", specializing in ${bot.subject}. Personality: ${bot.personality}. Respond in ${language}.`
    : `You are "EduClarity AI", a conceptual coach. Mode: ${mode}. Language: ${language}. Use the Socratic method. Be concise but thorough.`;

  const contents: any[] = [
    { role: 'user', parts: [{ text: "Context: " + systemPrompt }] },
    { role: 'model', parts: [{ text: "Understood. I will act as your coach now." }] }
  ];

  history.slice(-4).forEach(h => {
    const role = h.role === 'model' ? 'model' : 'user';
    if (contents.length > 0 && contents[contents.length - 1].role !== role) {
      contents.push({ role, parts: [{ text: h.text }] });
    }
  });

  if (contents[contents.length - 1].role === 'user') {
    contents.push({ role: 'model', parts: [{ text: "Please continue." }] });
  }

  const userParts: any[] = [{ text: currentMessage }];
  if (audioBase64) {
    userParts.push({ inlineData: { data: audioBase64, mimeType: "audio/webm" } });
  }
  contents.push({ role: 'user', parts: userParts });

  await streamAIBackend({ contents, systemInstruction: systemPrompt }, onChunk);
}

export async function generateCoachResponse(
  history: { role: string; text: string }[],
  currentMessage: string,
  mode: CoachMode,
  language: Language,
  audioBase64?: string,
  bot?: StudyBot
): Promise<{ text: string }> {
  const systemPrompt = bot
    ? `You are "${bot.name}", specializing in ${bot.subject}. Personality: ${bot.personality}.`
    : `Conceptual coach. Mode: ${mode}. Language: ${language}.`;

  const contents: any[] = [];
  history.slice(-4).forEach(h => contents.push({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] }));
  contents.push({ role: 'user', parts: [{ text: currentMessage }] });

  return await callAIBackend('coach', { contents, systemInstruction: systemPrompt });
}

// DOUBT SOLVER
export async function solveQuestionFromImage(image: string): Promise<{ topic: string, answer: string, steps: string[] }> {
  const res = await callAIBackend('vision', { 
    prompt: "Analyze this educational question. Provide the Topic, a clear Answer, and Step-by-step reasoning in JSON format: { \"topic\": \"...\", \"answer\": \"...\", \"steps\": [\"...\", \"...\"] }", 
    image 
  });
  return JSON.parse(res.text);
}

// LEARNING PATH
export async function generateLearningPath(topic: string): Promise<LearningNode[]> {
  const res = await callAIBackend('roadmap', { 
    prompt: `Generate a detailed learning roadmap for "${topic}" in JSON format. Ensure nodes are educational milestones. [{ "id": "1", "label": "...", "description": "...", "type": "theory", "status": "unlocked" }]` 
  });
  return JSON.parse(res.text);
}

// EXAM ARENA
export async function generateQuiz(topic: string): Promise<QuizQuestion[]> {
  const res = await callAIBackend('quiz', { 
    prompt: `Generate 5 high-quality multiple choice questions for "${topic}" in JSON format: [{ "id": 1, "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0, "explanation": "..." }]` 
  });
  return JSON.parse(res.text);
}

export async function checkOriginality(text: string): Promise<{ score: number, analysis: string }> {
  const res = await callAIBackend('originality', { 
    prompt: `Analyze this essay for AI patterns and potential plagiarism. Return JSON: { "score": 85, "analysis": "Detailed analysis text..." }. Essay: ${text}` 
  });
  return JSON.parse(res.text);
}

// UTILS
export const generateVisualAid = async (topic: string): Promise<string | null> => {
  const res = await callAIBackend('visual', { prompt: `Describe a simple SVG illustration for ${topic}.` });
  return res.text;
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
