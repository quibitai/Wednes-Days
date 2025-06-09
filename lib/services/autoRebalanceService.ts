import type { CustodySchedule, ScheduleEntry } from '@/types';

export interface RebalanceResult {
  success: boolean;
  rebalancedSchedule?: Record<string, ScheduleEntry>;
  summary?: {
    changesCount: number;
    personADays: number;
    personBDays: number;
    handoffCount: number;
    improvementReason: string;
  };
  error?: string;
}

export class AutoRebalanceService {
  private TARGET_DAYS_PER_WEEK = 3;
  private MAX_DAYS_PER_WEEK = 4;

  /**
   * Automatically rebalance schedule when a day is marked unavailable
   */
  async rebalanceSchedule(
    currentSchedule: Record<string, ScheduleEntry>,
    unavailableDate: string,
    unavailablePerson: 'personA' | 'personB'
  ): Promise<RebalanceResult> {
    try {
      // Create a working copy
      const workingSchedule = { ...currentSchedule };
      
      // Ensure the unavailable date is assigned to the other person
      const otherPerson = unavailablePerson === 'personA' ? 'personB' : 'personA';
      if (workingSchedule[unavailableDate]) {
        workingSchedule[unavailableDate] = {
          ...workingSchedule[unavailableDate],
          assignedTo: otherPerson,
          isUnavailable: true,
          unavailableBy: unavailablePerson
        };
      }

      // Get all dates and group by week
      const dates = Object.keys(workingSchedule).sort();
      const weeklyGroups = this.groupDatesByWeek(dates);
      
      // Rebalance each week individually
      for (const weekDates of weeklyGroups) {
        this.rebalanceWeek(workingSchedule, weekDates, unavailableDate, unavailablePerson);
      }

      // Count changes and final stats
      const changes = this.countChanges(currentSchedule, workingSchedule);
      const finalStats = this.getDistributionStats(workingSchedule);
      const handoffCount = this.countHandoffs(workingSchedule);

      return {
        success: true,
        rebalancedSchedule: workingSchedule,
        summary: {
          changesCount: changes,
          personADays: finalStats.personA,
          personBDays: finalStats.personB,
          handoffCount,
          improvementReason: `Rebalanced to target ${this.TARGET_DAYS_PER_WEEK} nights per person per week`
        }
      };

    } catch (error) {
      console.error('Error rebalancing schedule:', error);
      return {
        success: false,
        error: 'Failed to rebalance schedule'
      };
    }
  }

  /**
   * Automatically rebalance schedule when multiple days are marked unavailable
   */
  async rebalanceScheduleMultiple(
    currentSchedule: Record<string, ScheduleEntry>,
    unavailableDays: Record<string, 'personA' | 'personB'>
  ): Promise<RebalanceResult> {
    try {
      // Create a working copy
      const workingSchedule = { ...currentSchedule };
      
      // First, reassign all unavailable days to the other person
      for (const [date, unavailablePerson] of Object.entries(unavailableDays)) {
        const otherPerson = unavailablePerson === 'personA' ? 'personB' : 'personA';
        if (workingSchedule[date]) {
          workingSchedule[date] = {
            ...workingSchedule[date],
            assignedTo: otherPerson,
            isUnavailable: true,
            unavailableBy: unavailablePerson
          };
        }
      }

      // Get all dates and group by week
      const dates = Object.keys(workingSchedule).sort();
      const weeklyGroups = this.groupDatesByWeek(dates);
      
      // Rebalance each week individually
      for (const weekDates of weeklyGroups) {
        this.rebalanceWeekMultiple(workingSchedule, weekDates, unavailableDays);
      }

      // Count changes and final stats
      const changes = this.countChanges(currentSchedule, workingSchedule);
      const finalStats = this.getDistributionStats(workingSchedule);
      const handoffCount = this.countHandoffs(workingSchedule);

      return {
        success: true,
        rebalancedSchedule: workingSchedule,
        summary: {
          changesCount: changes,
          personADays: finalStats.personA,
          personBDays: finalStats.personB,
          handoffCount,
          improvementReason: `Rebalanced to target ${this.TARGET_DAYS_PER_WEEK} nights per person per week with ${Object.keys(unavailableDays).length} unavailable days`
        }
      };

    } catch (error) {
      console.error('Error rebalancing schedule:', error);
      return {
        success: false,
        error: 'Failed to rebalance schedule'
      };
    }
  }

