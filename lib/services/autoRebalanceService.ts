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

      // Get all dates and group by fortnight (14-day periods) instead of weekly
      const dates = Object.keys(workingSchedule).sort();
      const fortnightlyGroups = this.groupDatesByFortnight(dates);
      
      // Create single unavailable day record for the fortnight logic
      const unavailableDays = { [unavailableDate]: unavailablePerson };
      
      // Rebalance each fortnight individually using the advanced algorithm
      for (const fortnightDates of fortnightlyGroups) {
        this.rebalanceFortnight(workingSchedule, fortnightDates, unavailableDays);
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
          improvementReason: `Rebalanced using fortnightly periods to target 6-8 nights per person per fortnight, avoiding single-day assignments`
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

      // Get all dates and group by fortnight (14-day periods)
      const dates = Object.keys(workingSchedule).sort();
      const fortnightlyGroups = this.groupDatesByFortnight(dates);
      
      // Rebalance each fortnight individually
      for (const fortnightDates of fortnightlyGroups) {
        this.rebalanceFortnight(workingSchedule, fortnightDates, unavailableDays);
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
          improvementReason: `Rebalanced using fortnightly periods to target 6-8 nights per person per fortnight with ${Object.keys(unavailableDays).length} unavailable days`
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
      const isTargetPersonBlocked = entry?.informationalUnavailability?.[underAssigned];
      
      return entry && 
             entry.assignedTo === overAssigned && 
             !entry.isUnavailable &&
             !isTargetPersonBlocked && // Don't assign to someone who blocked this day
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
      const isTargetPersonBlocked = entry?.informationalUnavailability?.[underAssigned];
      
      return entry && 
             entry.assignedTo === overAssigned && 
             !entry.isUnavailable &&
             !isTargetPersonBlocked && // Don't assign to someone who blocked this day
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
        score += 3; // Higher bonus for creating consecutive days
      }
    }

    // Check next day
    if (dateIndex < allDates.length - 1) {
      const nextDate = allDates[dateIndex + 1];
      const nextEntry = schedule[nextDate];
      if (nextEntry && nextEntry.assignedTo === targetPerson) {
        score += 3; // Higher bonus for creating consecutive days
      }
    }

    // Extra bonus for connecting two existing blocks (bridging)
    if (dateIndex > 0 && dateIndex < allDates.length - 1) {
      const prevDate = allDates[dateIndex - 1];
      const nextDate = allDates[dateIndex + 1];
      const prevEntry = schedule[prevDate];
      const nextEntry = schedule[nextDate];
      
      if (prevEntry && nextEntry && 
          prevEntry.assignedTo === targetPerson && 
          nextEntry.assignedTo === targetPerson) {
        score += 5; // Big bonus for bridging two blocks
      }
    }

    // Look ahead/behind for longer consecutive sequences
    let consecutiveBefore = 0;
    let consecutiveAfter = 0;
    
    // Count consecutive days before
    for (let i = dateIndex - 1; i >= 0; i--) {
      const checkEntry = schedule[allDates[i]];
      if (checkEntry && checkEntry.assignedTo === targetPerson) {
        consecutiveBefore++;
      } else {
        break;
      }
    }
    
    // Count consecutive days after
    for (let i = dateIndex + 1; i < allDates.length; i++) {
      const checkEntry = schedule[allDates[i]];
      if (checkEntry && checkEntry.assignedTo === targetPerson) {
        consecutiveAfter++;
      } else {
        break;
      }
    }
    
    // Bonus for creating longer blocks (exponential bonus)
    const totalConsecutive = consecutiveBefore + consecutiveAfter + 1;
    if (totalConsecutive >= 3) {
      score += totalConsecutive * 2; // Exponential bonus for longer blocks
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

  /**
   * Group dates into 14-day fortnightly periods
   */
  private groupDatesByFortnight(dates: string[]): string[][] {
    const fortnights: string[][] = [];
    for (let i = 0; i < dates.length; i += 14) {
      fortnights.push(dates.slice(i, i + 14));
    }
    return fortnights;
  }

  /**
   * Get custody statistics for a specific period of dates
   */
  private getPeriodStats(schedule: Record<string, ScheduleEntry>, periodDates: string[]): { personA: number; personB: number } {
    const stats = { personA: 0, personB: 0 };
    for (const date of periodDates) {
      const entry = schedule[date];
      if (entry) {
        stats[entry.assignedTo]++;
      }
    }
    return stats;
  }

  /**
   * Rebalance a fortnight (14-day period) with advanced candidate vetting
   */
  private rebalanceFortnight(
    schedule: Record<string, ScheduleEntry>,
    fortnightDates: string[],
    unavailableDays: Record<string, 'personA' | 'personB'>
  ): void {
    const fortnightStats = this.getPeriodStats(schedule, fortnightDates);
    const targetMin = 6;
    const targetMax = 8;

    if (fortnightStats.personA >= targetMin && fortnightStats.personA <= targetMax &&
        fortnightStats.personB >= targetMin && fortnightStats.personB <= targetMax) {
        return;
    }

    const overAssigned = fortnightStats.personA > targetMax ? 'personA' :
                        fortnightStats.personB > targetMax ? 'personB' : null;

    if (!overAssigned) return;
    const underAssigned = overAssigned === 'personA' ? 'personB' : 'personA';

    // Get a list of all days that could possibly be swapped
    const allPossibleSwapDays = fortnightDates.filter(date => {
        const entry = schedule[date];
        return entry &&
               entry.assignedTo === overAssigned &&
               !entry.isUnavailable &&
               !unavailableDays[date] &&
               !entry.informationalUnavailability?.[underAssigned];
    });

    const swapsToMake = Math.min(
        fortnightStats[overAssigned] - targetMax,
        targetMin - fortnightStats[underAssigned],
        allPossibleSwapDays.length
    );

    if (swapsToMake <= 0) return;

    // Iteratively find the best days to swap
    for (let i = 0; i < swapsToMake; i++) {
        let bestCandidate: string | null = null;
        let bestScore = -1;

        // Find the best candidate among the remaining possibilities
        for (const candidateDate of allPossibleSwapDays) {
            // Temporarily apply the swap to check its validity
            const tempSchedule = JSON.parse(JSON.stringify(schedule));
            tempSchedule[candidateDate].assignedTo = underAssigned;

            // Check if this swap creates an island for the 'overAssigned' person
            const dateIndex = fortnightDates.indexOf(candidateDate);
            const prevDate = fortnightDates[dateIndex - 1];
            const nextDate = fortnightDates[dateIndex + 1];

            let createsIsland = false;
            // Check if previous day is now an island
            if (tempSchedule[prevDate]?.assignedTo === overAssigned && 
                tempSchedule[fortnightDates[dateIndex - 2]]?.assignedTo !== overAssigned && 
                tempSchedule[candidateDate]?.assignedTo !== overAssigned) {
                createsIsland = true;
            }
            // Check if next day is now an island
            if (tempSchedule[nextDate]?.assignedTo === overAssigned && 
                tempSchedule[candidateDate]?.assignedTo !== overAssigned && 
                tempSchedule[fortnightDates[dateIndex + 2]]?.assignedTo !== overAssigned) {
                createsIsland = true;
            }

            if (!createsIsland) {
                const score = this.calculateHandoffReductionScore(schedule, candidateDate, fortnightDates, underAssigned);
                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = candidateDate;
                }
            }
        }

        if (bestCandidate) {
            // Apply the best found swap permanently
            schedule[bestCandidate].assignedTo = underAssigned;
            schedule[bestCandidate].originalAssignedTo = schedule[bestCandidate].originalAssignedTo || overAssigned;
            // Remove the swapped day from future consideration
            allPossibleSwapDays.splice(allPossibleSwapDays.indexOf(bestCandidate), 1);
        } else {
            // No valid swap found in this iteration, so we stop
            break;
        }
    }
  }
} 