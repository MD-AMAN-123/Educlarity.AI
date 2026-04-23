import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// The list of models to try in order of priority (no deprecated names)
const MODEL_PRIORITY = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro"];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!genAI) {
    return res.status(500).json({ error: 'AI Service not configured on server. Please set GEMINI_API_KEY in Vercel settings.' });
  }

  const { task, payload } = req.body;

  // Try each model until one works
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      switch (task) {
        case 'coach':
        case 'support':
          const chat = model.startChat({ history: payload.history });
          const chatResult = await chat.sendMessage(payload.message);
          return res.status(200).json({ text: chatResult.response.text() });

        case 'roadmap':
        case 'quiz':
        case 'insights':
        case 'assignment':
        case 'originality':
        case 'visual':
          const genRes = await model.generateContent(payload.prompt);
          return res.status(200).json({ text: genRes.response.text() });

        case 'vision':
          const visionRes = await model.generateContent([
            payload.prompt,
            { inlineData: { data: payload.image, mimeType: "image/jpeg" } }
          ]);
          return res.status(200).json({ text: visionRes.response.text() });
      }
    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error.message);
      // If this was the last model, throw the error
      if (modelName === MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
        return res.status(500).json({ error: `AI Error: All models failed. ${error.message}` });
      }
      // Otherwise, continue to the next model in the loop
      continue;
    }
  }

  return res.status(500).json({ error: 'AI Error: No models available.' });
}
