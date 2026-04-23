import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI Service not configured on server." }), { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const { task, payload } = await req.json();

  try {
    const model = genAI.getGenerativeModel({ 
      model: payload.model || "gemini-1.5-flash",
      systemInstruction: payload.systemInstruction 
    });

    if (payload.stream) {
      const result = await model.generateContentStream({ contents: payload.contents });
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of result.stream) {
            controller.enqueue(encoder.encode(chunk.text()));
          }
          controller.close();
        },
      });
      return new Response(stream);
    } else {
      let result;
      if (task === 'vision') {
        result = await model.generateContent([
          payload.prompt,
          { inlineData: { data: payload.image, mimeType: "image/jpeg" } }
        ]);
      } else if (payload.contents) {
        result = await model.generateContent({ contents: payload.contents });
      } else {
        result = await model.generateContent(payload.prompt);
      }
      
      const response = await result.response;
      let text = response.text();
      
      // Clean up JSON if Gemini wrapped it in markdown
      if (text.includes("```")) {
        text = text.replace(/```json|```/g, "").trim();
      }

      return new Response(JSON.stringify({ text }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Backend AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
