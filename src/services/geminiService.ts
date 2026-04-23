import { GoogleGenerativeAI } from "@google/generative-ai";
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
   DIRECT BROWSER AI (Primary)
   Uses VITE_GEMINI_API_KEY env var.
   Works in both local dev & production.
================================ */

const getLocalKey = () => {
  try {
    return (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
  } catch {
    return "";
  }
};

const localKey = getLocalKey();
let localGenAI: any = null;
if (localKey && localKey.length > 10) {
  try {
    localGenAI = new GoogleGenerativeAI(localKey);
  } catch (e) {
    console.warn("Local AI Init failed:", e);
  }
}

// Current, working Gemini models only — no deprecated names
const MODEL_PRIORITY = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro"];

/* ===============================
   HELPERS
================================ */

async function callDirectGenerate(prompt: string): Promise<string> {
  if (!localGenAI) throw new Error("No Gemini API key found. Set VITE_GEMINI_API_KEY.");
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = localGenAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      console.warn(`[Direct] Model ${modelName} failed:`, err.message);
      if (modelName === MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) throw err;
    }
  }
  throw new Error("All direct AI models failed.");
}

async function callDirectChat(
  history: { role: string; parts: { text: string }[] }[],
  message: string
): Promise<string> {
  if (!localGenAI) throw new Error("No Gemini API key found. Set VITE_GEMINI_API_KEY.");
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = localGenAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (err: any) {
      console.warn(`[Direct Chat] Model ${modelName} failed:`, err.message);
      if (modelName === MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) throw err;
    }
  }
  throw new Error("All direct chat models failed.");
}

/* ===============================
   BACKEND PROXY (Vercel Fallback)
================================ */

async function callAIBackend(task: string, payload: any): Promise<any> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, payload })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network Error' }));
    throw new Error(err.error || 'Backend proxy error');
  }
  return response.json();
}

/* ===============================
   RESILIENT CALLER
   1. Try direct browser AI (local key)
   2. Fall back to Vercel backend proxy
================================ */

async function callGenerate(prompt: string, backendTask?: string, backendPayload?: any): Promise<string> {
  // Try direct first
  try {
    return await callDirectGenerate(prompt);
  } catch (directErr: any) {
    console.warn("Direct generate failed, trying backend proxy:", directErr.message);
  }
  // Fallback: backend proxy
  const data = await callAIBackend(backendTask || 'generate', backendPayload || { prompt });
  return data.text;
}

async function callChat(
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  backendTask?: string
): Promise<string> {
  // Try direct first
  try {
    return await callDirectChat(history, message);
  } catch (directErr: any) {
    console.warn("Direct chat failed, trying backend proxy:", directErr.message);
  }
  // Fallback: backend proxy
  const data = await callAIBackend(backendTask || 'coach', { history, message });
  return data.text;
}

/* ===============================
   JSON SAFE PARSER
================================ */

export function safeParse<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    let cleanText = text;
    if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      cleanText = text.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = text.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleanText) as T;
  } catch {
    console.error("Failed to parse AI response as JSON:", text);
    return fallback;
  }
}

/* ===============================
   COACH
================================ */

export async function generateCoachResponse(
  history: { role: string; text: string }[],
  currentMessage: string,
  mode: CoachMode,
  language: Language,
  audioBase64?: string,
  bot?: StudyBot
): Promise<{ text: string }> {
  const systemPrompt = bot
    ? `You are "${bot.name}", specializing in ${bot.subject}. Personality: ${bot.personality}. Respond in ${language}.`
    : `You are "EduClarity AI", a conceptual coach. Mode: ${mode}. Language: ${language}. Use the Socratic method. Be concise but thorough.`;

  const formattedHistory = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood. I am EduClarity AI, your conceptual coach. How can I help you today?" }] },
    ...history.map(h => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }]
    }))
  ];

  try {
    const text = await callChat(formattedHistory, currentMessage, 'coach');
    return { text };
  } catch (err: any) {
    console.error("generateCoachResponse error:", err);
    return { text: "I'm having trouble connecting right now. Please check your internet connection and try again." };
  }
}

