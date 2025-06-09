import OpenAI from 'openai';
import type { ScheduleEntry, AppConfig } from '@/types';
import { AutoRebalanceService } from './autoRebalanceService';
import { extractJsonFromAiResponse } from '@/lib/utils/jsonUtils';

export interface AIRebalanceRequest {
  currentSchedule: Record<string, ScheduleEntry>;
  unavailableDate: string;
  unavailablePerson: 'personA' | 'personB';
  config: AppConfig;
  context: {
    windowStart: string;
    windowEnd: string;
    currentHandoffCount: number;
    recentChanges?: string[];
  };
  preferences: {
    minimizeHandoffs: boolean;
    preferLongerBlocks: boolean;
    maintainFairness: boolean;
    maxChangesAllowed?: number;
  };
}

export interface AIRebalanceResponse {
  success: boolean;
  proposedSchedule?: Record<string, ScheduleEntry>;
  explanation: string;
  summary: {
    changesCount: number;
    handoffReduction: number;
    fairnessScore: number;
    reasoning: string;
  };
  fallbackUsed?: boolean;
}

interface AIScheduleChange {
  date: string;
  from: 'personA' | 'personB';
  to: 'personA' | 'personB';
  reason: string;
}

interface AIResponse {
  changes: AIScheduleChange[];
  explanation: string;
  handoffCount: number;
  reasoning: string;
}

export class AIRebalanceService {
  private openai: OpenAI;
  private autoRebalanceService = new AutoRebalanceService();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async proposeRebalance(request: AIRebalanceRequest): Promise<AIRebalanceResponse> {
    try {
      // 1. First, generate a valid, safe schedule using the deterministic algorithm
      const algorithmicResult = await this.autoRebalanceService.rebalanceSchedule(
        request.currentSchedule,
        request.unavailableDate,
        request.unavailablePerson
      );

      if (!algorithmicResult.success || !algorithmicResult.rebalancedSchedule) {
        throw new Error('Algorithmic fallback failed to produce a schedule.');
      }

      // 2. Now, build a prompt asking the AI to *optimize* this valid schedule
      const optimizationPrompt = this.buildOptimizationPrompt(algorithmicResult.rebalancedSchedule, request);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert schedule optimizer. Respond only with valid JSON.' },
          { role: 'user', content: optimizationPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        // If AI gives no response, the algorithmic one is still a success
        return this.createSuccessResponseFromSchedule(algorithmicResult.rebalancedSchedule, 'AI failed to respond, using algorithmic result.');
      }

      const aiResponse: AIResponse = extractJsonFromAiResponse(responseText);

      // If AI returns no changes, it's still a success, we just use the algorithmic one.
      if (aiResponse.changes.length === 0) {
        return this.createSuccessResponseFromSchedule(algorithmicResult.rebalancedSchedule, aiResponse.explanation || 'AI found no improvements, using algorithmic result.');
      }

      const proposedSchedule = this.applyAIChanges(algorithmicResult.rebalancedSchedule, aiResponse.changes);
      
      const validation = await this.validateAIProposal(algorithmicResult.rebalancedSchedule, proposedSchedule);
      if (!validation.isValid) {
        console.warn('AI optimization failed validation, using algorithmic result.', validation.issues);
        return this.createSuccessResponseFromSchedule(algorithmicResult.rebalancedSchedule, `AI proposal was invalid: ${validation.issues.join(', ')}`);
      }

      return this.createSuccessResponseFromSchedule(proposedSchedule, aiResponse.explanation, aiResponse.changes.length);

    } catch (error) {
      console.error('AI optimization process failed:', error);
      // Fallback to a simple algorithmic rebalance if the whole process fails
      const fallbackResult = await this.autoRebalanceService.rebalanceSchedule(
        request.currentSchedule,
        request.unavailableDate,
        request.unavailablePerson
      );
      if (fallbackResult.rebalancedSchedule) {
        return this.createSuccessResponseFromSchedule(fallbackResult.rebalancedSchedule, 'AI process failed, using algorithmic result.');
      }
      // This part should ideally not be reached
      throw new Error("Catastrophic failure in AI rebalancing and its fallback.");
    }
  }

