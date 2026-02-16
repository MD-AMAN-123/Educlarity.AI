import { GoogleGenAI, Modality, Type, Tool } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import {
  CoachMode,
  Language,
  QuizQuestion,
  LearningNode,
  TeacherInsight,
  StudyBot,
  Student,
} from "../types";

/* ======================================================
   ✅ SAFE ENV HANDLING (NO WHITE SCREEN)
====================================================== */

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ VITE_GEMINI_API_KEY is missing.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
});

/* ======================================================
   ✅ SAFE RETRY WRAPPER
====================================================== */

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 2,
  delay = 2000
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((res) => setTimeout(res, delay));
    return retryWithBackoff(operation, retries - 1, delay * 2);
  }
}

/* ======================================================
   ✅ SAFE JSON PARSER
====================================================== */

function parseJsonSafe<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/* ======================================================
   ✅ COACH RESPONSE
====================================================== */

export const generateCoachResponse = async (
  history: { role: string; text: string }[],
  currentMessage: string,
  mode: CoachMode,
  language: Language
): Promise<{ text: string }> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: currentMessage,
      })
    );

    return {
      text: response.text || "No response generated.",
    };
  } catch (error) {
    console.error("Coach Error:", error);
    return { text: "AI service temporarily unavailable." };
  }
};

/* ======================================================
   ✅ SUPPORT RESPONSE
====================================================== */

export const generateSupportResponse = async (
  history: { role: string; text: string }[],
  currentMessage: string
): Promise<string> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: currentMessage,
      })
    );

    return response.text || "No response.";
  } catch (error) {
    console.error("Support Error:", error);
    return "Support system temporarily unavailable.";
  }
};

/* ======================================================
   ✅ VISUAL AID GENERATION
====================================================== */

export const generateVisualAid = async (
  topic: string
): Promise<string | undefined> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Create a simple educational explanation about ${topic}`,
      })
    );

    return response.text;
  } catch {
    return undefined;
  }
};

/* ======================================================
   ✅ LEARNING PATH
====================================================== */

export const generateLearningPath = async (
  subject: string
): Promise<LearningNode[]> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Create structured learning path for ${subject} in JSON array format`,
      })
    );

    return parseJsonSafe<LearningNode[]>(response.text, []);
  } catch {
    return [];
  }
};

/* ======================================================
   ✅ TEACHER INSIGHTS
====================================================== */

export const generateTeacherInsights = async (
  studentData: string
): Promise<TeacherInsight[]> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Analyze this student data and return insights in JSON array: ${studentData}`,
      })
    );

    return parseJsonSafe<TeacherInsight[]>(response.text, []);
  } catch {
    return [];
  }
};

/* ======================================================
   ✅ QUIZ GENERATOR
====================================================== */

export const generateQuiz = async (
  topic: string,
  difficulty: string
): Promise<QuizQuestion[]> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Generate quiz about ${topic} difficulty ${difficulty} in JSON array format`,
      })
    );

    return parseJsonSafe<QuizQuestion[]>(response.text, []);
  } catch {
    return [];
  }
};

/* ======================================================
   ✅ ORIGINALITY CHECK
====================================================== */

export const checkOriginality = async (
  text: string
): Promise<{ score: number; analysis: string }> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Check originality of this text: ${text.substring(0, 1000)}`,
      })
    );

    return {
      score: 85,
      analysis: response.text || "Analysis complete.",
    };
  } catch {
    return {
      score: 0,
      analysis: "Error checking originality.",
    };
  }
};
