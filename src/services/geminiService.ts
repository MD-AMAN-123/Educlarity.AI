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
   SAFE ENV (For Local Fallback)
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

const MODEL_PRIORITY = ["gemini-1.5-flash", "gemini-1.5-flash-latest"];

/* ===============================
   SECURE BACKEND PROXY
================================ */

async function callAIBackend(task: string, payload: any): Promise<any> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, payload })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Backend Error');
    }

    return await response.json();
  } catch (error: any) {
    console.error(`AI Proxy Error (${task}):`, error);
    throw error;
  }
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
    : `You are "EduClarity AI", a conceptual coach. Mode: ${mode}. Language: ${language}. Use the Socratic method.`;

  const formattedHistory = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood. I am EduClarity AI, your conceptual coach." }] },
    ...history.map(h => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }]
    }))
  ];

  try {
    const data = await callAIBackend('coach', {
      history: formattedHistory,
      message: currentMessage
    });
    return { text: data.text };
  } catch (err: any) {
    // FALLBACK TO LOCAL IF BACKEND FAILS
    if (localGenAI) {
      for (const modelName of MODEL_PRIORITY) {
        try {
          const aiModel = localGenAI.getGenerativeModel({ model: modelName });
          const chat = aiModel.startChat({ history: formattedHistory });
          const result = await chat.sendMessage(currentMessage);
          return { text: result.response.text() };
        } catch (fallbackErr: any) {
          console.warn(`Local model ${modelName} failed:`, fallbackErr);
          if (modelName === MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
            return { text: `Local Error: All models failed. ${fallbackErr.message}` };
          }
          continue;
        }
      }
    }
    return { text: `Connectivity Error: ${err.message}` };
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

    const systemPrompt = `You are the EduClarity Support Bot. Student Data: ${studentList}`;

    const formattedHistory = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood." }] },
      ...history.map(h => ({
        role: h.role === "model" ? "model" : "user",
        parts: [{ text: h.text }]
      }))
    ];

    const data = await callAIBackend('support', {
      history: formattedHistory,
      message: message
    });

    return data.text;
  } catch {
    return "Support unavailable.";
  }
}

/* ===============================
   LEARNING PATH
================================ */

export async function generateLearningPath(
  subject: string
): Promise<LearningNode[]> {
  const prompt = `Create an 8-milestone roadmap for "${subject}" as JSON array.`;
  const fallbackPath: LearningNode[] = [{ id: '1', title: `Basics of ${subject}`, description: 'Fundamentals.', status: 'IN_PROGRESS', difficulty: 'Beginner', rationale: 'Foundation.' }];

  try {
    const data = await callAIBackend('roadmap', { prompt });
    const nodes = safeParse<LearningNode[]>(data.text, []);
    return nodes.length > 0 ? nodes : fallbackPath;
  } catch {
    return fallbackPath;
  }
}

/* ===============================
   QUIZ
================================ */

export async function generateQuiz(
  topic: string,
  difficulty: string
): Promise<QuizQuestion[]> {
  const prompt = `Generate a 5-question multiple choice quiz about "${topic}" (difficulty: ${difficulty}). Return JSON array.`;
  try {
    const data = await callAIBackend('quiz', { prompt });
    return safeParse<QuizQuestion[]>(data.text, []);
  } catch {
    return [];
  }
}

/* ===============================
   DOUBT SOLVER (VISION)
================================ */

export async function solveQuestionFromImage(
  base64Image: string
): Promise<{ topic: string, answer: string, steps: string[] }> {
  const fallback = { topic: "Analysis", answer: "Failed to solve.", steps: ["Try again."] };
  try {
    const prompt = `Solve this question from image. Return JSON: {topic, answer, steps[]}`;
    const data = await callAIBackend('vision', { prompt, image: base64Image });
    return safeParse(data.text, fallback);
  } catch {
    return fallback;
  }
}

/* ===============================
   DASHBOARD & TEACHER INSIGHTS
================================ */

export async function generateTeacherInsights(dataStr: string): Promise<TeacherInsight[]> {
  try {
    const data = await callAIBackend('insights', { prompt: `Analyze: ${dataStr}` });
    return safeParse<TeacherInsight[]>(data.text, []);
  } catch { return []; }
}

export async function generateDashboardInsights(userName: string, stats: DashboardStats): Promise<AIInsight[]> {
  try {
    const data = await callAIBackend('insights', { prompt: `Insights for ${userName}: ${JSON.stringify(stats)}` });
    return safeParse<AIInsight[]>(data.text, []);
  } catch { return []; }
}

/* ===============================
   UTILITIES
================================ */

export async function generateVisualAid(topic: string): Promise<string | undefined> {
  try {
    const data = await callAIBackend('visual', { prompt: `Explain ${topic}` });
    return data.text;
  } catch { return undefined; }
}

export async function checkOriginality(submission: string): Promise<{ score: number, analysis: string }> {
  try {
    const data = await callAIBackend('originality', { prompt: `Check: ${submission}` });
    return safeParse(data.text, { score: 0, analysis: "Error." });
  } catch { return { score: 0, analysis: "Error." }; }
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
  const prompt = `Create a detailed assignment for students on the topic: "${topic}".
Return a JSON object with this exact structure:
{
  "title": "Assignment title",
  "deadline": "Due in 1 week",
  "tasks": ["Task 1 description", "Task 2 description", "Task 3 description", "Task 4 description"]
}
Return ONLY valid JSON, no markdown or code blocks.`;

  try {
    const data = await callAIBackend('assignment', { prompt });
    return safeParse<Assignment>(data.text, null as unknown as Assignment);
  } catch (err) {
    console.error("generateAssignment error:", err);
    return null;
  }
}