  private buildOptimizationPrompt(
    validSchedule: Record<string, ScheduleEntry>,
    request: AIRebalanceRequest
  ): string {
    const scheduleContext = this.describeSchedulePattern(validSchedule, request.context.windowStart, request.context.windowEnd);
    const personAName = request.config.personA.name;
    const personBName = request.config.personB.name;
    const initialHandoffs = this.countHandoffs(validSchedule);

    return `
You are an expert schedule OPTIMIZER. Your task is to improve an existing, valid schedule.

CURRENT VALID SCHEDULE (generated by an algorithm):
This schedule is already valid but may have too many handoffs.
Handoff Count: ${initialHandoffs}
${scheduleContext}

YOUR GOAL:
Improve this schedule by REDUCING THE NUMBER OF HANDOFFS (custody transitions).

STRICT RULES FOR YOUR CHANGES:
1.  You can ONLY swap assignments. Do not change the total number of days each person has.
2.  The final schedule MUST NOT have any single-night assignments.
3.  The final schedule MUST NOT have any custody blocks longer than 4 nights.
4.  If you cannot improve the schedule without breaking these rules, respond with an empty "changes" array.

Respond with ONLY valid JSON with the changes you made.
    `;
  }
  
  // Helper to create a standard success response
  private createSuccessResponseFromSchedule(
    schedule: Record<string, ScheduleEntry>, 
    explanation: string,
    changesCount = 0
  ): AIRebalanceResponse {
    const handoffReduction = this.countHandoffs(schedule) - this.countHandoffs(schedule);
    const fairnessScore = this.calculateFairnessScore(schedule);

    return {
      success: true,
      proposedSchedule: schedule,
      explanation,
      summary: {
        changesCount,
        handoffReduction,
        fairnessScore,
        reasoning: explanation,
      },
    };
  }

  private describeSchedulePattern(
    schedule: Record<string, ScheduleEntry>, 
    windowStart: string, 
    windowEnd: string
  ): string {
    const windowDates = Object.keys(schedule)
      .filter(date => date >= windowStart && date <= windowEnd)
      .sort();

    let description = '';
    let currentBlock = { person: '', start: '', count: 0 };
    
    for (const date of windowDates) {
      const entry = schedule[date];
      if (entry) {
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const person = entry.assignedTo;
        
        // Track blocks
        if (person !== currentBlock.person) {
          if (currentBlock.person) {
            description += `\n>>> BLOCK: ${currentBlock.person} has ${currentBlock.count} nights (${currentBlock.start} onwards) <<<`;
          }
          currentBlock = { person, start: date, count: 1 };
        } else {
          currentBlock.count++;
        }
        
        description += `\n${date} (${dayOfWeek}): ${person}`;
      }
    }
    
    // Final block
    if (currentBlock.person) {
      description += `\n>>> BLOCK: ${currentBlock.person} has ${currentBlock.count} nights (${currentBlock.start} onwards) <<<`;
    }

    return description;
  }

  private applyAIChanges(
    originalSchedule: Record<string, ScheduleEntry>,
    changes: AIScheduleChange[]
  ): Record<string, ScheduleEntry> {
    const newSchedule = { ...originalSchedule };

    for (const change of changes) {
      if (newSchedule[change.date]) {
        newSchedule[change.date] = {
          ...newSchedule[change.date],
          assignedTo: change.to,
          originalAssignedTo: newSchedule[change.date].originalAssignedTo || change.from
        };
      }
    }

    return newSchedule;
  }

