/**
 * AI-enhanced custody scheduling types
 */

export interface ScheduleProposal {
  id: string;
  createdBy: 'personA' | 'personB';
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  
  // Proposal details
  title: string;
  message: string;
  unavailableDates: string[];
  
  // Schedule changes
  originalSchedule: Record<string, import('@/types').ScheduleEntry>;
  proposedSchedule: Record<string, import('@/types').ScheduleEntry>;
  affectedDateRange: { start: string; end: string };
  
  // AI-generated metrics
  handoffReduction: { before: number; after: number; improvement: number };
  fairnessImpact: { personA: number; personB: number; acceptable: boolean };
  aiConfidence: number; // 0-1 confidence score from AI
  
  // Approval tracking
  reviewedAt?: string;
  reviewedBy?: 'personA' | 'personB';
  rejectionReason?: string;
}

export interface AIInteraction {
  id: string;
  userId: 'personA' | 'personB';
  timestamp: string;
  type: 'natural_language' | 'explanation' | 'optimization' | 'pattern_analysis';
  
  // Input/Output
  userInput: string;
  aiResponse: string;
  structuredOutput?: any;
  
  // Performance metrics
  responseTimeMs: number;
  tokensUsed: { input: number; output: number };
  costCents: number;
  
  // Quality metrics
  userFeedback?: 'helpful' | 'not_helpful' | 'incorrect';
  success: boolean;
  errorMessage?: string;
}

export interface UserPattern {
  id: string;
  userId: 'personA' | 'personB';
  patternType: 'preference' | 'rejection_reason' | 'timing' | 'constraint';
  
  // Pattern data
  pattern: string;
  frequency: number;
  confidence: number;
  lastSeen: string;
  
  // Vector embedding for similarity search
  embedding?: number[];
  
  // Context
  seasonality?: 'spring' | 'summer' | 'fall' | 'winter';
  dayOfWeek?: string;
  metadata: Record<string, any>;
}

export interface AIRequest {
  id: string;
  type: 'parse_nl' | 'generate_explanation' | 'optimize_schedule' | 'find_patterns';
  input: any;
  options: AIRequestOptions;
  userId: 'personA' | 'personB';
}

export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
  fallbackToAlgorithm?: boolean;
  confidenceThreshold?: number;
}

export interface AIResponse {
  id: string;
  requestId: string;
  success: boolean;
  response: any;
  confidence: number;
  tokensUsed: { input: number; output: number };
  responseTimeMs: number;
  model: string;
  cached: boolean;
  errorMessage?: string;
}

export interface ScheduleOptimization {
  originalHandoffs: number;
  optimizedHandoffs: number;
  improvementPercentage: number;
  fairnessScore: number;
  constraintViolations: string[];
  confidence: number;
  reasoning: string;
}

export interface SimilarPattern {
  id: string;
  similarity: number;
  metadata: Record<string, any>;
  successRate: number;
  usageCount: number;
}

export interface ProposalMetrics {
  handoffReduction: { before: number; after: number; improvement: number };
  fairnessImpact: { current: number; proposed: number; acceptable: boolean };
  periodQuality: { averageLength: number; fragmentationScore: number };
  constraintViolations: string[];
  aiConfidence: number;
  estimatedAcceptanceProbability: number;
} 