  /**
   * Rebalance a single week to target 3-4 nights per person
   */
  private rebalanceWeek(
    schedule: Record<string, ScheduleEntry>,
    weekDates: string[],
    unavailableDate: string,
    unavailablePerson: 'personA' | 'personB'
  ): void {
    const otherPerson = unavailablePerson === 'personA' ? 'personB' : 'personA';
    
    // Get current weekly distribution
    const weekStats = this.getWeekStats(schedule, weekDates);
    
    // If week is already balanced (3-4 each), no changes needed
    if (weekStats.personA >= 3 && weekStats.personA <= 4 && 
        weekStats.personB >= 3 && weekStats.personB <= 4) {
      return;
    }

    // Find who has too many/few days this week
    const overAssigned = weekStats.personA > 4 ? 'personA' : 
                        weekStats.personB > 4 ? 'personB' : null;
    
    if (!overAssigned) return;
    
    const underAssigned = overAssigned === 'personA' ? 'personB' : 'personA';
    
    // Find days we can swap (not unavailable, assigned to overAssigned person)
    const swapCandidates = weekDates.filter(date => {
      const entry = schedule[date];
      return entry && 
             entry.assignedTo === overAssigned && 
             !entry.isUnavailable &&
             date !== unavailableDate; // Don't touch the unavailable date
    });

    // Calculate how many swaps we need
    const excessDays = Math.max(0, weekStats[overAssigned] - 4);
    const neededDays = Math.max(0, 3 - weekStats[underAssigned]);
    const swapsNeeded = Math.min(excessDays, neededDays, swapCandidates.length);

    // Perform swaps, preferring to create consecutive blocks
    const sortedCandidates = this.sortCandidatesByHandoffReduction(
      schedule, 
      swapCandidates, 
      weekDates, 
      underAssigned
    );

    for (let i = 0; i < swapsNeeded; i++) {
      const dateToSwap = sortedCandidates[i];
      schedule[dateToSwap] = {
        ...schedule[dateToSwap],
        assignedTo: underAssigned,
        originalAssignedTo: schedule[dateToSwap].originalAssignedTo || overAssigned
      };
    }
  }

  /**
   * Rebalance a single week considering multiple unavailable days
   */
  private rebalanceWeekMultiple(
    schedule: Record<string, ScheduleEntry>,
    weekDates: string[],
    unavailableDays: Record<string, 'personA' | 'personB'>
  ): void {
    // Get current weekly distribution
    const weekStats = this.getWeekStats(schedule, weekDates);
    
    // If week is already balanced (3-4 each), no changes needed
    if (weekStats.personA >= 3 && weekStats.personA <= 4 && 
        weekStats.personB >= 3 && weekStats.personB <= 4) {
      return;
    }

    // Find who has too many/few days this week
    const overAssigned = weekStats.personA > 4 ? 'personA' : 
                        weekStats.personB > 4 ? 'personB' : null;
    
    if (!overAssigned) return;
    
    const underAssigned = overAssigned === 'personA' ? 'personB' : 'personA';
    
    // Find days we can swap (not unavailable, assigned to overAssigned person)
    const swapCandidates = weekDates.filter(date => {
      const entry = schedule[date];
      return entry && 
             entry.assignedTo === overAssigned && 
             !entry.isUnavailable &&
             !unavailableDays[date]; // Don't touch any unavailable dates
    });

    // Calculate how many swaps we need
    const excessDays = Math.max(0, weekStats[overAssigned] - 4);
    const neededDays = Math.max(0, 3 - weekStats[underAssigned]);
    const swapsNeeded = Math.min(excessDays, neededDays, swapCandidates.length);

    // Perform swaps, preferring to create consecutive blocks
    const sortedCandidates = this.sortCandidatesByHandoffReduction(
      schedule, 
      swapCandidates, 
      weekDates, 
      underAssigned
    );

    for (let i = 0; i < swapsNeeded; i++) {
      const dateToSwap = sortedCandidates[i];
      schedule[dateToSwap] = {
        ...schedule[dateToSwap],
        assignedTo: underAssigned,
        originalAssignedTo: schedule[dateToSwap].originalAssignedTo || overAssigned
      };
    }
  }

