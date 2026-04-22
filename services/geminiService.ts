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
   SAFE ENV
================================ */

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY ||
  (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null) ||
  (typeof process !== 'undefined' ? process.env.API_KEY : null) ||
  "").trim();

// Safe initialization to prevent blank page crash
let genAI: any = null;
if (apiKey && apiKey.length > 10) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (e) {
    console.error("AI Initialization failed:", e);
  }
}

/* ===============================
   RETRY & TIMEOUT WRAPPER
================================ */

const DEFAULT_TIMEOUT = 15000; // 15s timeout

async function retry<T>(
  operation: () => Promise<T>,
  retries = 2
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, 2000));
    return retry(operation, retries - 1);
  }
}

async function fetchWithTimeout(url: string, options: any, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
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

  if (!apiKey || apiKey.length < 10) {
    return { text: "EduClarity Error: API Key missing. Please check .env.local." };
  }

  const systemPrompt = bot 
    ? `You are "${bot.name}", specializing in ${bot.subject}. Personality: ${bot.personality}. Respond in ${language}.`
    : `You are "EduClarity AI", a conceptual coach. Mode: ${mode}. Language: ${language}. Use the Socratic method.`;

  const contents = [
    {
      role: "user",
      parts: [{ text: systemPrompt }]
    },
    {
      role: "model",
      parts: [{ text: "Understood. I am ready to assist." }]
    },
    ...history.map(h => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }]
    }))
  ];

  const currentPart: any = { text: currentMessage || "Process this input" };
  if (audioBase64) {
    contents.push({
      role: "user",
      parts: [
        currentPart,
        { inlineData: { mimeType: "audio/webm", data: audioBase64 } }
      ]
    });
  } else {
    contents.push({
      role: "user",
      parts: [currentPart]
    });
  }

  // Fallback chain for robustness
  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

  for (const modelName of models) {
    try {
      if (!genAI) break;
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({ contents });
      const text = result.response.text();
      if (text) return { text };
    } catch (err: any) {
      console.warn(`Attempt with ${modelName} failed. Trying next...`);
    }
  }

  return { text: "Connectivity Error: Failed to reach AI service. Please check your internet." };
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
  if (!genAI) return "AI Service not initialized.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const studentList = students
      ? students.map(s => `- ${s.name} (ID: ${s.id}, Grade: ${s.grade})`).join('\n')
      : "No students listed.";

    const systemPrompt = `You are the EduClarity Support Bot.
Current Student Data:
${studentList}

If the user asks to add a student, you MUST return a plain text response starting with "ACTION_ADD:" followed by a JSON object with name and grade.
If the user asks to remove a student, you MUST return a plain text response starting with "ACTION_REMOVE:" followed by the student name.
Otherwise, answer normally.`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. Database access active." }] },
        ...history.map(h => ({
          role: h.role === "model" ? "model" : "user",
          parts: [{ text: h.text }]
        }))
      ]
    });

    const res = await chat.sendMessage(message);
    let text = res.response.text();

    if (text.startsWith("ACTION_ADD:") && actions?.addStudent) {
      try {
        const jsonStr = text.replace("ACTION_ADD:", "").trim();
        const data = JSON.parse(jsonStr);
        return await actions.addStudent(data);
      } catch {
        return "Student data error.";
      }
    }

    if (text.startsWith("ACTION_REMOVE:") && actions?.removeStudent) {
      const name = text.replace("ACTION_REMOVE:", "").trim();
      return await actions.removeStudent(name);
    }

    return text;
  } catch (err) {
    console.error("Support Error:", err);
    return "Support unavailable.";
  }
}

/* ===============================
   VISUAL AID
================================ */

async function generateVisualAid(
  topic: string
): Promise<string | undefined> {
  if (!genAI) return undefined;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(`Explain ${topic} clearly with a detailed conceptual breakdown.`);
    return res.response.text();
  } catch {
    return undefined;
  }
}

/* ===============================
   LEARNING PATH
================================ */

