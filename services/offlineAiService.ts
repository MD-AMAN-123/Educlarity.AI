import * as webllm from "@mlc-ai/web-llm";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export class OfflineAIService {
  private engine: webllm.MLCEngineInterface | null = null;
  private modelId = "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC";
  private isLoaded = false;
  private onProgressCallback?: (progress: number) => void;

  constructor() {}

  setOnProgress(callback: (progress: number) => void) {
    this.onProgressCallback = callback;
  }

  async isWebGPUSupported(): Promise<boolean> {
    if (!navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  async init() {
    if (this.isLoaded) return;

    const isSupported = await this.isWebGPUSupported();
    if (!isSupported) {
      throw new Error("WEBGPU_NOT_SUPPORTED");
    }

    try {
      this.engine = await webllm.CreateMLCEngine(this.modelId, {
        initProgressCallback: (report) => {
          if (this.onProgressCallback) {
            const progress = report.progress;
            this.onProgressCallback(Math.round(progress * 100));
          }
        },
      });
      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to initialize Web-LLM:", error);
      throw error;
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    if (!this.engine) {
      await this.init();
    }

    try {
      const reply = await this.engine!.chat.completions.create({
        messages: messages as any,
      });
      return reply.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Offline AI generation error:", error);
      return "Offline AI error. Please check your connection or device storage.";
    }
  }

  async isModelCached(): Promise<boolean> {
    return this.isLoaded;
  }
}

export const offlineAIService = new OfflineAIService();