  /**
   * Sort swap candidates to minimize handoffs
   */
  private sortCandidatesByHandoffReduction(
    schedule: Record<string, ScheduleEntry>,
    candidates: string[],
    allDates: string[],
    targetPerson: 'personA' | 'personB'
  ): string[] {
    return candidates.sort((a, b) => {
      const scoreA = this.calculateHandoffReductionScore(schedule, a, allDates, targetPerson);
      const scoreB = this.calculateHandoffReductionScore(schedule, b, allDates, targetPerson);
      return scoreB - scoreA; // Higher score = better for reducing handoffs
    });
  }

  /**
   * Calculate how much swapping this date would reduce handoffs
   */
  private calculateHandoffReductionScore(
    schedule: Record<string, ScheduleEntry>,
    date: string,
    allDates: string[],
    targetPerson: 'personA' | 'personB'
  ): number {
    const dateIndex = allDates.indexOf(date);
    let score = 0;

    // Check previous day
    if (dateIndex > 0) {
      const prevDate = allDates[dateIndex - 1];
      const prevEntry = schedule[prevDate];
      if (prevEntry && prevEntry.assignedTo === targetPerson) {
        score += 2; // Bonus for creating consecutive days
      }
    }

    // Check next day
    if (dateIndex < allDates.length - 1) {
      const nextDate = allDates[dateIndex + 1];
      const nextEntry = schedule[nextDate];
      if (nextEntry && nextEntry.assignedTo === targetPerson) {
        score += 2; // Bonus for creating consecutive days
      }
    }

    return score;
  }

  /**
   * Group dates by week (Sunday to Saturday)
   */
  private groupDatesByWeek(dates: string[]): string[][] {
    const weeks: string[][] = [];
    let currentWeek: string[] = [];
    
    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay(); // 0 = Sunday
      
      // If we hit Sunday and have a current week, start new week
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentWeek.push(date);
    }
    
    // Add the last week if it has dates
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }

  /**
   * Get stats for a specific week
   */
  private getWeekStats(
    schedule: Record<string, ScheduleEntry>, 
    weekDates: string[]
  ): { personA: number; personB: number } {
    const stats = { personA: 0, personB: 0 };
    
    for (const date of weekDates) {
      const entry = schedule[date];
      if (entry) {
        stats[entry.assignedTo]++;
      }
    }
    
    return stats;
  }

  /**
   * Check if the overall distribution is balanced
   */
  private isBalanced(stats: { personA: number; personB: number }): boolean {
    const diff = Math.abs(stats.personA - stats.personB);
    return diff <= 1; // Allow difference of 1 day
  }

  /**
   * Get overall distribution stats
   */
  private getDistributionStats(entries: Record<string, ScheduleEntry>): { personA: number; personB: number } {
    const stats = { personA: 0, personB: 0 };
    
    for (const entry of Object.values(entries)) {
      if (entry && entry.assignedTo) {
        stats[entry.assignedTo]++;
      }
    }
    
    return stats;
  }

  /**
   * Count total handoffs in the schedule
   */
  private countHandoffs(entries: Record<string, ScheduleEntry>): number {
    const dates = Object.keys(entries).sort();
    let handoffs = 0;
    
    for (let i = 1; i < dates.length; i++) {
      const prevEntry = entries[dates[i - 1]];
      const currEntry = entries[dates[i]];
      
      if (prevEntry && currEntry && prevEntry.assignedTo !== currEntry.assignedTo) {
        handoffs++;
      }
    }
    
    return handoffs;
  }

  /**
   * Count changes between original and rebalanced schedule
   */
  private countChanges(
    originalEntries: Record<string, ScheduleEntry>,
    rebalancedEntries: Record<string, ScheduleEntry>
  ): number {
    let changes = 0;
    
    for (const date of Object.keys(originalEntries)) {
      const original = originalEntries[date];
      const rebalanced = rebalancedEntries[date];
      
      if (original && rebalanced && original.assignedTo !== rebalanced.assignedTo) {
        changes++;
      }
    }
    
    return changes;
  }
} 