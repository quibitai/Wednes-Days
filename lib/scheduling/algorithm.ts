import { format, addDays, parseISO, isAfter, isBefore, startOfDay, subDays } from 'date-fns';
import type { 
  CustodySchedule, 
  ScheduleEntry, 
  UnavailabilityRequest, 
  ScheduleAdjustment,
  ValidationResult,
  CustodyPeriod 
} from '@/types';

/**
 * Core scheduling algorithm for dog custody management
 * 
 * Key Principles:
 * 1. Default 3-on, 3-off rotation
 * 2. Maximum 4 consecutive days per person
 * 3. Minimize handoffs to reduce stress on elderly dog
 * 4. Flexible unavailability: "unavailable" means can't have overnight responsibility,
 *    but can still hand off during that day
 */
export class CustodySchedulingAlgorithm {
  private readonly MAX_CONSECUTIVE_DAYS = 4;
  private readonly DEFAULT_ROTATION_DAYS = 3;

  /**
   * Generates initial schedule with default 3-on, 3-off rotation
   */
  generateInitialSchedule(
    startDate: string, 
    initialPerson: 'personA' | 'personB',
    daysToGenerate: number = 90
  ): CustodySchedule {
    const entries: Record<string, ScheduleEntry> = {};
    let currentDate = parseISO(startDate);
    let currentPerson = initialPerson;
    let consecutiveDays = 0;

    for (let i = 0; i < daysToGenerate; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      entries[dateStr] = {
        date: dateStr,
        assignedTo: currentPerson,
        isUnavailable: false,
      };

      consecutiveDays++;

      // Switch person after DEFAULT_ROTATION_DAYS
      if (consecutiveDays >= this.DEFAULT_ROTATION_DAYS) {
        currentPerson = currentPerson === 'personA' ? 'personB' : 'personA';
        consecutiveDays = 0;
      }

      currentDate = addDays(currentDate, 1);
    }

    return {
      entries,
      startDate,
      initialPerson,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Processes unavailability requests with flexible interpretation:
   * "Unavailable on Monday" means can't have overnight responsibility ending Monday,
   * but can still hand off during Monday if needed.
   */
  processUnavailabilityRequest(
    schedule: CustodySchedule,
    request: UnavailabilityRequest,
    config?: { personA: { name: string }; personB: { name: string } }
  ): { adjustedSchedule: CustodySchedule; adjustment: ScheduleAdjustment } {
    // Mark unavailable dates
    const updatedEntries = { ...schedule.entries };
    
    for (const date of request.dates) {
      if (updatedEntries[date]) {
        updatedEntries[date] = {
          ...updatedEntries[date],
          isUnavailable: true,
          unavailableBy: request.personId,
        };
      }
    }

    // Find conflicts using flexible interpretation
    // Conflict = person has overnight responsibility ending on unavailable day
    const conflictDates = this.findFlexibleConflicts(updatedEntries, request);

    if (conflictDates.length === 0) {
      // No conflicts, just mark as unavailable
      return {
        adjustedSchedule: { ...schedule, entries: updatedEntries },
        adjustment: {
          conflictDates: [],
          originalAssignments: {},
          proposedAssignments: {},
          handoffCount: 0,
          isValid: true,
        }
      };
    }

    // Attempt to resolve conflicts
    const adjustment = this.resolveScheduleConflicts(updatedEntries, conflictDates, config);
    
    if (adjustment.isValid) {
      // Apply the proposed changes
      for (const [date, newAssignment] of Object.entries(adjustment.proposedAssignments)) {
        updatedEntries[date] = {
          ...updatedEntries[date],
          assignedTo: newAssignment,
          isAdjusted: true,
          originalAssignedTo: adjustment.originalAssignments[date],
        };
      }
    }

    return {
      adjustedSchedule: {
        ...schedule,
        entries: updatedEntries,
        lastUpdated: new Date().toISOString(),
      },
      adjustment,
    };
  }

  /**
   * Finds conflicts using flexible unavailability interpretation
   * A conflict occurs when someone is assigned responsibility that would
   * end on their unavailable day (i.e., they'd have overnight duty)
   */
  private findFlexibleConflicts(
    entries: Record<string, ScheduleEntry>,
    request: UnavailabilityRequest
  ): string[] {
    const conflicts: string[] = [];
    
    for (const unavailableDate of request.dates) {
      const entry = entries[unavailableDate];
      if (!entry) continue;

      // Check if this person has overnight responsibility ending on this day
      if (entry.assignedTo === request.personId) {
        // They are assigned to this day, which means overnight responsibility
        // Check if this is the last day of their custody period
        const nextDate = format(addDays(parseISO(unavailableDate), 1), 'yyyy-MM-dd');
        const nextEntry = entries[nextDate];
        
        // If next day is assigned to someone else OR it's their last day in schedule,
        // then they have overnight responsibility ending on unavailable day
        if (!nextEntry || nextEntry.assignedTo !== request.personId) {
          conflicts.push(unavailableDate);
        }
        // If they continue into the next day, we might be able to shift the handoff
        // This will be handled by the conflict resolution strategies
        else {
          // They have a multi-day period including this unavailable day
          // We need to check if we can end their period earlier
          conflicts.push(unavailableDate);
        }
      }
    }

    return conflicts;
  }

  /**
   * Core conflict resolution logic
   * Attempts multiple strategies in order of preference:
   * 1. Early handoff strategy - end custody period before unavailable day
   * 2. Extension strategy - extend other person's period through conflict
   * 3. Period shift strategy - adjust period boundaries
   */
  private resolveScheduleConflicts(
    entries: Record<string, ScheduleEntry>,
    conflictDates: string[],
    config?: { personA: { name: string }; personB: { name: string } }
  ): ScheduleAdjustment {
    const originalAssignments: Record<string, 'personA' | 'personB'> = {};
    conflictDates.forEach(date => {
      originalAssignments[date] = entries[date].assignedTo;
    });

    // Strategy 1: Try early handoff (end period before unavailable day)
    const earlyHandoffSolution = this.tryEarlyHandoffStrategy(entries, conflictDates, config);
    if (earlyHandoffSolution.isValid) {
      return earlyHandoffSolution;
    }

    // Strategy 2: Try extension (other person takes over through conflict)
    const extensionSolution = this.tryExtensionStrategy(entries, conflictDates, config);
    if (extensionSolution.isValid) {
      return extensionSolution;
    }

    // Strategy 3: Try period shifting
    const shiftSolution = this.tryPeriodShiftStrategy(entries, conflictDates, config);
    if (shiftSolution.isValid) {
      return shiftSolution;
    }

    // Strategy 4: Force assignment with warnings (allow 4-day rule violations)
    const forcedSolution = this.tryForcedAssignment(entries, conflictDates, config);
    return forcedSolution;
  }

  /**
   * Strategy 1: Early handoff - end custody period before unavailable day
   * This allows handoff during the unavailable day itself
   */
  private tryEarlyHandoffStrategy(
    entries: Record<string, ScheduleEntry>,
    conflictDates: string[],
    config?: { personA: { name: string }; personB: { name: string } }
  ): ScheduleAdjustment {
    const proposedAssignments: Record<string, 'personA' | 'personB'> = {};
    
    for (const conflictDate of conflictDates) {
      const conflictEntry = entries[conflictDate];
      const unavailablePerson = conflictEntry.assignedTo;
      const otherPerson: 'personA' | 'personB' = unavailablePerson === 'personA' ? 'personB' : 'personA';
      
      // Try to hand off on the unavailable day itself
      // This means other person gets overnight responsibility starting that day
      const testAssignments = { ...proposedAssignments, [conflictDate]: otherPerson };
      
      if (this.wouldViolateMaxDays(entries, testAssignments, conflictDate, otherPerson)) {
        // Can't do early handoff due to 4-day rule
        return {
          conflictDates,
          originalAssignments: {},
          proposedAssignments: {},
          handoffCount: 0,
          isValid: false,
          reason: 'Early handoff would violate 4-day maximum rule',
        };
      }
      
      proposedAssignments[conflictDate] = otherPerson;
    }

    const handoffCount = this.calculateHandoffCount(entries, proposedAssignments, conflictDates);

    return {
      conflictDates,
      originalAssignments: Object.fromEntries(
        conflictDates.map(date => [date, entries[date].assignedTo])
      ),
      proposedAssignments,
      handoffCount,
      isValid: true,
    };
  }

  /**
   * Strategy 2: Extension - other person takes over through conflict period
   */
  private tryExtensionStrategy(
    entries: Record<string, ScheduleEntry>,
    conflictDates: string[],
    config?: { personA: { name: string }; personB: { name: string } }
  ): ScheduleAdjustment {
    const proposedAssignments: Record<string, 'personA' | 'personB'> = {};
    
    // Sort conflict dates to process chronologically
    const sortedConflicts = [...conflictDates].sort();
    
    for (const conflictDate of sortedConflicts) {
      const conflictEntry = entries[conflictDate];
      const otherPerson: 'personA' | 'personB' = conflictEntry.assignedTo === 'personA' ? 'personB' : 'personA';
      
      // Check if other person can take this day without violating 4-day rule
      const testAssignments = { ...proposedAssignments, [conflictDate]: otherPerson };
      
      if (this.wouldViolateMaxDays(entries, testAssignments, conflictDate, otherPerson)) {
        // This strategy won't work for this conflict
        return {
          conflictDates,
          originalAssignments: {},
          proposedAssignments: {},
          handoffCount: 0,
          isValid: false,
          reason: 'Extension would violate 4-day maximum rule',
        };
      }
      
      proposedAssignments[conflictDate] = otherPerson;
    }

    const handoffCount = this.calculateHandoffCount(entries, proposedAssignments, sortedConflicts);

    return {
      conflictDates,
      originalAssignments: Object.fromEntries(
        conflictDates.map(date => [date, entries[date].assignedTo])
      ),
      proposedAssignments,
      handoffCount,
      isValid: true,
    };
  }

  /**
   * Strategy 3: Period shifting - adjust custody period boundaries
   */
  private tryPeriodShiftStrategy(
    entries: Record<string, ScheduleEntry>,
    conflictDates: string[],
    config?: { personA: { name: string }; personB: { name: string } }
  ): ScheduleAdjustment {
    // This is a more complex strategy that analyzes custody periods
    // and shifts their boundaries to avoid conflicts
    const proposedAssignments: Record<string, 'personA' | 'personB'> = {};
    
    // For now, implement a simplified version that tries to reassign
    for (const conflictDate of conflictDates) {
      const conflictEntry = entries[conflictDate];
      const otherPerson: 'personA' | 'personB' = conflictEntry.assignedTo === 'personA' ? 'personB' : 'personA';
      proposedAssignments[conflictDate] = otherPerson;
    }

    // Validate the proposed solution
    const validation = this.validateScheduleSegment(entries, proposedAssignments, conflictDates, config);
    
    if (!validation.isValid) {
      return {
        conflictDates,
        originalAssignments: {},
        proposedAssignments: {},
        handoffCount: 0,
        isValid: false,
        reason: validation.violations.join('; '),
      };
    }

    const handoffCount = this.calculateHandoffCount(entries, proposedAssignments, conflictDates);

    return {
      conflictDates,
      originalAssignments: Object.fromEntries(
        conflictDates.map(date => [date, entries[date].assignedTo])
      ),
      proposedAssignments,
      handoffCount,
      isValid: true,
    };
  }

  /**
   * Strategy 4: Force assignment even if it violates the 4-day rule
   * This allows users to override constraints when necessary
   */
  private tryForcedAssignment(
    entries: Record<string, ScheduleEntry>,
    conflictDates: string[],
    config?: { personA: { name: string }; personB: { name: string } }
  ): ScheduleAdjustment {
    const proposedAssignments: Record<string, 'personA' | 'personB'> = {};
    const warnings: string[] = [];
    
    for (const conflictDate of conflictDates) {
      const conflictEntry = entries[conflictDate];
      const unavailablePerson = conflictEntry.assignedTo;
      const otherPerson: 'personA' | 'personB' = unavailablePerson === 'personA' ? 'personB' : 'personA';
      
      // Force the assignment to the other person
      proposedAssignments[conflictDate] = otherPerson;
      
      // Check if this would violate the 4-day rule and add warnings
      if (this.wouldViolateMaxDays(entries, proposedAssignments, conflictDate, otherPerson)) {
        const personName = otherPerson === 'personA' 
          ? (config?.personA?.name || 'Person A')
          : (config?.personB?.name || 'Person B');
        warnings.push(`${personName} will exceed 4 consecutive days including ${conflictDate}`);
      }
    }

    const handoffCount = this.calculateHandoffCount(entries, proposedAssignments, conflictDates);

    return {
      conflictDates,
      originalAssignments: Object.fromEntries(
        conflictDates.map(date => [date, entries[date].assignedTo])
      ),
      proposedAssignments,
      handoffCount,
      isValid: true, // Always valid now, but may have warnings
      warnings: warnings.length > 0 ? warnings : undefined,
      reason: warnings.length > 0 ? `Warning: ${warnings.join('; ')}` : undefined,
    };
  }

  /**
   * Check if a proposed assignment would violate the maximum consecutive days rule
   */
  private wouldViolateMaxDays(
    entries: Record<string, ScheduleEntry>,
    proposedAssignments: Record<string, 'personA' | 'personB'>,
    checkDate: string,
    personId: 'personA' | 'personB'
  ): boolean {
    // Create a combined view of current and proposed assignments
    const effectiveAssignments = { ...entries };
    
    // Apply proposed changes
    Object.entries(proposedAssignments).forEach(([date, assignedTo]) => {
      if (effectiveAssignments[date]) {
        effectiveAssignments[date] = {
          ...effectiveAssignments[date],
          assignedTo
        };
      }
    });

    // Count consecutive days around the check date
    const checkDateObj = parseISO(checkDate);
    let consecutiveDays = 1; // The check date itself

    // Count backwards
    let currentDate = subDays(checkDateObj, 1);
    while (effectiveAssignments[format(currentDate, 'yyyy-MM-dd')]?.assignedTo === personId) {
      consecutiveDays++;
      currentDate = subDays(currentDate, 1);
    }

    // Count forwards
    currentDate = addDays(checkDateObj, 1);
    while (effectiveAssignments[format(currentDate, 'yyyy-MM-dd')]?.assignedTo === personId) {
      consecutiveDays++;
      currentDate = addDays(currentDate, 1);
    }

    return consecutiveDays > this.MAX_CONSECUTIVE_DAYS;
  }

  /**
   * Validates a schedule segment for rule compliance
   */
  private validateScheduleSegment(
    entries: Record<string, ScheduleEntry>,
    proposedChanges: Record<string, 'personA' | 'personB'>,
    datesToCheck: string[],
    config?: { personA: { name: string }; personB: { name: string } }
  ): ValidationResult {
    const violations: string[] = [];

    // Check each date for violations
    for (const date of datesToCheck) {
      const assignment = proposedChanges[date] || entries[date].assignedTo;
      
      if (this.wouldViolateMaxDays(entries, proposedChanges, date, assignment)) {
        const personName = assignment === 'personA' 
          ? (config?.personA?.name || 'Person A')
          : (config?.personB?.name || 'Person B');
        violations.push(`${personName} would exceed 4 consecutive days including ${date}`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      maxConsecutiveDays: { personA: 0, personB: 0 }, // Could be calculated if needed
    };
  }

  /**
   * Calculates the number of handoffs created by proposed changes
   */
  private calculateHandoffCount(
    entries: Record<string, ScheduleEntry>,
    proposedChanges: Record<string, 'personA' | 'personB'>,
    relevantDates: string[]
  ): number {
    // This is a simplified calculation
    // In a full implementation, we'd analyze the schedule around the relevant dates
    // and count actual custody transitions
    
    return Object.keys(proposedChanges).length;
  }

  /**
   * Analyzes schedule and returns custody periods
   */
  getCustodyPeriods(schedule: CustodySchedule, dayRange: number = 30): CustodyPeriod[] {
    const periods: CustodyPeriod[] = [];
    const sortedDates = Object.keys(schedule.entries).sort();
    
    if (sortedDates.length === 0) return periods;

    let currentPeriod: Partial<CustodyPeriod> = {
      personId: schedule.entries[sortedDates[0]].assignedTo,
      startDate: sortedDates[0],
      dayCount: 1,
    };

    for (let i = 1; i < Math.min(sortedDates.length, dayRange); i++) {
      const date = sortedDates[i];
      const entry = schedule.entries[date];

      if (entry.assignedTo === currentPeriod.personId) {
        currentPeriod.dayCount = (currentPeriod.dayCount || 0) + 1;
      } else {
        // End current period and start new one
        periods.push({
          personId: currentPeriod.personId!,
          startDate: currentPeriod.startDate!,
          endDate: sortedDates[i - 1],
          dayCount: currentPeriod.dayCount || 0,
        });

        currentPeriod = {
          personId: entry.assignedTo,
          startDate: date,
          dayCount: 1,
        };
      }
    }

    // Add the final period
    if (currentPeriod.personId) {
      periods.push({
        personId: currentPeriod.personId,
        startDate: currentPeriod.startDate!,
        endDate: sortedDates[Math.min(sortedDates.length - 1, dayRange - 1)],
        dayCount: currentPeriod.dayCount || 0,
      });
    }

    return periods;
  }
} 