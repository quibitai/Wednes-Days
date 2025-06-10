import OpenAI from 'openai';
import { aiConfig, costCalculator } from '../config';
import type { AIRequest, AIResponse } from '../types';

/**
 * OpenAI Provider for GPT-4.1-mini integration
 */
export class OpenAIProvider {
  private openai: OpenAI;
  private requestCount = 0;
  private totalCost = 0;

  constructor() {
    if (!aiConfig.openai.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: aiConfig.openai.apiKey,
    });
  }

  /**
   * Generate completion using GPT-4.1-mini
   */
  async generateCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: {
      maxTokens?: number;
      temperature?: number;
      jsonMode?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: aiConfig.openai.model,
        messages,
        max_tokens: options.maxTokens || aiConfig.openai.maxTokens,
        temperature: options.temperature || aiConfig.openai.temperature,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        stream: false, // Always use non-streaming for consistency
      }) as OpenAI.Chat.ChatCompletion; // Type assertion to ensure we get the non-stream response

      const responseTime = Date.now() - startTime;
      const usage = completion.usage;
      const cost = usage ? costCalculator.calculateCost(usage.prompt_tokens, usage.completion_tokens) : 0;

      this.requestCount++;
      this.totalCost += cost;

      return {
        id: completion.id,
        requestId,
        success: true,
        response: completion.choices[0]?.message?.content || '',
        confidence: this.calculateConfidence(completion),
        tokensUsed: {
          input: usage?.prompt_tokens || 0,
          output: usage?.completion_tokens || 0,
        },
        responseTimeMs: responseTime,
        model: aiConfig.openai.model,
        cached: false,
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Try fallback model if available
      if (aiConfig.openai.fallbackModel && aiConfig.openai.fallbackModel !== aiConfig.openai.model) {
        console.log('Attempting fallback to', aiConfig.openai.fallbackModel);
        return await this.generateWithFallback(messages, options);
      }

      const responseTime = Date.now() - startTime;
      return {
        id: `error_${requestId}`,
        requestId,
        success: false,
        response: null,
        confidence: 0,
        tokensUsed: { input: 0, output: 0 },
        responseTimeMs: responseTime,
        model: aiConfig.openai.model,
        cached: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate completion with fallback model
   */
  private async generateWithFallback(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: any
  ): Promise<AIResponse> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: aiConfig.openai.fallbackModel,
        messages,
        max_tokens: options.maxTokens || aiConfig.openai.maxTokens,
        temperature: options.temperature || aiConfig.openai.temperature,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        stream: false, // Ensure non-streaming
      }) as OpenAI.Chat.ChatCompletion; // Type assertion

      const usage = completion.usage;
      const cost = usage ? costCalculator.calculateCost(usage.prompt_tokens, usage.completion_tokens) : 0;
      this.totalCost += cost;

      return {
        id: completion.id,
        requestId: `fallback_${Date.now()}`,
        success: true,
        response: completion.choices[0]?.message?.content || '',
        confidence: this.calculateConfidence(completion) * 0.9, // Slightly lower confidence for fallback
        tokensUsed: {
          input: usage?.prompt_tokens || 0,
          output: usage?.completion_tokens || 0,
        },
        responseTimeMs: 0,
        model: aiConfig.openai.fallbackModel,
        cached: false,
      };
    } catch (fallbackError) {
      throw new Error(`Both primary and fallback models failed: ${fallbackError}`);
    }
  }

  /**
   * Generate embeddings using text-embedding-3-small
   */
  async generateEmbedding(text: string): Promise<{ embedding: number[]; tokensUsed: number; cost: number }> {
    try {
      const response = await this.openai.embeddings.create({
        model: aiConfig.openai.embeddingModel,
        input: text,
      });

      const tokensUsed = response.usage.total_tokens;
      const cost = costCalculator.calculateEmbeddingCost(tokensUsed);
      this.totalCost += cost;

      return {
        embedding: response.data[0].embedding,
        tokensUsed,
        cost,
      };
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Parse natural language input into structured data
   */
  async parseNaturalLanguage(input: string, userId: string): Promise<AIResponse> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 0-based, so add 1
    
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a custody scheduling assistant. Parse user requests into structured JSON.
        
Current context: ${currentDate.toISOString().split('T')[0]} (${currentYear}-${currentMonth.toString().padStart(2, '0')})

When parsing dates:
- If user says "18th" or "June 18th" without a year, assume they mean the NEXT occurrence
- If current date is June 2024, "June 18th" means June 18, 2025 (next occurrence)
- If they mention a month that has passed this year, assume next year
- Always return dates in YYYY-MM-DD format

When parsing person names:
- "Adam" = "personA"
- "Jane" = "personB"
- If user mentions who should start (e.g., "Adam hands off to Jane"), the receiving person starts

Return ONLY valid JSON in this format:
{
  "action": "mark_unavailable" | "request_swap" | "optimize_schedule" | "explain_schedule" | "reset_pattern",
  "dates": ["YYYY-MM-DD"],
  "reason": "brief reason",
  "preferences": {
    "minPeriodLength": number,
    "maxHandoffs": number,
    "preferWeekends": boolean,
    "startingPerson": "personA" | "personB" | null,
    "patternType": "three_day" | null,
    "resetFromDate": "YYYY-MM-DD" | null
  },
  "confidence": 0.0-1.0
}

For "reset_pattern" actions:
- Use when user wants to reset/regenerate the entire pattern from a specific date
- Set "resetFromDate" to the date they want to start the new pattern
- Set "startingPerson" to who should have custody on that date (if specified)
- For handoff language like "Adam hands off to Jane on July 2nd", Jane (personB) gets custody starting that date
- Examples: "reset three day pattern starting July 2nd", "Adam hands off to Jane on July 2nd through rest of year"`
      },
      {
        role: 'user',
        content: input
      }
    ];

    return await this.generateCompletion(messages, {
      maxTokens: 300,
      temperature: 0.1,
      jsonMode: true,
    });
  }

  /**
   * Generate human-friendly explanations
   */
  async generateExplanation(
    proposal: any,
    userType: 'technical' | 'simple' = 'simple'
  ): Promise<AIResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful assistant explaining custody schedule changes. 
        Be ${userType === 'simple' ? 'clear and friendly' : 'detailed and technical'}.
        Focus on benefits and reasoning. Keep responses concise (2-3 sentences).`
      },
      {
        role: 'user',
        content: `Explain this schedule change:
        - Affected dates: ${proposal.affectedDateRange?.start} to ${proposal.affectedDateRange?.end}
        - Handoffs reduced: ${proposal.handoffReduction?.before} → ${proposal.handoffReduction?.after}
        - Reason: ${proposal.message || 'Schedule optimization'}`
      }
    ];

    return await this.generateCompletion(messages, {
      maxTokens: 200,
      temperature: 0.3,
    });
  }

  /**
   * Calculate confidence score from OpenAI response
   */
  private calculateConfidence(completion: OpenAI.Chat.ChatCompletion): number {
    // Simple heuristic based on response length and finish reason
    const choice = completion.choices[0];
    if (!choice) return 0;

    let confidence = 0.8; // Base confidence

    // Adjust based on finish reason
    if (choice.finish_reason === 'stop') {
      confidence += 0.1;
    } else if (choice.finish_reason === 'length') {
      confidence -= 0.2;
    }

    // Adjust based on response length (very short or very long responses are less confident)
    const responseLength = choice.message?.content?.length || 0;
    if (responseLength < 10) {
      confidence -= 0.3;
    } else if (responseLength > 1000) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { requestCount: number; totalCost: number; avgCostPerRequest: number } {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      avgCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
    };
  }

  /**
   * Check if we're within cost limits
   */
  isWithinCostLimits(): { withinDaily: boolean; withinMonthly: boolean; currentCost: number } {
    // This would need to be enhanced with persistent storage to track daily/monthly costs
    return {
      withinDaily: this.totalCost < aiConfig.costs.dailyLimit,
      withinMonthly: this.totalCost < aiConfig.costs.monthlyLimit,
      currentCost: this.totalCost,
    };
  }
} 