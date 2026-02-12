import { GoogleGenAI, Modality, Type, FunctionDeclaration, Tool, Part, GenerateContentResponse } from "@google/genai";
import { CoachMode, Language, QuizQuestion, LearningNode, TeacherInsight, StudyBot, Student } from "../types";

const apiKey = process.env.API_KEY || ''; // Injected by environment
const ai = new GoogleGenAI({ apiKey });

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Retry mechanism for API Quota limits (429) and Server Errors
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  initialDelay: number = 3000
): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      // Extended error checking for nested objects from Google APIs
      const errCode = error?.code || error?.error?.code || error?.status;
      const errMessage = error?.message || error?.error?.message || JSON.stringify(error);
      const errStatus = error?.status || error?.error?.status;
      const details = error?.details || error?.error?.details;

      // Check for 429 (Too Many Requests) or 5xx (Server Errors)
      const isTransient = 
        errCode === 429 || 
        errStatus === 429 ||
        errStatus === 'RESOURCE_EXHAUSTED' ||
        (typeof errMessage === 'string' && (
            errMessage.includes('429') || 
            errMessage.includes('quota') || 
            errMessage.includes('RESOURCE_EXHAUSTED') ||
            errMessage.includes('overloaded')
        )) ||
        errCode === 503 ||
        errCode === 500 ||
        errCode === 502 || 
        errCode === 504;

      if (isTransient && i < retries - 1) {
        let waitTime = delay;
        
        // 1. Try to parse structured RetryInfo from details (Preferred)
        if (Array.isArray(details)) {
             const retryInfo = details.find((d: any) => d.retryDelay);
             if (retryInfo?.retryDelay) {
                 // Format is usually "54s" or "54.123s"
                 const s = parseFloat(retryInfo.retryDelay.replace('s', ''));
                 if (!isNaN(s)) {
                    waitTime = Math.ceil(s * 1000) + 2000; // Add 2s buffer
                 }
             }
        } 
        
        // 2. Fallback to Regex on message
        if (waitTime === delay && typeof errMessage === 'string') {
            const match = errMessage.match(/retry in (\d+(\.\d+)?)s/i);
            if (match && match[1]) {
               waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 2000; 
            }
        }

        // FAIL FAST: If wait time is excessively long (> 25s), 
        // stop retrying to failover to local logic immediately.
        // We allow up to 25s because standard free tier often gives ~20s delays.
        if (waitTime > 25000) {
            console.warn(`Gemini API Quota/Busy. Retry delay ${Math.round(waitTime/1000)}s is too long. Failing fast to trigger offline fallback.`);
            throw error;
        }

        console.warn(`Gemini API Busy/Error (${errCode || 'Unknown'}). Attempt ${i + 1}/${retries}. Retrying in ${Math.round(waitTime/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Exponential backoff if not using explicit waitTime
        delay = waitTime > delay ? waitTime : delay * 2; 
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

const parseJsonSafe = (text: string | undefined, fallback: any) => {
  if (!text) return fallback;
  
  let cleaned = text.trim();

  // Extract content from markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '');
  }
  
  try {
    const result = JSON.parse(cleaned);
    if (result === null || result === undefined) return fallback;
    return result;
  } catch (e) {
    // Attempt to fix common missing comma errors
    try {
       const fixed = cleaned.replace(/((?:\"|\]|\}|true|false|null|\d))\s+(?=\"\w+\":)/g, '$1,');
       const result = JSON.parse(fixed);
       if (result !== null && result !== undefined) return result;
    } catch (e2) {
       // ignore
    }

    // If strict parse fails, try extracting JSON structure manually from substring
    try {
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
          return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } else if (firstBrace !== -1 && lastBrace !== -1) {
           return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      }
    } catch (e3) {
       // Parsing failed completely
    }
    
    console.warn("JSON Parse Failed, returning fallback.", e);
    return fallback;
  }
};

export const generateCoachResponse = async (
  history: { role: string; text: string }[],
  currentMessage: string,
  mode: CoachMode,
  language: Language,
  audioInputBase64?: string,
  botProfile?: StudyBot 
): Promise<{ text: string; audioBase64?: string }> => {
  
  const safeHistory = Array.isArray(history) ? history : [];
  
  const activeModel = audioInputBase64 
    ? 'gemini-2.5-flash-native-audio-preview-12-2025' 
    : 'gemini-3-flash-preview';

  let systemPrompt = '';

  if (botProfile) {
    systemPrompt = `
      You are ${botProfile.name}, an expert in ${botProfile.subject}.
      Your personality is: ${botProfile.personality}.
      Current Language: ${language}.
      
      Instructions:
      1. Stay completely in character as ${botProfile.name}.
      2. If your personality is "Strict", be formal and concise. If "Friendly", be warm and use emojis.
      3. Focus strictly on ${botProfile.subject}.
      4. Keep responses concise (under 150 words).
    `;
  } else {
    systemPrompt = `
      You are Educlarity, an AI education assistant for Indian students. 
      Current Language: ${language}.
      Current Mode: ${mode}.

      Rules:
      1. If Mode is LEARNING: DO NOT provide the direct answer. Use the Socratic method.
      2. If Mode is ANSWER: Provide clear, concise, step-by-step explanations.
      3. Be encouraging and empathetic.
      4. Keep responses concise (under 150 words).
    `;
  }

  try {
    const parts: any[] = [{ text: currentMessage }];
    
    if (audioInputBase64) {
      parts.unshift({
        inlineData: {
          mimeType: 'audio/wav', 
          data: audioInputBase64
        }
      });
    }

    const chatContext = safeHistory.map(h => `${h.role === 'user' ? 'Student' : (botProfile ? botProfile.name : 'Educlarity')}: ${h.text}`).join('\n');
    const fullPrompt = `${chatContext}\nStudent: ${currentMessage}`;

    const config: any = {
      systemInstruction: systemPrompt,
    };

    if (audioInputBase64) {
       config.responseModalities = [Modality.AUDIO];
       config.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
       };
    }

    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: activeModel,
      contents: audioInputBase64 ? { parts } : fullPrompt, 
      config: config
    }));

    if (audioInputBase64) {
      const candidate = response.candidates?.[0];
      const audioData = candidate?.content?.parts?.[0]?.inlineData?.data;
      return {
        text: "(Voice Response)",
        audioBase64: audioData
      };
    } else {
      return {
        text: response.text || "I couldn't generate a response. Please try again.",
      };
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Network error or API limit reached. Please try again." };
  }
};

export const generateSupportResponse = async (
  history: { role: string; text: string }[],
  currentMessage: string,
  studentData?: Student[],
  actions?: {
    addStudent: (student: any) => Promise<string>;
    removeStudent: (name: string) => Promise<string>;
  }
): Promise<string> => {
  const safeHistory = Array.isArray(history) ? history : [];
  let systemPrompt = `
    You are the Customer Support Agent for Educlarity.AI, an ed-tech platform.
    Your tone: Helpful, Professional, yet Friendly.
    
    Knowledge Base:
    - We offer AI Concept Coaching, Exam Arenas, and Learning Paths.
    - We support JEE, NEET, and CBSE curriculums.
    - Users can report bugs here or request refunds via email (support@educlarity.ai).
    - If a user is frustrated, apologize and suggest they fill out the 'Ticket Form' on the right side of the screen.
    - Keep answers under 3 sentences unless technical detail is needed.
  `;

  let tools: Tool[] = [];

  if (actions) {
      systemPrompt += `
      \n\n[PRIVILEGED ACCESS: TEACHER MODE]
      You are currently speaking with an authenticated Teacher.
      
      INSTRUCTIONS FOR TEACHER QUERIES:
      1. You can answer specific questions about student grades, attendance, and status.
      2. Identify students "At Risk" if asked.
      3. You can MODIFY the register using tools if the teacher asks to "Add" or "Delete" a student.
      4. If the teacher asks to add a student, ask for details like Grade, Attendance if not provided.
      `;

      if (studentData) {
         systemPrompt += `\n\nCURRENT CLASS REGISTER JSON:\n${JSON.stringify(studentData)}`;
      } else {
         systemPrompt += `\n\nCURRENT CLASS REGISTER IS EMPTY/UNAVAILABLE.`;
      }
      
      tools.push({
         functionDeclarations: [
           {
             name: 'addStudent',
             description: 'Add a new student to the class register.',
             parameters: {
               type: Type.OBJECT,
               properties: {
                 name: { type: Type.STRING, description: 'Full name of the student' },
                 grade: { type: Type.STRING, description: 'Current grade (e.g., A, B, C)' },
                 attendance: { type: Type.STRING, description: 'Attendance percentage (e.g., 85%)' },
                 status: { type: Type.STRING, description: 'Academic status (Stable, At Risk, Excelling)', enum: ['Stable', 'At Risk', 'Excelling'] }
               },
               required: ['name', 'grade', 'attendance', 'status']
             }
           },
           {
             name: 'removeStudent',
             description: 'Remove a student from the class register by Name.',
             parameters: {
               type: Type.OBJECT,
               properties: {
                 studentName: { type: Type.STRING, description: 'Name of the student to remove' }
               },
               required: ['studentName']
             }
           }
         ]
      });
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: systemPrompt,
        tools: tools.length > 0 ? tools : undefined
      },
      history: safeHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await retryWithBackoff<GenerateContentResponse>(() => chat.sendMessage({ message: currentMessage }));
    const _initialResponse = result.text;
    const functionCalls = result.functionCalls;
    
    if (functionCalls && functionCalls.length > 0 && actions) {
        const responseParts: any[] = [];
        
        for (const call of functionCalls) {
            let funcResult = "Error: Function execution failed.";
            try {
              if (call.name === 'addStudent') {
                  funcResult = await actions.addStudent(call.args);
              } else if (call.name === 'removeStudent') {
                  const nameArg = call.args['studentName'] as string;
                  funcResult = await actions.removeStudent(nameArg);
              }
            } catch (err: any) {
              funcResult = `Error executing ${call.name}: ${err.message}`;
            }

            responseParts.push({
                functionResponse: {
                    name: call.name,
                    id: call.id, 
                    response: { result: funcResult }
                }
            });
        }

        try {
            const finalResult = await retryWithBackoff<GenerateContentResponse>(() => chat.sendMessage({ message: responseParts }));
            return finalResult.text || "Action completed.";
        } catch (innerError: any) {
             console.error("Error sending function response:", innerError);
             return `I performed the action, but couldn't confirm it due to a network error: ${innerError.message}`;
        }
    }

    return result.text || "I'm having trouble connecting to the support database. Please try again.";
  } catch (error: any) {
    
    const errMessage = error.message || error.error?.message || "";
    const isQuotaError = errMessage.includes('429') || errMessage.includes('quota') || errMessage.includes('RESOURCE_EXHAUSTED');

    // --- FALLBACK LOGIC FOR TEACHER ACTIONS ---
    // If the API is overloaded, we attempt to parse simple commands locally
    if (actions && isQuotaError) {
        console.warn("Quota exceeded. Attempting local fallback parsing.");
        
        // 1. Fallback: DELETE / REMOVE
        // Regex for "Delete/Remove [Name]"
        // Matches: "delete vihaan kulkarni", "remove student vihaan", "delete student named Arjun"
        const deleteMatch = currentMessage.match(/\b(?:delete|remove)\b\s+(?:student\s+)?(?:named\s+|called\s+)?([a-zA-Z\s]+)/i);
        
        if (deleteMatch && deleteMatch[1]) {
           const targetName = deleteMatch[1].trim().replace(/[.,!?]/g, '');
           try {
             const result = await actions.removeStudent(targetName);
             return `${result} (Note: Processed in Offline Mode due to high AI traffic)`;
           } catch (fallbackErr) {
             console.error("Fallback delete failed", fallbackErr);
           }
        }
        
        // 2. Fallback: ADD
        // Matches: "Add Rahul with Grade A", "Add student Aditi, grade B", "Add new student named Vikram Grade C"
        const addMatch = currentMessage.match(/add\s+(?:a\s+)?(?:new\s+)?student\s+(?:called\s+|named\s+)?([a-zA-Z\s]+?)(?:\s+with\s+grade\s+|\s+grade\s+|\s*,\s*grade\s*|\s*,\s*)([a-zA-Z0-9+-]+)/i);
        
        if (addMatch && addMatch[1] && addMatch[2]) {
             try {
                const name = addMatch[1].trim();
                const grade = addMatch[2].trim();
                const result = await actions.addStudent({ name, grade, attendance: '0%', status: 'Stable' });
                return `${result} (Note: Processed in Offline Mode due to high AI traffic)`;
             } catch (fallbackErr) {
                console.error("Fallback add failed", fallbackErr);
             }
        }
    }
    
    // Only log full error if not handled by fallback
    console.error("Support API Error:", error);

    if (isQuotaError) {
        return "⚠️ I am currently overloaded with requests (Quota Exceeded). Please try again in about a minute.";
    }

    return `System Error: ${error.message || "Unknown error"}. Please check the console or try again later.`;
  }
};

