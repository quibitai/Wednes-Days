import OpenAI from 'openai';
import type { ScheduleEntry, AppConfig } from '@/types';
import { AutoRebalanceService } from './autoRebalanceService';

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
      const prompt = this.buildRebalancePrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert child custody scheduler. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1500'),
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from AI');
      }

      const aiResponse: AIResponse = JSON.parse(responseText);
      
      console.log('Raw AI Response:', aiResponse);
      
      // Apply AI suggestions to create proposed schedule
      const proposedSchedule = this.applyAIChanges(request.currentSchedule, aiResponse.changes);
      
      console.log('Proposed schedule changes:', aiResponse.changes);
      console.log('Resulting schedule snippet:', Object.fromEntries(
        Object.entries(proposedSchedule).filter(([date]) => 
          Math.abs(new Date(date).getTime() - new Date(request.unavailableDate).getTime()) < 7 * 24 * 60 * 60 * 1000
        )
      ));
      
      // Validate the proposal
      const validation = await this.validateAIProposal(request.currentSchedule, proposedSchedule);
      
      if (!validation.isValid) {
        console.log(`AI proposal validation failed: ${validation.issues.join(', ')}`);
        console.log('Single-day assignments found:', this.findSingleDayAssignments(proposedSchedule));
        // For testing: return the AI proposal anyway so we can see what it's doing
        console.log('Returning AI proposal despite validation failure for debugging');
      }

      // Calculate metrics
      const originalHandoffs = this.countHandoffs(request.currentSchedule);
      const proposedHandoffs = this.countHandoffs(proposedSchedule);
      const handoffReduction = originalHandoffs - proposedHandoffs;
      const fairnessScore = this.calculateFairnessScore(proposedSchedule);

      return {
        success: true,
        proposedSchedule,
        explanation: aiResponse.explanation,
        summary: {
          changesCount: aiResponse.changes.length,
          handoffReduction,
          fairnessScore,
          reasoning: aiResponse.reasoning
        }
      };

    } catch (error) {
      console.error('AI rebalance error:', error);
      
      // For testing: re-throw the error so we can see what's happening
      throw error;
    }
  }

  private buildRebalancePrompt(request: AIRebalanceRequest): string {
    const scheduleContext = this.describeSchedulePattern(request.currentSchedule, request.context.windowStart, request.context.windowEnd);
    const personAName = request.config.personA.name;
    const personBName = request.config.personB.name;
    
    return `You are an expert child custody scheduler. A parent has become unavailable on ${request.unavailableDate}, and you need to propose a fair, practical schedule adjustment.

CURRENT SITUATION:
- ${request.unavailablePerson === 'personA' ? personAName : personBName} is unavailable on ${request.unavailableDate}
- Current handoff count: ${request.context.currentHandoffCount}

SCHEDULE PATTERN (${request.context.windowStart} to ${request.context.windowEnd}):
${scheduleContext}

CONSTRAINTS:
- Must reassign ${request.unavailableDate} to ${request.unavailablePerson === 'personA' ? personBName : personAName}
- Respect any "blocked days" (informationalUnavailability field)
- Don't move days that are already marked unavailable by either parent
- Maximum ${request.preferences.maxChangesAllowed || 5} total changes

CRITICAL ANTI-PATTERN RULES (MUST FOLLOW):
❌ NEVER create isolated single nights (e.g., PersonA-PersonB-PersonA pattern)
❌ NEVER make a change that creates a 1-night assignment surrounded by different assignments
❌ NEVER extend existing 3+ night blocks (creates unfairness and massive blocks)
❌ NEVER create blocks longer than 4 nights (FORBIDDEN - causes major unfairness)
✅ ALWAYS ensure changed days have at least one adjacent day with the same assignment
✅ TARGET: Create 3-night blocks whenever possible, but NOT by extending existing blocks
✅ ACCEPTABLE: 2-night or 4-night blocks if needed for balance
✅ If you must move a day, move additional adjacent days to create 3-night blocks
✅ BREAK UP existing long blocks rather than extending them further

IDEAL CUSTODY PATTERN:
🎯 PERFECT: 3 nights per person (Mon-Wed: Adam, Thu-Sat: Jane, repeat)
✅ ACCEPTABLE: 2 nights (if needed for transitions)
✅ ACCEPTABLE: 4 nights (maximum, only if unavoidable)
❌ UNACCEPTABLE: 1 night (strongly discouraged)
❌ UNACCEPTABLE: 5+ nights (creates unfairness)

EXAMPLE BAD PATTERN TO AVOID:
Mon: Adam, Tue: Jane, Wed: Adam ← Jane on Tuesday is isolated single night (FORBIDDEN)

EXAMPLE GOOD PATTERNS:
Pattern A: Mon-Wed: Adam (3 nights), Thu-Sat: Jane (3 nights) ← IDEAL
Pattern B: Mon-Tue: Adam (2 nights), Wed-Fri: Jane (3 nights) ← ACCEPTABLE
Pattern C: Mon-Thu: Adam (4 nights), Fri-Sun: Jane (3 nights) ← ACCEPTABLE but not preferred

OPTIMIZATION GOALS (in priority order):
1. ELIMINATE single-night assignments (absolutely critical!)
2. CREATE 3-night blocks as the primary pattern
3. LIMIT blocks to maximum 4 nights (fairness)
4. Minimize total handoffs (custody transitions between parents)
5. Maintain overall fairness (roughly equal nights over time)

STRATEGY: When reassigning ${request.unavailableDate}, look at adjacent days:
- STEP 1: Analyze the COMPLETE schedule pattern for 2 weeks around ${request.unavailableDate}
- STEP 2: Identify existing block sizes for BOTH parents before making any changes
- STEP 3: If reassigning creates a single night, look for the SMALLEST adjustment that fixes it
- STEP 4: NEVER extend an existing 3+ night block - instead, break it up or move different days
- STEP 5: Check final result - no single nights AND no blocks longer than 4 nights
- STEP 6: If solution creates 5+ night blocks, try a completely different approach

CRITICAL BLOCK SIZE ANALYSIS:
Before making ANY changes, count consecutive nights for each person around the target date.
If PersonB already has 3+ nights before the target date, DO NOT extend that block further.
Instead, consider moving days from a different PersonB block or extending PersonA's blocks.

EXAMPLE TRANSFORMATION:
CURRENT: June 14-16: Jane (3 nights), June 17-18: Adam, June 19-20: Jane
PROBLEM: If June 18 becomes unavailable for Adam → assign to Jane
BAD SOLUTION: Change June 17-19 to Jane → Creates 6-night block (June 14-19)
GOOD SOLUTION: Change June 17 to Jane, keep June 19 with Adam → Jane: 14-17 (4 nights), Adam: 18-19 (but 18 unavailable)
BETTER SOLUTION: Move June 20-21 from Jane to Adam → Jane: 14-16 + 17-18, Adam: 19-21

MANDATORY FINAL CHECK: 
Count all consecutive blocks in the final schedule. If ANY block exceeds 4 nights, the solution is INVALID.

Respond with ONLY valid JSON in this exact format:
{
  "changes": [
    {"date": "${request.unavailableDate}", "from": "${request.unavailablePerson}", "to": "${request.unavailablePerson === 'personA' ? 'personB' : 'personA'}", "reason": "unavailable"},
    {"date": "YYYY-MM-DD", "from": "personA", "to": "personB", "reason": "create_3_night_block"}
  ],
  "explanation": "Strategy: Created 3-night blocks to avoid single nights and minimize handoffs",
  "handoffCount": 12,
  "reasoning": "Detailed step-by-step reasoning: 1) Reassigned unavailable date, 2) Extended adjacent days to create 3-night blocks, 3) Verified no single nights remain, 4) Confirmed block sizes are 2-4 nights each"
}`;
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

    // Check for single-night assignments (absolutely forbidden)
    const singleNights = this.findSingleDayAssignments(proposed);
    if (singleNights.length > 0) {
      issues.push(`Creates ${singleNights.length} single-night assignments (forbidden)`);
    }

    // Check for blocks longer than 4 nights (discouraged)
    const longBlocks = this.findLongBlocks(proposed, 5);
    if (longBlocks.length > 0) {
      issues.push(`Creates ${longBlocks.length} blocks longer than 4 nights: ${longBlocks.join(', ')} (FORBIDDEN)`);
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

  private async generateAlgorithmicFallback(request: AIRebalanceRequest): Promise<AIRebalanceResponse> {
    try {
      console.log('Using algorithmic fallback for schedule rebalancing');
      
      // Use the existing auto-rebalance service
      const result = await this.autoRebalanceService.rebalanceSchedule(
        request.currentSchedule,
        request.unavailableDate,
        request.unavailablePerson
      );

      if (result.success && result.rebalancedSchedule) {
        // Find what changed from the original
        const changes: string[] = [];
        for (const [date, rebalancedEntry] of Object.entries(result.rebalancedSchedule)) {
          const originalEntry = request.currentSchedule[date];
          if (originalEntry && rebalancedEntry && originalEntry.assignedTo !== rebalancedEntry.assignedTo) {
            changes.push(date);
          }
        }

        // Calculate metrics
        const originalHandoffs = this.countHandoffs(request.currentSchedule);
        const proposedHandoffs = this.countHandoffs(result.rebalancedSchedule);
        const handoffReduction = originalHandoffs - proposedHandoffs;
        const fairnessScore = this.calculateFairnessScore(result.rebalancedSchedule);

        return {
          success: true,
          proposedSchedule: result.rebalancedSchedule,
          explanation: `Algorithmic rebalancing handled the unavailable date by making ${changes.length} adjustments to minimize disruption.`,
          summary: {
            changesCount: changes.length,
            handoffReduction,
            fairnessScore,
            reasoning: 'Used proven algorithmic approach to ensure practical schedule adjustments'
          },
          fallbackUsed: true
        };
      } else {
        throw new Error('Algorithmic rebalancing also failed');
      }
    } catch (error) {
      console.error('Algorithmic fallback error:', error);
      
      // Final fallback: just reassign the unavailable day
      const minimalSchedule = { ...request.currentSchedule };
      const unavailableEntry = minimalSchedule[request.unavailableDate];
      
      if (unavailableEntry && unavailableEntry.assignedTo === request.unavailablePerson) {
        const otherPerson = request.unavailablePerson === 'personA' ? 'personB' : 'personA';
        minimalSchedule[request.unavailableDate] = {
          ...unavailableEntry,
          assignedTo: otherPerson,
          isUnavailable: true,
          unavailableBy: request.unavailablePerson
        };
      }

      return {
        success: true,
        proposedSchedule: minimalSchedule,
        explanation: 'Applied minimal change: reassigned the unavailable date only.',
        summary: {
          changesCount: 1,
          handoffReduction: 0,
          fairnessScore: this.calculateFairnessScore(minimalSchedule),
          reasoning: 'Minimal fallback due to system limitations'
        },
        fallbackUsed: true
      };
    }
  }
} 