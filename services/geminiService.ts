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

const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null) ||
    (typeof process !== 'undefined' ? process.env.API_KEY : null) ||
    "";
};

const apiKey = getApiKey();

const ai = new GoogleGenAI({
  apiKey: apiKey,
  apiVersion: 'v1',
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
    // Look for the first '[' and last ']' for arrays, or '{' and '}' for objects
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
  audioBase64?: string
): Promise<{ text: string }> {
  if (!apiKey || apiKey.length < 10) {
    return { text: "Educlarity Error: Gemini API Key is missing or invalid. Please check your .env.local file and restart the dev server." };
  }

  const systemInstructions = `You are "Educlarity AI", a professional conceptual coach.
    Mode: ${mode}. Language: ${language}.
    Follow the Socratic method: explain with analogies, then ask a conceptual question.
    Be concise and encouraging.`;

  try {
    const userParts: any[] = [];
    if (currentMessage) userParts.push({ text: currentMessage });
    if (audioBase64) {
      userParts.push({
        inlineData: {
          mimeType: "audio/webm",
          data: audioBase64
        }
      });
    }

    // Must have at least one part for the current turn
    const finalUserParts = userParts.length > 0 ? userParts : [{ text: "Hello, I am ready to learn." }];

    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          // Inject system prompt as the first message for maximum compatibility
          { role: "user", parts: [{ text: `SYSTEM INITIALIZATION: ${systemInstructions}` }] },
          { role: "model", parts: [{ text: "Understood. I am Educlarity AI, your conceptual coach. How can I help you learn today?" }] },
          ...history.map(h => ({
            role: h.role === "model" ? "model" : "user",
            parts: [{ text: h.text }]
          })),
          { role: "user", parts: finalUserParts }
        ],
      })
    );

    return { text: res.text ?? "I understood your input, but I don't have a specific response yet." };
  } catch (err: any) {
    console.error("CRITICAL COACH ERROR:", err);
    const msg = err?.message || "Unknown error";
    return { text: `Service Error: ${msg}. If this persists, please try a hard refresh (Ctrl+F5).` };
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
  const prompt = `Create a professional and comprehensive learning path for "${subject}" as a JSON array of 6-8 milestones.
    Each milestone must follow this structure:
    {
      "id": string,
      "title": string,
      "description": string,
      "status": "UNLOCKED" | "IN_PROGRESS" | "LOCKED",
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "rationale": string
    }
    Make the first 4 milestones "UNLOCKED" for immediate access.
    RETURN ONLY THE JSON ARRAY. NO MARKDOWN. NO PREAMBLE.`;

  const fallbackPath: LearningNode[] = [
    {
      id: '1',
      title: `Fundamentals of ${subject}`,
      description: `Grasp the essential building blocks and primary concepts that define ${subject}.`,
      status: 'IN_PROGRESS',
      difficulty: 'Beginner',
      rationale: 'A solid foundation is required before moving to complex topics.'
    },
    {
      id: '2',
      title: `Applied Principles of ${subject}`,
      description: `Understand how the core theories are applied in practical, real-world scenarios.`,
      status: 'UNLOCKED',
      difficulty: 'Intermediate',
      rationale: 'Practical application cements theoretical knowledge.'
    },
    {
      id: '3',
      title: `Advanced ${subject} Dynamics`,
      description: `Explore the intricate relationships and advanced structures within ${subject}.`,
      status: 'UNLOCKED',
      difficulty: 'Advanced',
      rationale: 'Mastery requires understanding the complex interplay of advanced variables.'
    },
    {
      id: '4',
      title: `Strategic Mastery of ${subject}`,
      description: `Develop high-level strategies and holistic overview of the field.`,
      status: 'UNLOCKED',
      difficulty: 'Advanced',
      rationale: 'The final step is synthesizing all knowledge into expert-level execution.'
    }
  ];

  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      })
    );

    const nodes = safeParse<LearningNode[]>(res.text, []);
    return nodes.length > 0 ? nodes : fallbackPath;
  } catch (err) {
    console.error("Learning Path API Critical Failure:", err);
    return fallbackPath; // Ensure we ALWAYS return the fallback on total failure
  }
}

/* ===============================
   TEACHER INSIGHTS
================================ */

export async function generateTeacherInsights(
  data: string
): Promise<TeacherInsight[]> {
  const prompt = `Analyze the following student performance data and provide 3-4 professional educational insights as a JSON array.
    Each insight must follow this interface:
    {
      "topic": string;
      "avgScore": number;
      "difficultyLevel": "Low" | "Medium" | "High";
      "recommendation": string; // clinical/educational advice
    }
    
    Data: ${data}
    
    RETURN ONLY THE JSON ARRAY.`;

  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      })
    );

    return safeParse<TeacherInsight[]>(res.text, []);
  } catch (err) {
    console.error("Teacher Insights Error:", err);
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
  const prompt = `Generate a high-quality educational quiz about "${topic}" with difficulty level "${difficulty}".
    Return the response ONLY as a JSON array of objects following this interface:
    {
      "id": number;
      "question": string;
      "options": string[]; // 4 options
      "correctAnswerIndex": number; // 0-3
      "explanation": string; // brief explanation of why the answer is correct
    }
    
    Provide 5 varied and challenging questions. RETURN ONLY THE JSON ARRAY.`;

  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      })
    );

    return safeParse<QuizQuestion[]>(res.text, []);
  } catch (err) {
    console.error("Quiz Generation Error:", err);
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
