import type { AIGatewayRequest, AIGatewayResponse } from '../types/ai';

export interface IAIGateway {
  request<T = any>(req: AIGatewayRequest): Promise<AIGatewayResponse<T>>;
}

class AIGateway implements IAIGateway {
  private apiKey: string | null = null;
  private queue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private minIntervalMs = 300; // Rate limiter throttle

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
  }

  async request<T = any>(req: AIGatewayRequest): Promise<AIGatewayResponse<T>> {
    return new Promise((resolve) => {
      // Add to execution queue
      this.queue.push(async () => {
        const response = await this.executeWithRetry<T>(req);
        resolve(response);
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - timeSinceLast));
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.isProcessingQueue = false;
  }

  private async executeWithRetry<T>(
    req: AIGatewayRequest,
    retries = 3
  ): Promise<AIGatewayResponse<T>> {
    const timeoutMs = req.timeoutMs || 15000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // If no API key set, fallback to Local Engine
        if (!this.apiKey) {
          return {
            success: false,
            data: null as unknown as T,
            rawText: '',
            cached: false,
            fallback: true,
            error: 'No Gemini API key provided. Using modular local engine.',
          };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Forward external signal cancellation if present
        if (req.signal) {
          req.signal.addEventListener('abort', () => controller.abort());
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${
          req.model || 'gemini-1.5-flash'
        }:generateContent?key=${this.apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: req.prompt }] }],
            generationConfig: {
              temperature: req.temperature ?? 0.7,
              maxOutputTokens: req.maxTokens || req.maxOutputTokens || 1024,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const rawText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Try JSON parsing if requested schema or structured data expected
        let parsedData: T = null as unknown as T;
        try {
          parsedData = JSON.parse(rawText) as T;
        } catch {
          parsedData = rawText as unknown as T;
        }

        return {
          success: true,
          data: parsedData,
          rawText,
          cached: false,
          fallback: false,
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return {
            success: false,
            data: null as unknown as T,
            rawText: '',
            cached: false,
            fallback: true,
            error: 'Request timed out or was cancelled.',
          };
        }

        // Retry with exponential backoff
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        } else {
          return {
            success: false,
            data: null as unknown as T,
            rawText: '',
            cached: false,
            fallback: true,
            error: err?.message || 'AI Gateway request failed after retries.',
          };
        }
      }
    }

    return {
      success: false,
      data: null as unknown as T,
      rawText: '',
      cached: false,
      fallback: true,
      error: 'Max retries exceeded.',
    };
  }
}

export const aiGateway = new AIGateway();
