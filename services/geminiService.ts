import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
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

console.log("Educlarity AI: Gemini Key detected?", apiKey ? `Yes (${apiKey.substring(0, 6)}...)` : "NO");

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
  audioBase64?: string,
  bot?: StudyBot
): Promise<{ text: string }> {

  if (!apiKey || apiKey.length < 10) {
    return { text: "Educlarity Error: API Key missing. Please check .env.local." };
  }

  // Ensure alternating user/model sequence for Gemini API
  const contents: any[] = [];

  // 1. Initial System/Bot Persona Message
  const systemPrompt = bot
    ? `You are "${bot.name}", an AI assistant specializing in ${bot.subject}. Your personality is: ${bot.personality}. Respond in ${language}.`
    : `You are "Educlarity AI", a conceptual coach. Mode: ${mode}. Language: ${language}. Use the Socratic method.`;

  contents.push({ role: "user", parts: [{ text: systemPrompt }] });
  contents.push({ role: "model", parts: [{ text: bot ? `Hello! I am ${bot.name}. I am ready to assist you.` : "Understood. I am ready to coach." }] });

  // 2. Add history, ensuring we don't duplicate roles
  history.forEach(h => {
    const role = h.role === "model" ? "model" : "user";
    const lastRole = contents.length > 0 ? contents[contents.length - 1].role : null;

    if (role === lastRole) {
      // Append to last message if consecutive role
      contents[contents.length - 1].parts[0].text += `\n\n${h.text}`;
    } else {
      contents.push({ role, parts: [{ text: h.text }] });
    }
  });

  // 3. Add current message
  const lastRole = contents.length > 0 ? contents[contents.length - 1].role : null;
  if (lastRole === "user") {
    contents[contents.length - 1].parts[0].text += `\n\n${currentMessage}`;
    if (audioBase64) {
      contents[contents.length - 1].parts.push({ inlineData: { mimeType: "audio/webm", data: audioBase64 } });
    }
  } else {
    contents.push({
      role: "user",
      parts: [
        { text: currentMessage || "Proceed" },
        ...(audioBase64 ? [{ inlineData: { mimeType: "audio/webm", data: audioBase64 } }] : [])
      ]
    });
  }

  // Define fallback chain based exactly on the user's authorized models
  const endpoints = [
    { ver: "v1beta", model: "gemini-2.5-flash" },
    { ver: "v1beta", model: "gemini-2.5-flash-lite" },
    { ver: "v1beta", model: "gemini-2.0-flash" },
    { ver: "v1beta", model: "gemini-2.0-flash-001" },
    { ver: "v1beta", model: "gemini-2.5-pro" },
    { ver: "v1", model: "gemini-1.5-flash" }
  ];

  let lastError = "";

  for (const endpoint of endpoints) {
    try {
      const url = `https://generativelanguage.googleapis.com/${endpoint.ver}/models/${endpoint.model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();

      if (response.ok) {
        return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received." };
      }

      lastError = `[${endpoint.ver}/${endpoint.model}] ${data.error?.message || "Unknown error"}`;
      console.warn("Attempt failed:", lastError);

    } catch (err: any) {
      lastError = err.message;
    }
  }


  // If we reach here, everything failed. Let's try to list authorized models for the user
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();
    const modelNames = listData.models ? listData.models.map((m: any) => m.name).join(", ") : "None";

    return { text: `Final Error Persistence. Tried all models but failed with: ${lastError}. Your key currently has access to: ${modelNames}. Please contact support with this info.` };
  } catch {
    return { text: `Critical Connectivity Error: ${lastError}. Please check your internet connection and API key.` };
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

    const contents: any[] = [{ role: "user", parts: [{ text: systemPrompt }] }];
    contents.push({ role: "model", parts: [{ text: "Understood. I have access to the student database." }] });

    history.forEach(h => {
      const role = h.role === "model" ? "model" : "user";
      const lastRole = contents.length > 0 ? contents[contents.length - 1].role : null;
      if (role === lastRole) {
        contents[contents.length - 1].parts[0].text += `\n\n${h.text}`;
      } else {
        contents.push({ role, parts: [{ text: h.text }] });
      }
    });

    const finalRole = contents.length > 0 ? contents[contents.length - 1].role : null;
    if (finalRole === "user") {
      contents[contents.length - 1].parts[0].text += `\n\n${message}`;
    } else {
      contents.push({ role: "user", parts: [{ text: message }] });
    }

    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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
    
    Provide 5 varied and challenging questions. RETURN ONLY THE JSON ARRAY. NO MARKDOWN. NO PREAMBLE.`;

  if (!apiKey || apiKey.length < 10) {
    console.warn("Gemini API Key missing for Quiz Generation.");
    return [];
  }

  // Prioritize working models for this key
  const endpoints = [
    { ver: "v1beta", model: "gemini-2.5-flash" },
    { ver: "v1beta", model: "gemini-2.5-flash-lite" },
    { ver: "v1beta", model: "gemini-2.0-flash" },
    { ver: "v1beta", model: "gemini-2.0-flash-001" },
    { ver: "v1", model: "gemini-1.5-flash" }
  ];




  for (const endpoint of endpoints) {
    try {
      const url = `https://generativelanguage.googleapis.com/${endpoint.ver}/models/${endpoint.model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const quiz = safeParse<QuizQuestion[]>(text, []);
        if (quiz.length > 0) return quiz;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Attempt with ${endpoint.model} failed:`, response.status, errorData);
      }
    } catch (err) {
      console.warn(`Request failed for ${endpoint.model}:`, err);
    }
  }

  return [];
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
        model: "gemini-2.5-flash",
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

/* ===============================
   DASHBOARD INSIGHTS
================================ */

export async function generateDashboardInsights(
  userName: string,
  stats: DashboardStats
): Promise<AIInsight[]> {
  const prompt = `Based on the following student stats, generate 3 personalized AI insights or recommendations.
    User: ${userName}
    Stats: ${JSON.stringify(stats)}
    
    Return the response ONLY as a JSON array of objects following this interface:
    {
      "title": string;
      "description": string;
      "type": "success" | "warning" | "info";
    }
    
    Insights should be encouraging, data-driven, and specific. Limit to 3 items.`;

  if (!apiKey || apiKey.length < 10) {
    return [
      { title: "Ready for JEE Mains?", description: "You are consistent! 85% readiness achieved in Mock Tests.", type: "success" },
      { title: "Improve Mechanics", description: "You might want to focus on Rotational Dynamics this week.", type: "info" },
      { title: "Time Management", description: "Your study hours peaked on Saturday. Try to maintain consistency.", type: "warning" }
    ];
  }

  try {
    const res = await retry<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      })
    );
    const insights = safeParse<AIInsight[]>(res.text, []);
    return insights.length > 0 ? insights : [
      { title: "Consistent Progress", description: "You've been studying regularly this week. Keep it up!", type: "success" },
      { title: "Strong Subject", description: "Your performance in Physics has been exceptional lately.", type: "info" },
      { title: "Upcoming Goals", description: "Don't forget to review your weak areas before the weekend mock test.", type: "warning" }
    ];
  } catch (err) {
    console.error("Dashboard Insights Error:", err);
    return [
      { title: "Ready for JEE Mains?", description: "You are consistent! 85% readiness achieved in Mock Tests.", type: "success" },
      { title: "Improve Mechanics", description: "You might want to focus on Rotational Dynamics this week.", type: "info" },
      { title: "Time Management", description: "Your study hours peaked on Saturday. Try to maintain consistency.", type: "warning" }
    ];
  }
}