export const generateVisualAid = async (topic: string): Promise<string | undefined> => {
  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a clean, educational diagram or flowchart explaining: ${topic}. White background, clear labels.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    }), 2, 4000); 

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return undefined;
  }
};

export const generateLearningPath = async (subject: string): Promise<LearningNode[]> => {
  const prompt = `Create a structured learning path for: "${subject}". Context: Personalized curriculum.`;

  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                status: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                rationale: { type: Type.STRING }
             }
          }
        }
      }
    }));

    const result = parseJsonSafe(response.text, []);
    if (!Array.isArray(result) || result.length === 0) {
        if (result && Array.isArray((result as any).items)) {
            return (result as any).items;
        }
        return [];
    }
    return result;
  } catch (e) {
    console.error("Learning Path Error", e);
    return [
       {
         id: '1',
         title: `Introduction to ${subject}`,
         description: 'Fundamental concepts and overview.',
         status: 'UNLOCKED',
         difficulty: 'Beginner',
         rationale: 'Starting point for the journey.'
       }
    ];
  }
};

export const generateTeacherInsights = async (studentDataStr: string): Promise<TeacherInsight[]> => {
  const prompt = `
    Analyze this class performance data (JSON) and provide insights.
    Data: ${studentDataStr}
  `;

  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              avgScore: { type: Type.NUMBER },
              difficultyLevel: { type: Type.STRING },
              recommendation: { type: Type.STRING },
            }
          }
        }
      }
    }));
    const res = parseJsonSafe(response.text, []);
    return Array.isArray(res) ? res : [];
  } catch (e) {
    return [];
  }
};

export const generateQuiz = async (topic: string, difficulty: string): Promise<QuizQuestion[]> => {
  const prompt = `
    Generate a quiz about "${topic}". Difficulty: ${difficulty}.
    Target Audience: Indian College Student.
  `;

  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
            }
          }
        }
      }
    }));

    const res = parseJsonSafe(response.text, []);
    return Array.isArray(res) ? res : [];
  } catch (e) {
    console.error("Quiz Gen Error", e);
    return [];
  }
};

export const checkOriginality = async (text: string): Promise<{ score: number; analysis: string }> => {
  const prompt = `
    Analyze the following text for potential plagiarism or lack of originality. 
    Text: "${text.substring(0, 1000)}..."
  `;

  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalityScore: { type: Type.NUMBER },
            analysis: { type: Type.STRING },
          }
        }
      }
    }));
    const res = parseJsonSafe(response.text, {});
    return { score: res.originalityScore || 85, analysis: res.analysis || "Looks good." };
  } catch (e) {
    return { score: 0, analysis: "Error checking originality." };
  }
}