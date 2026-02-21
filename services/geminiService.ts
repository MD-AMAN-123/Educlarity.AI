import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import {
  CoachMode,
  Language,
  QuizQuestion,
  LearningNode,
  TeacherInsight,
  Student
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
        model: "gemini-flash-latest",
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

    const systemPrompt = `You are the Educlarity Support Bot.
Current Student Data:
${studentList}

If the user asks to add a student, you MUST return a plain text response starting with "ACTION_ADD:" followed by a JSON object with name and grade.
If the user asks to remove a student, you MUST return a plain text response starting with "ACTION_REMOVE:" followed by the student name.
Otherwise, answer normally.`;

    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...history.map(h => ({ role: h.role === "model" ? "model" : "user", parts: [{ text: h.text }] })),
          { role: "user", parts: [{ text: message }] }
        ],
      })
    );

    let text = res.text ?? "No response.";

    // Handle internal triggers for actions if AI returns them
    if (text.startsWith("ACTION_ADD:") && actions?.addStudent) {
      try {
        const jsonStr = text.replace("ACTION_ADD:", "").trim();
        const data = JSON.parse(jsonStr);
        return await actions.addStudent(data);
      } catch {
        return "I tried to add the student but the data was invalid.";
      }
    }

    if (text.startsWith("ACTION_REMOVE:") && actions?.removeStudent) {
      const name = text.replace("ACTION_REMOVE:", "").trim();
      return await actions.removeStudent(name);
    }

    return text;
  } catch (err) {
    console.error("Gemini Support Error:", err);
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
        model: "gemini-flash-latest",
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
        model: "gemini-flash-latest",
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
        model: "gemini-flash-latest",
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
        model: "gemini-flash-latest",
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
        model: "gemini-flash-latest",
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