/* ===============================
   SUPPORT
================================ */

export async function generateSupportResponse(
  history: { role: string; text: string }[],
  message: string,
  students?: Student[],
  actions?: {
    addStudent: (data: any) => Promise<string>;
    removeStudent: (name: string) => Promise<string>;
  }
): Promise<string> {
  try {
    const studentList = students
      ? students.map(s => `- ${s.name} (ID: ${s.id}, Grade: ${s.grade})`).join('\n')
      : "No students listed.";
    const systemPrompt = `You are the EduClarity Support Bot. Student Data:\n${studentList}`;
    const formattedHistory = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I am ready to assist." }] },
      ...history.map(h => ({
        role: h.role === "model" ? "model" : "user",
        parts: [{ text: h.text }]
      }))
    ];
    return await callChat(formattedHistory, message, 'support');
  } catch {
    return "Support unavailable. Please try again.";
  }
}

/* ===============================
   LEARNING PATH
================================ */

export async function generateLearningPath(subject: string): Promise<LearningNode[]> {
  const fallbackPath: LearningNode[] = [
    { id: '1', title: `Basics of ${subject}`, description: 'Fundamentals and core concepts.', status: 'IN_PROGRESS', difficulty: 'Beginner', rationale: 'Every journey starts with a strong foundation.' }
  ];

  const prompt = `Create an 8-milestone learning roadmap for the subject: "${subject}".
Return ONLY a valid JSON array. No markdown, no code blocks, no explanatory text outside JSON.
Each object must have exactly these fields:
[
  {
    "id": "1",
    "title": "Short topic title",
    "description": "2-3 sentence description of what the learner will study.",
    "status": "UNLOCKED",
    "difficulty": "Beginner",
    "rationale": "One sentence explaining why this milestone comes at this stage."
  }
]
Rules:
- id: string number from "1" to "8"
- status: one of "MASTERED", "IN_PROGRESS", "UNLOCKED", "LOCKED"
- difficulty: one of "Beginner", "Intermediate", "Advanced"
- Return exactly 8 nodes in logical learning order
- Return ONLY the JSON array, nothing else`;

  try {
    const text = await callGenerate(prompt, 'roadmap', { prompt });
    const nodes = safeParse<LearningNode[]>(text, []);
    return nodes.length > 0 ? nodes : fallbackPath;
  } catch (err) {
    console.error("generateLearningPath error:", err);
    return fallbackPath;
  }
}

/* ===============================
   QUIZ
================================ */

export async function generateQuiz(topic: string, difficulty: string): Promise<QuizQuestion[]> {
  const prompt = `Generate a 5-question multiple choice quiz about "${topic}" at ${difficulty} difficulty level.
Return ONLY a valid JSON array. No markdown, no code blocks, no text outside JSON.
Use this exact structure:
[
  {
    "id": 1,
    "question": "Full question text here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswerIndex": 0,
    "explanation": "Clear explanation of why this is correct."
  }
]
Rules:
- id: number starting from 1
- options: exactly 4 choices
- correctAnswerIndex: 0-based index (0, 1, 2, or 3)
- Return exactly 5 questions
- Return ONLY the JSON array`;

  try {
    const text = await callGenerate(prompt, 'quiz', { prompt });
    const questions = safeParse<QuizQuestion[]>(text, []);
    return questions;
  } catch (err) {
    console.error("generateQuiz error:", err);
    return [];
  }
}

/* ===============================
   DOUBT SOLVER (VISION)
================================ */