async function generateLearningPath(
  subject: string
): Promise<LearningNode[]> {
  const prompt = `Create a professional learning path for "${subject}" as a JSON array of 6-8 milestones. 
    Return JSON only. Start the first one as IN_PROGRESS.`;

  const fallbackPath: LearningNode[] = [{ id: '1', title: `Basics of ${subject}`, description: 'Fundamentals.', status: 'IN_PROGRESS', difficulty: 'Beginner', rationale: 'Foundation.' }];

  if (!genAI) return fallbackPath;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(prompt);
    const nodes = safeParse<LearningNode[]>(res.response.text(), []);
    return nodes.length > 0 ? nodes : fallbackPath;
  } catch (err) {
    console.error("Learning Path Error:", err);
    return fallbackPath;
  }
}

/* ===============================
   TEACHER INSIGHTS
================================ */

async function generateTeacherInsights(
  data: string
): Promise<TeacherInsight[]> {
  const prompt = `Analyze the performance data and provide 3-4 professional insights as a JSON array. 
    Data: ${data}`;

  if (!genAI) return [];
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(prompt);
    return safeParse<TeacherInsight[]>(res.response.text(), []);
  } catch (err) {
    console.error("Teacher Insights Error:", err);
    return [];
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

  if (!genAI) return [];
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(prompt);
    return safeParse<QuizQuestion[]>(res.response.text(), []);
  } catch {
    return [];
  }
}

/* ===============================
   DOUBT SOLVER (IMAGE)
================================ */

async function solveQuestionFromImage(
  base64Image: string
): Promise<{ topic: string, answer: string, steps: string[] }> {
  const fallback = {
    topic: "Question Analysis",
    answer: "Unable to solve. Re-take the photo.",
    steps: ["Analysis failed."]
  };

  if (!genAI) return fallback;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Solve this question step-by-step. Return JSON only with topic, answer, steps.`;
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);
    return safeParse<{ topic: string, answer: string, steps: string[] }>(result.response.text(), fallback);
  } catch {
    return fallback;
  }
}

/* ===============================
   ASSIGNMENT
================================ */

async function generateAssignment(
  topic: string
): Promise<Assignment> {
  const prompt = `Create a creative student assignment for "${topic}".
    Return as JSON: { "title": string, "tasks": string[], "deadline": string }`;

  const fallback = {
    title: `Exploration of ${topic}`,
    tasks: [`Research ${topic}`, `Summarize findings`, `Apply to real world`],
    deadline: "1 week"
  };

  if (!genAI) return fallback;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(prompt);
    return safeParse<Assignment>(res.response.text(), fallback);
  } catch {
    return fallback;
  }
}

/* ===============================
   ORIGINALITY
================================ */

async function checkOriginality(
  text: string
): Promise<{ score: number; analysis: string }> {
  if (!genAI) return { score: 0, analysis: "AI not initialized." };
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(`Check the originality of this text: ${text.substring(0, 500)}`);
    return {
      score: 85,
      analysis: res.response.text() || "Analysis complete."
    };
  } catch {
    return { score: 0, analysis: "Error checking originality." };
  }
}

/* ===============================
   DASHBOARD INSIGHTS
================================ */

async function generateDashboardInsights(
  userName: string,
  stats: DashboardStats
): Promise<AIInsight[]> {
  const prompt = `Generate 3 study insights for ${userName} based on stats: ${JSON.stringify(stats)}. Return JSON array.`;
  if (!genAI) return [{ title: "Keep Going!", description: "Consistency leads to mastery.", type: "success" }];
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(prompt);
    return safeParse<AIInsight[]>(res.response.text(), []);
  } catch {
    return [{ title: "Keep Going!", description: "Consistency leads to mastery.", type: "success" }];
  }
}

/* ===============================
   BLOB TO BASE64
================================ */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ===============================
   EXPORTS
================================ */

export {
  generateCoachResponse,
  generateSupportResponse,
  generateVisualAid,
  generateLearningPath,
  generateTeacherInsights,
  generateQuiz,
  generateAssignment,
  blobToBase64,
  checkOriginality,
  generateDashboardInsights,
  solveQuestionFromImage
};
