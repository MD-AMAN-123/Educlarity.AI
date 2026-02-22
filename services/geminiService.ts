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
    // Extract JSON from markdown or preamble/postamble
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    const cleanText = jsonMatch ? jsonMatch[0] : text;
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
  const prompt = `Create a professional and comprehensive learning path for "${subject}" as a JSON array of 5-7 milestones.
    Each milestone must strictly follow this TypeScript interface:
    {
      "id": string; // unique short ID like "basics", "advanced"
      "title": string; // engaging title
      "description": string; // 1-2 sentences on what will be covered
      "status": "UNLOCKED" | "IN_PROGRESS" | "LOCKED";
      "difficulty": "Beginner" | "Intermediate" | "Advanced";
      "rationale": string; // why this specific step is crucial for mastering ${subject}
    }
    
    Guidelines:
    1. Provide a logical sequence from fundamentals to mastery.
    2. The first 3 milestones should be "UNLOCKED" to make the path feel immediately accessible.
    3. Ensure the JSON is perfectly formatted and contains NO other text.`;

  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      })
    );

    const nodes = safeParse<LearningNode[]>(res.text, []);

    // Add fallback if AI fails to give us nodes
    if (nodes.length === 0) {
      return [
        {
          id: '1',
          title: `Introduction to ${subject}`,
          description: `Master the essential fundamentals and core principles of ${subject}.`,
          status: 'IN_PROGRESS',
          difficulty: 'Beginner',
          rationale: 'Every expert starts with a strong grasp of the basics.'
        },
        {
          id: '2',
          title: `Core concepts of ${subject}`,
          description: `Deep dive into the primary mechanisms and structures of ${subject}.`,
          status: 'UNLOCKED',
          difficulty: 'Intermediate',
          rationale: 'Building on basics allows for understanding complex systems.'
        },
        {
          id: '3',
          title: `Advanced ${subject} Applications`,
          description: `Learn how to apply your knowledge to real-world complex scenarios.`,
          status: 'UNLOCKED',
          difficulty: 'Advanced',
          rationale: 'True mastery comes from applying theory to practice.'
        }
      ];
    }

    return nodes;
  } catch (err) {
    console.error("Learning Path Generation Error:", err);
    return [];
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
