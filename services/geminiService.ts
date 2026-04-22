import { GoogleGenerativeAI } from "@google/generative-ai";
import {
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

const localKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
let localGenAI: any = null;
if (localKey && localKey.length > 10) {
  try {
    localGenAI = new GoogleGenerativeAI(localKey);
  } catch (e) {
    console.warn("Local AI Init failed:", e);
  }
}

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

function safeParse<T>(text: string | undefined, fallback: T): T {
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

async function generateCoachResponse(
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
    // FALLBACK TO LOCAL IF BACKEND FAILS (For Local Dev)
    if (localGenAI) {
      try {
        const model = localGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(currentMessage);
        return { text: result.response.text() };
      } catch (fallbackErr: any) {
        return { text: `Local Fallback Error: ${fallbackErr.message}` };
      }
    }
    return { text: `Connectivity Error: ${err.message}. Please check Vercel Environment Variables.` };
  }
}

/* ===============================
   SUPPORT
================================ */

async function generateSupportResponse(
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

    const systemPrompt = `You are the EduClarity Support Bot.
      Student Data: ${studentList}
      Tasks: Help manage students. Respond to ADD or REMOVE requests with ACTION_ADD:{json} or ACTION_REMOVE:name.`;

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

    let text = data.text;

    if (text.startsWith("ACTION_ADD:") && actions?.addStudent) {
      try {
        const jsonStr = text.replace("ACTION_ADD:", "").trim();
        const studentData = JSON.parse(jsonStr);
        return await actions.addStudent(studentData);
      } catch {
        return "Student data error.";
      }
    }

    if (text.startsWith("ACTION_REMOVE:") && actions?.removeStudent) {
      const name = text.replace("ACTION_REMOVE:", "").trim();
      return await actions.removeStudent(name);
    }

    return text;
  } catch {
    return "Support unavailable.";
  }
}

/* ===============================
   LEARNING PATH
================================ */

async function generateLearningPath(
  subject: string
): Promise<LearningNode[]> {
  const prompt = `Create an 8-milestone roadmap for "${subject}" as JSON array. 
    Fields: id, title, description, status (LOCKED/IN_PROGRESS), difficulty, rationale.`;

  const fallbackPath: LearningNode[] = [
    { id: '1', title: `Basics of ${subject}`, description: 'Fundamentals.', status: 'IN_PROGRESS', difficulty: 'Beginner', rationale: 'Foundation.' }
  ];

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

async function generateQuiz(
  topic: string,
  difficulty: string
): Promise<QuizQuestion[]> {
  const prompt = `Generate a 5-question multiple choice quiz about "${topic}" (difficulty: ${difficulty}). 
    Return as a JSON array.`;

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

async function solveQuestionFromImage(
  base64Image: string
): Promise<{ topic: string, answer: string, steps: string[] }> {
  const fallback = { topic: "Analysis", answer: "Failed to solve.", steps: ["Try again."] };
  try {
    const prompt = `Solve this question from the image. Return JSON: {topic, answer, steps[]}`;
    const data = await callAIBackend('vision', { prompt, image: base64Image });
    return safeParse(data.text, fallback);
  } catch {
    return fallback;
  }
}

/* ===============================
   TEACHER INSIGHTS
================================ */

async function generateTeacherInsights(
  dataStr: string
): Promise<TeacherInsight[]> {
  const prompt = `Analyze: ${dataStr}. Return 3 insights as JSON array {topic, avgScore, difficultyLevel, recommendation}.`;
  try {
    const data = await callAIBackend('insights', { prompt });
    return safeParse<TeacherInsight[]>(data.text, []);
  } catch {
    return [];
  }
}

/* ===============================
   ASSIGNMENT
================================ */

async function generateAssignment(
  topic: string,
  difficulty: string
): Promise<Assignment | null> {
  const prompt = `Create an assignment for ${topic} (${difficulty}). JSON: {title, tasks[], deadline}.`;
  try {
    const data = await callAIBackend('assignment', { prompt });
    return safeParse<Assignment>(data.text, null);
  } catch {
    return null;
  }
}

/* ===============================
   DASHBOARD INSIGHTS
================================ */

async function generateDashboardInsights(
  userName: string,
  stats: DashboardStats
): Promise<AIInsight[]> {
  const prompt = `Generate 3 insights for ${userName}: ${JSON.stringify(stats)}. JSON array {title, description, type}.`;
  try {
    const data = await callAIBackend('insights', { prompt });
    return safeParse<AIInsight[]>(data.text, []);
  } catch {
    return [{ title: "Welcome!", description: "Start learning to see insights.", type: "info" }];
  }
}

async function generateVisualAid(
  topic: string
): Promise<string | undefined> {
  try {
    const data = await callAIBackend('visual', { prompt: `Explain ${topic} with a conceptual breakdown.` });
    return data.text;
  } catch {
    return undefined;
  }
}

async function checkOriginality(
  submission: string
): Promise<{ score: number, analysis: string }> {
  const prompt = `Check for plagiarism/originality in: "${submission}". JSON: {score, analysis}.`;
  try {
    const data = await callAIBackend('originality', { prompt });
    return safeParse(data.text, { score: 0, analysis: "Failed to analyze." });
  } catch {
    return { score: 0, analysis: "Error checking originality." };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export {
  generateCoachResponse,
  generateSupportResponse,
  generateLearningPath,
  generateQuiz,
  solveQuestionFromImage,
  generateTeacherInsights,
  generateAssignment,
  generateDashboardInsights,
  generateVisualAid,
  checkOriginality,
  blobToBase64,
  safeParse
};