  private async validateAIProposal(
    original: Record<string, ScheduleEntry>,
    proposed: Record<string, ScheduleEntry>
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    const singleNights = this.findSingleDayAssignments(proposed);
    if (singleNights.length > 0) {
      issues.push(`Creates ${singleNights.length} single-night assignments, which is forbidden. Dates: ${singleNights.join(', ')}`);
    }

    const longBlocks = this.findLongBlocks(proposed, 5); // Check for blocks of 5 or more
    if (longBlocks.length > 0) {
      issues.push(`Creates ${longBlocks.length} blocks longer than 4 nights, which is forbidden: ${longBlocks.join(', ')}`);
    }

    // Check fairness (allow up to 4 nights difference for larger schedules)
    const distribution = this.getDistribution(proposed);
    const totalDays = distribution.personA + distribution.personB;
    const maxAllowedDifference = Math.max(3, Math.floor(totalDays * 0.15)); // 15% of total or 3, whichever is larger
    
    if (Math.abs(distribution.personA - distribution.personB) > maxAllowedDifference) {
      issues.push(`Creates unfair distribution (difference: ${Math.abs(distribution.personA - distribution.personB)}, max allowed: ${maxAllowedDifference})`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private findSingleDayAssignments(schedule: Record<string, ScheduleEntry>): string[] {
    const dates = Object.keys(schedule).sort();
    const singleDays: string[] = [];

    for (let i = 0; i < dates.length; i++) {
      const currentDate = dates[i];
      const currentEntry = schedule[currentDate];
      
      if (!currentEntry) continue;

      const prevDate = dates[i - 1];
      const nextDate = dates[i + 1];
      const prevEntry = schedule[prevDate];
      const nextEntry = schedule[nextDate];

      const isPrevDifferent = !prevEntry || prevEntry.assignedTo !== currentEntry.assignedTo;
      const isNextDifferent = !nextEntry || nextEntry.assignedTo !== currentEntry.assignedTo;

      if (isPrevDifferent && isNextDifferent) {
        singleDays.push(currentDate);
      }
    }

    return singleDays;
  }

  private findLongBlocks(schedule: Record<string, ScheduleEntry>, maxNights: number): string[] {
    const longBlocks: string[] = [];
    const dates = Object.keys(schedule).sort();

    for (let i = 0; i < dates.length; i++) {
      const currentDate = dates[i];
      const currentEntry = schedule[currentDate];
      
      if (!currentEntry) continue;

      // Count consecutive nights for this person
      let blockLength = 1;
      let j = i + 1;
      
      while (j < dates.length && schedule[dates[j]]?.assignedTo === currentEntry.assignedTo) {
        blockLength++;
        j++;
      }

      if (blockLength >= maxNights) {
        longBlocks.push(`${currentDate} (${blockLength} nights)`);
      }
      
      // Skip the rest of this block to avoid double-counting
      i = j - 1;
    }

    return longBlocks;
  }

  private getDistribution(schedule: Record<string, ScheduleEntry>): { personA: number; personB: number } {
    const stats = { personA: 0, personB: 0 };
    
    for (const entry of Object.values(schedule)) {
      if (entry && entry.assignedTo) {
        stats[entry.assignedTo]++;
      }
    }
    
    return stats;
  }

  private countHandoffs(schedule: Record<string, ScheduleEntry>): number {
    const dates = Object.keys(schedule).sort();
    let handoffs = 0;
    
    for (let i = 1; i < dates.length; i++) {
      const prevEntry = schedule[dates[i - 1]];
      const currEntry = schedule[dates[i]];
      
      if (prevEntry && currEntry && prevEntry.assignedTo !== currEntry.assignedTo) {
        handoffs++;
      }
    }
    
    return handoffs;
  }

  private calculateFairnessScore(schedule: Record<string, ScheduleEntry>): number {
    const distribution = this.getDistribution(schedule);
    const totalDays = distribution.personA + distribution.personB;
    
    if (totalDays === 0) return 10;
    
    const idealSplit = totalDays / 2;
    const deviation = Math.abs(distribution.personA - idealSplit);
    const maxScore = 10;
    const score = Math.max(0, maxScore - (deviation / idealSplit) * maxScore);
    
    return Math.round(score * 10) / 10;
  }
} 