export async function solveQuestionFromImage(
  base64Image: string
): Promise<{ topic: string, answer: string, steps: string[] }> {
  const fallback = { topic: "Analysis", answer: "Failed to analyze image.", steps: ["Please try again with a clearer image."] };
  try {
    if (localGenAI) {
      for (const modelName of MODEL_PRIORITY) {
        try {
          const model = localGenAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([
            "Solve this question shown in the image. Return ONLY valid JSON with no markdown: {\"topic\": \"...\", \"answer\": \"...\", \"steps\": [\"step1\", \"step2\"]}",
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
          ]);
          return safeParse(result.response.text(), fallback);
        } catch (e: any) {
          console.warn(`Vision model ${modelName} failed:`, e.message);
          if (modelName === MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) break;
        }
      }
    }
    // Fallback to backend
    const data = await callAIBackend('vision', {
      prompt: "Solve this question from the image. Return ONLY valid JSON: {topic, answer, steps[]}",
      image: base64Image
    });
    return safeParse(data.text, fallback);
  } catch {
    return fallback;
  }
}

/* ===============================
   DASHBOARD & TEACHER INSIGHTS
================================ */

export async function generateTeacherInsights(dataStr: string): Promise<TeacherInsight[]> {
  const prompt = `Analyze this student performance data and return actionable teaching insights: ${dataStr}
Return ONLY a valid JSON array: [{"topic":"topic name","avgScore":75,"difficultyLevel":"Intermediate","recommendation":"Action to take"}]`;
  try {
    const text = await callGenerate(prompt, 'insights', { prompt });
    return safeParse<TeacherInsight[]>(text, []);
  } catch { return []; }
}

export async function generateDashboardInsights(userName: string, stats: DashboardStats): Promise<AIInsight[]> {
  const prompt = `Generate 3 personalized AI learning insights for student "${userName}" based on these statistics: ${JSON.stringify(stats)}.
Return ONLY a valid JSON array: [{"title":"Short title","description":"2-sentence insight.","type":"info"}]
Valid type values: "success", "warning", "info". Return exactly 3 items.`;
  try {
    const text = await callGenerate(prompt, 'insights', { prompt });
    return safeParse<AIInsight[]>(text, []);
  } catch { return []; }
}

/* ===============================
   UTILITIES
================================ */

export async function generateVisualAid(topic: string): Promise<string | undefined> {
  const prompt = `Explain the concept of "${topic}" in a clear, educational way.
Use ASCII diagrams, structured bullet points, or simple analogies to make it visual.
Keep the explanation concise (under 300 words) and suitable for students.`;
  try {
    return await callGenerate(prompt, 'visual', { prompt });
  } catch { return undefined; }
}

export async function checkOriginality(submission: string): Promise<{ score: number, analysis: string }> {
  const prompt = `Analyze the following student submission for originality, critical thinking, and whether it appears to be AI-generated or plagiarized.

Student submission:
"${submission.substring(0, 2000)}"

Return ONLY a valid JSON object with no markdown or code blocks:
{"score": 85, "analysis": "Your detailed 2-3 sentence analysis here."}

Scoring guide:
- 90-100: Highly original, clear personal voice, strong critical thinking
- 70-89: Mostly original with some generic phrases
- 50-69: Mixed originality, possibly some AI assistance
- 0-49: Likely AI-generated or plagiarized

Return ONLY the JSON object.`;
  try {
    const text = await callGenerate(prompt, 'originality', { prompt });
    return safeParse(text, { score: 0, analysis: "Unable to analyze at this time." });
  } catch { return { score: 0, analysis: "Analysis service unavailable. Please try again." }; }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateAssignment(topic: string): Promise<Assignment | null> {
  const prompt = `Create a detailed student assignment on the topic: "${topic}".
Return ONLY a valid JSON object with no markdown or code blocks:
{
  "title": "Assignment title",
  "deadline": "Due in 1 week",
  "tasks": ["Task 1 description", "Task 2 description", "Task 3 description", "Task 4 description"]
}`;
  try {
    const text = await callGenerate(prompt, 'assignment', { prompt });
    return safeParse<Assignment>(text, null as unknown as Assignment);
  } catch (err) {
    console.error("generateAssignment error:", err);
    return null;
  }
}
