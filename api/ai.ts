import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!genAI) {
    return res.status(500).json({ error: 'AI Service not configured on server. Please set GEMINI_API_KEY in Vercel settings.' });
  }

  const { task, payload } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    switch (task) {
      case 'coach':
      case 'support':
        const chat = model.startChat({ history: payload.history });
        const result = await chat.sendMessage(payload.message);
        return res.status(200).json({ text: result.response.text() });

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

      default:
        return res.status(400).json({ error: 'Invalid task' });
    }
  } catch (error: any) {
    console.error('Backend AI Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
