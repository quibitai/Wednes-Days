import { OpenAIProvider } from '../providers/openaiProvider';
import { aiConfig, validateAIConfig } from '../config';
import type { 
  ScheduleProposal, 
  AIInteraction, 
  UserPattern, 
  AIResponse,
  ProposalMetrics 
} from '../types';
import type { ScheduleEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main AI Service - orchestrates all AI functionality
 */
export class AIService {
  private openaiProvider?: OpenAIProvider;
  private initialized = false;

  constructor() {
    const validation = validateAIConfig();
    if (!validation.valid) {
      console.warn('AI Service initialized with missing configuration:', validation.errors);
      // Don't throw error - allow app to run without AI features
    }

    try {
      this.openaiProvider = new OpenAIProvider();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      this.initialized = false;
    }
  }

  /**
   * Check if AI service is ready to use
   */
  isReady(): boolean {
    return this.initialized && !!this.openaiProvider && aiConfig.features.nlpEnabled;
  }

  /**
   * Parse natural language input into structured schedule request
   */
  async parseNaturalLanguage(
    input: string, 
    userId: 'personA' | 'personB'
  ): Promise<{
    success: boolean;
    data?: {
      action: string;
      dates: string[];
      reason: string;
      preferences: any;
      confidence: number;
    };
    error?: string;
    interaction: AIInteraction;
  }> {
    const startTime = Date.now();
    const interactionId = uuidv4();

    if (!this.isReady()) {
      const interaction = this.createInteraction(
        interactionId, userId, 'natural_language', input, 
        'AI service not available', startTime, false
      );
      return {
        success: false,
        error: 'AI service not available',
        interaction
      };
    }

    try {
      const aiResponse = await this.openaiProvider!.parseNaturalLanguage(input, userId);
      
      if (!aiResponse.success) {
        const interaction = this.createInteraction(
          interactionId, userId, 'natural_language', input,
          aiResponse.errorMessage || 'Parsing failed', startTime, false
        );
        return {
          success: false,
          error: aiResponse.errorMessage,
          interaction
        };
      }

      // Parse the JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(aiResponse.response);
      } catch (parseError) {
        const interaction = this.createInteraction(
          interactionId, userId, 'natural_language', input,
          'Invalid JSON response from AI', startTime, false
        );
        return {
          success: false,
          error: 'Could not understand your request. Please try rephrasing.',
          interaction
        };
      }

      // Validate confidence threshold
      if (parsedData.confidence < aiConfig.quality.minConfidenceThreshold) {
        const interaction = this.createInteraction(
          interactionId, userId, 'natural_language', input,
          'Low confidence response', startTime, false
        );
        return {
          success: false,
          error: 'I\'m not confident I understood your request. Could you be more specific?',
          interaction
        };
      }

      const interaction = this.createInteraction(
        interactionId, userId, 'natural_language', input,
        aiResponse.response, startTime, true, parsedData
      );

      return {
        success: true,
        data: parsedData,
        interaction
      };

    } catch (error) {
      const interaction = this.createInteraction(
        interactionId, userId, 'natural_language', input,
        error instanceof Error ? error.message : 'Unknown error', startTime, false
      );
      return {
        success: false,
        error: 'Sorry, I encountered an error processing your request.',
        interaction
      };
    }
  }

  /**
   * Generate a schedule proposal based on unavailable dates
   */
  async generateScheduleProposal(
    unavailableDates: string[],
    currentSchedule: Record<string, ScheduleEntry>,
    userId: 'personA' | 'personB',
    reason: string = '',
    preferences: any = {}
  ): Promise<{
    success: boolean;
    proposal?: ScheduleProposal;
    error?: string;
  }> {
    try {
      if (!this.isReady() || !aiConfig.features.optimizationEnabled) {
        // Fallback to algorithmic approach
        return this.generateAlgorithmicProposal(
          unavailableDates, currentSchedule, userId, reason, preferences
        );
      }

      // AI-enhanced proposal generation
      const optimization = await this.optimizeScheduleWithAI(
        unavailableDates, currentSchedule, preferences
      );

      if (!optimization.success) {
        // Fallback to algorithmic approach
        return this.generateAlgorithmicProposal(
          unavailableDates, currentSchedule, userId, reason, preferences
        );
      }

      const proposal: ScheduleProposal = {
        id: uuidv4(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        status: 'pending',
        title: this.generateProposalTitle(unavailableDates, reason),
        message: reason || `Schedule adjustment for unavailable dates`,
        unavailableDates,
        originalSchedule: currentSchedule,
        proposedSchedule: optimization.optimizedSchedule,
        affectedDateRange: this.calculateAffectedRange(unavailableDates, optimization.optimizedSchedule),
        handoffReduction: optimization.handoffReduction,
        fairnessImpact: optimization.fairnessImpact,
        aiConfidence: optimization.confidence
      };

      return { success: true, proposal };

    } catch (error) {
      console.error('Error generating schedule proposal:', error);
      
      // Fallback to algorithmic approach
      return this.generateAlgorithmicProposal(
        unavailableDates, currentSchedule, userId, reason, preferences
      );
    }
  }

  /**
   * Generate human-friendly explanation for a proposal
   */
  async generateExplanation(
    proposal: ScheduleProposal,
    userType: 'technical' | 'simple' = 'simple'
  ): Promise<{
    success: boolean;
    explanation?: string;
    error?: string;
  }> {
    if (!this.isReady() || !aiConfig.features.explanationsEnabled) {
      return {
        success: true,
        explanation: this.generateFallbackExplanation(proposal)
      };
    }

    try {
      const aiResponse = await this.openaiProvider!.generateExplanation(proposal, userType);
      
      if (aiResponse.success) {
        return {
          success: true,
          explanation: aiResponse.response
        };
      } else {
        return {
          success: true,
          explanation: this.generateFallbackExplanation(proposal)
        };
      }
    } catch (error) {
      return {
        success: true,
        explanation: this.generateFallbackExplanation(proposal)
      };
    }
  }

  /**
   * AI-powered schedule optimization
   */
  private async optimizeScheduleWithAI(
    unavailableDates: string[],
    currentSchedule: Record<string, ScheduleEntry>,
    preferences: any
  ): Promise<{
    success: boolean;
    optimizedSchedule: Record<string, ScheduleEntry>;
    handoffReduction: { before: number; after: number; improvement: number };
    fairnessImpact: { personA: number; personB: number; acceptable: boolean };
    confidence: number;
    reasoning?: string;
  }> {
    // This would contain the AI optimization logic
    // For now, return a simplified algorithmic optimization
    return this.performAlgorithmicOptimization(unavailableDates, currentSchedule, preferences);
  }

  /**
   * Fallback algorithmic proposal generation
   */
  private generateAlgorithmicProposal(
    unavailableDates: string[],
    currentSchedule: Record<string, ScheduleEntry>,
    userId: 'personA' | 'personB',
    reason: string,
    preferences: any
  ): Promise<{
    success: boolean;
    proposal?: ScheduleProposal;
    error?: string;
  }> {
    try {
      const optimization = this.performAlgorithmicOptimization(
        unavailableDates, currentSchedule, preferences
      );

      const proposal: ScheduleProposal = {
        id: uuidv4(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        title: this.generateProposalTitle(unavailableDates, reason),
        message: reason || `Schedule adjustment for unavailable dates`,
        unavailableDates,
        originalSchedule: currentSchedule,
        proposedSchedule: optimization.optimizedSchedule,
        affectedDateRange: this.calculateAffectedRange(unavailableDates, optimization.optimizedSchedule),
        handoffReduction: optimization.handoffReduction,
        fairnessImpact: optimization.fairnessImpact,
        aiConfidence: optimization.confidence
      };

      return Promise.resolve({ success: true, proposal });
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: 'Failed to generate schedule proposal'
      });
    }
  }

  /**
   * Simple algorithmic optimization (placeholder for complex AI logic)
   */
  private performAlgorithmicOptimization(
    unavailableDates: string[],
    currentSchedule: Record<string, ScheduleEntry>,
    preferences: any
  ) {
    // Simple algorithm: just flip the unavailable dates to the other person
    const optimizedSchedule = { ...currentSchedule };
    
    unavailableDates.forEach(date => {
      if (optimizedSchedule[date]) {
        optimizedSchedule[date] = {
          ...optimizedSchedule[date],
          assignedTo: optimizedSchedule[date].assignedTo === 'personA' ? 'personB' : 'personA',
          note: optimizedSchedule[date].note ? 
            `${optimizedSchedule[date].note} (Adjusted for unavailability)` : 
            'Adjusted for unavailability'
        };
      }
    });

    // Calculate handoff reduction (simplified)
    const originalHandoffs = this.countHandoffs(currentSchedule);
    const optimizedHandoffs = this.countHandoffs(optimizedSchedule);

    return {
      success: true,
      optimizedSchedule,
      handoffReduction: {
        before: originalHandoffs,
        after: optimizedHandoffs,
        improvement: originalHandoffs - optimizedHandoffs
      },
      fairnessImpact: { personA: 50, personB: 50, acceptable: true },
      confidence: 0.8,
      reasoning: 'Algorithmic optimization focusing on minimal changes'
    };
  }

  /**
   * Helper methods
   */
  private createInteraction(
    id: string,
    userId: 'personA' | 'personB',
    type: string,
    input: string,
    response: string,
    startTime: number,
    success: boolean,
    structuredOutput?: any
  ): AIInteraction {
    return {
      id,
      userId,
      timestamp: new Date().toISOString(),
      type: type as any,
      userInput: input,
      aiResponse: response,
      structuredOutput,
      responseTimeMs: Date.now() - startTime,
      tokensUsed: { input: 0, output: 0 }, // Would be populated from actual AI response
      costCents: 0,
      success,
      errorMessage: success ? undefined : response
    };
  }

  private generateProposalTitle(unavailableDates: string[], reason: string): string {
    const dateStr = unavailableDates.length === 1 
      ? unavailableDates[0]
      : `${unavailableDates.length} dates`;
    return reason || `Schedule adjustment for ${dateStr}`;
  }

  private calculateAffectedRange(
    unavailableDates: string[], 
    proposedSchedule: Record<string, ScheduleEntry>
  ): { start: string; end: string } {
    const allDates = [...unavailableDates, ...Object.keys(proposedSchedule)].sort();
    return {
      start: allDates[0],
      end: allDates[allDates.length - 1]
    };
  }

  private countHandoffs(schedule: Record<string, ScheduleEntry>): number {
    const dates = Object.keys(schedule).sort();
    let handoffs = 0;
    
    for (let i = 1; i < dates.length; i++) {
      if (schedule[dates[i]].assignedTo !== schedule[dates[i-1]].assignedTo) {
        handoffs++;
      }
    }
    
    return handoffs;
  }

  private generateFallbackExplanation(proposal: ScheduleProposal): string {
    const improvement = proposal.handoffReduction.improvement;
    const impactText = improvement > 0 
      ? `reducing handoffs by ${improvement}` 
      : improvement < 0 
        ? `adding ${Math.abs(improvement)} handoffs`
        : 'maintaining the same number of handoffs';
    
    return `This schedule change addresses the unavailable dates while ${impactText}. The adjustment affects ${proposal.affectedDateRange.start} through ${proposal.affectedDateRange.end}.`;
  }

  /**
   * Get AI service statistics
   */
  getServiceStats() {
    if (!this.initialized || !this.openaiProvider) {
      return { available: false, reason: 'Service not initialized' };
    }

    return {
      available: true,
      features: aiConfig.features,
      usageStats: this.openaiProvider.getUsageStats(),
      costLimits: this.openaiProvider.isWithinCostLimits()
    };
  }
} 