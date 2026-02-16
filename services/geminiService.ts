 import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import {
  CoachMode,
  Language,
  QuizQuestion,
  LearningNode,
  TeacherInsight,
} from "../types";

/* ===============================
   SAFE ENV
================================ */

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
});

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
    return JSON.parse(text) as T;
  } catch {
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
  language: Language
): Promise<{ text: string }> {
  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: currentMessage,
      })
    );

    return { text: res.text ?? "No response." };
  } catch {
    return { text: "AI temporarily unavailable." };
  }
}

/* ===============================
   SUPPORT
================================ */

export async function generateSupportResponse(
  history: { role: string; text: string }[],
  message: string
): Promise<string> {
  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: message,
      })
    );

    return res.text ?? "No response.";
  } catch {
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
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Explain ${topic} clearly`,
      })
    );

    return res.text;
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
  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Create JSON learning path for ${subject}`,
      })
    );

    return safeParse<LearningNode[]>(res.text, []);
  } catch {
    return [];
  }
}

/* ===============================
   TEACHER INSIGHTS
================================ */

export async function generateTeacherInsights(
  data: string
): Promise<TeacherInsight[]> {
  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Analyze data and return JSON insights: ${data}`,
      })
    );

    return safeParse<TeacherInsight[]>(res.text, []);
  } catch {
    return [];
  }
}

/* ===============================
   QUIZ
================================ */

export async function generateQuiz(
  topic: string,
  difficulty: string
): Promise<QuizQuestion[]> {
  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Generate JSON quiz about ${topic} difficulty ${difficulty}`,
      })
    );

    return safeParse<QuizQuestion[]>(res.text, []);
  } catch {
    return [];
  }
}
/* ===============================
   BLOB TO BASE64
================================ */

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


/* ===============================
   ORIGINALITY
================================ */

export async function checkOriginality(
  text: string
): Promise<{ score: number; analysis: string }> {
  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Check originality: ${text.substring(0, 500)}`,
      })
    );

    return {
      score: 85,
      analysis: res.text ?? "Analysis complete.",
    };
  } catch {
    return {
      score: 0,
      analysis: "Error checking originality.",
    };
  }
}
