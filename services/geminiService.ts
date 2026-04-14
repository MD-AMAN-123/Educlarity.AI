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
  DashboardStats
} from "../types";


/* ===============================
   SAFE ENV
================================ */

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY ||
  (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null) ||
  (typeof process !== 'undefined' ? process.env.API_KEY : null) ||
  "").trim();

console.log("EduFree AI: Gemini Key detected?", apiKey ? `Yes (${apiKey.substring(0, 6)}...)` : "NO");

const genAI = new GoogleGenerativeAI(apiKey);

/* ===============================
   RETRY WRAPPER
================================ */

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

export async function generateCoachResponse(
  history: { role: string; text: string }[],
  currentMessage: string,
  mode: CoachMode,
  language: Language,
  audioBase64?: string,
  bot?: StudyBot
): Promise<{ text: string }> {

  if (!apiKey || apiKey.length < 10) {
    return { text: "EduFree Error: API Key missing. Please check .env.local." };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: bot 
            ? `You are "${bot.name}", specializing in ${bot.subject}. Personality: ${bot.personality}. Respond in ${language}.`
            : `You are "EduFree AI", a conceptual coach. Mode: ${mode}. Language: ${language}. Use the Socratic method.` 
          }]
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am ready to assist." }]
        },
        ...history.map(h => ({
          role: h.role === "model" ? "model" : "user",
          parts: [{ text: h.text }]
        }))
      ]
    });

    const parts: any[] = [{ text: currentMessage || "Proceed" }];
    if (audioBase64) {
      parts.push({ inlineData: { mimeType: "audio/webm", data: audioBase64 } });
    }

    const result = await chat.sendMessage(parts);
    return { text: result.response.text() };
  } catch (err: any) {
    console.error("Coach Error:", err);
    return { text: "Critical Connectivity Error: Failed to fetch. Please check your internet connection." };
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const studentList = students
      ? students.map(s => `- ${s.name} (ID: ${s.id}, Grade: ${s.grade})`).join('\n')
      : "No students listed.";

    const systemPrompt = `You are the EduFree Support Bot.
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

export async function generateVisualAid(
  topic: string
): Promise<string | undefined> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(`Explain ${topic} clearly`);
    return res.response.text();
  } catch {
    return undefined;
  }
}

/* ===============================
   LEARNING PATH
================================ */

export async function generateLearningPath(
  subject: string
): Promise<LearningNode[]> {
  const prompt = `Create a professional learning path for "${subject}" as a JSON array. Return JSON only.`;
  const fallbackPath: LearningNode[] = [{ id: '1', title: `Basics of ${subject}`, description: 'Fundamentals.', status: 'IN_PROGRESS', difficulty: 'Beginner', rationale: 'Foundation.' }];

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(prompt);
    const nodes = safeParse<LearningNode[]>(res.response.text(), []);
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
  const prompt = `Generate a 5-question quiz about "${topic}" (diff: ${difficulty}). Return JSON array only.`;
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

export async function solveQuestionFromImage(
  base64Image: string
): Promise<{ topic: string, answer: string, steps: string[] }> {
  const fallback = {
    topic: "Question Analysis",
    answer: "Unable to solve. Re-take the photo.",
    steps: ["Analysis failed."]
  };

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
   DASHBOARD INSIGHTS
================================ */

export async function generateDashboardInsights(
  userName: string,
  stats: DashboardStats
): Promise<AIInsight[]> {
  const prompt = `Generate 3 insights for ${userName} based on stats: ${JSON.stringify(stats)}. Return JSON array only.`;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(prompt);
    return safeParse<AIInsight[]>(res.response.text(), []);
  } catch {
    return [{ title: "Ready?", description: "Consistency is key!", type: "success" }];
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
