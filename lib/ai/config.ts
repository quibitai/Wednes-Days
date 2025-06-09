/**
 * AI Configuration for GPT-4.1-mini integration
 */

export const aiConfig = {
  // OpenAI Configuration
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY,
    maxTokens: 1000,
    temperature: 0.3,
    embeddingModel: 'text-embedding-3-small',
  },

  // Supabase Configuration (optional for AI features)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Vercel Blob Configuration (optional for AI features)
  blob: {
    token: process.env.BLOB_READ_WRITE_TOKEN || '',
    baseUrl: process.env.BLOB_BASE_URL || '',
  },

  // Cost Management
  costs: {
    monthlyLimit: parseInt(process.env.AI_COST_LIMIT_MONTHLY || '50'),
    dailyLimit: parseInt(process.env.AI_COST_LIMIT_DAILY || '5'),
    alertThreshold: 0.8, // Alert at 80% of budget
    trackingEnabled: true,
  },

  // Feature Flags
  features: {
    nlpEnabled: process.env.AI_NLP_ENABLED !== 'false',
    patternLearningEnabled: process.env.AI_PATTERNS_ENABLED !== 'false',
    explanationsEnabled: process.env.AI_EXPLANATIONS_ENABLED !== 'false',
    optimizationEnabled: process.env.AI_OPTIMIZATION_ENABLED !== 'false',
    vectorSearchEnabled: process.env.AI_VECTOR_SEARCH_ENABLED === 'true',
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.AI_CACHE_TTL || '3600'), // 1 hour default
    maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '1000'),
    enabled: process.env.AI_CACHE_ENABLED !== 'false',
  },

  // Performance Settings
  performance: {
    maxRetries: 3,
    timeoutMs: 30000,
    batchSize: 5,
    rateLimitPerMinute: 60,
  },

  // Quality Thresholds
  quality: {
    minConfidenceThreshold: 0.7,
    maxTokensPerRequest: 2000,
    enableFallback: true,
    validateResponses: true,
  },

  // Development Settings
  development: {
    logLevel: process.env.AI_LOG_LEVEL || 'info',
    debugMode: process.env.NODE_ENV === 'development',
    mockResponses: process.env.AI_MOCK_RESPONSES === 'true',
  },
} as const;

// Validation function
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!aiConfig.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  // Only require Supabase if vector search is actually enabled
  if (aiConfig.features.vectorSearchEnabled) {
    if (!aiConfig.supabase.url) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is required when vector search is enabled');
    }
    if (!aiConfig.supabase.anonKey) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required when vector search is enabled');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Cost calculation helpers
export const costCalculator = {
  // GPT-4o-mini pricing
  gpt4oMini: {
    inputCostPer1K: 0.00015, // $0.15 per 1M input tokens
    outputCostPer1K: 0.0006, // $0.60 per 1M output tokens
  },
  
  embedding: {
    costPer1K: 0.00002, // text-embedding-3-small
  },

  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.gpt4oMini.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * this.gpt4oMini.outputCostPer1K;
    return inputCost + outputCost;
  },

  calculateEmbeddingCost(tokens: number): number {
    return (tokens / 1000) * this.embedding.costPer1K;
  },
}; 