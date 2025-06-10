import type { ScheduleEntry, CustodySchedule } from '@/types';
import { ScheduleGenerator } from './scheduleGenerator';

export class ScheduleExtender {
  private scheduleGenerator = new ScheduleGenerator();

  /**
   * Check if a month is fully populated (all days present)
   */
  private isMonthFullyPopulated(
    schedule: CustodySchedule,
    targetMonth: Date
  ): boolean {
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    
    return this.scheduleGenerator.validateMonthCoverage(schedule.entries, year, month);
  }

  /**
   * Get the rotation state from the last entry in schedule
   * Returns: { person, daysInCurrentPeriod }
   */
  private getRotationState(schedule: CustodySchedule): {
    person: 'personA' | 'personB';
    daysInCurrentPeriod: number;
  } {
    const sortedDates = Object.keys(schedule.entries).sort();
    if (sortedDates.length === 0) {
      throw new Error('No schedule entries found');
    }

    const lastEntry = schedule.entries[sortedDates[sortedDates.length - 1]];
    let consecutiveDays = 1;
    let currentPerson = lastEntry.assignedTo;
    
         // Count backwards to find consecutive days for current person
     for (let i = sortedDates.length - 2; i >= 0; i--) {
       const entry = schedule.entries[sortedDates[i]];
       if (entry.assignedTo === currentPerson && !entry.unavailableBy) {
         consecutiveDays++;
       } else {
         break;
       }
     }

    // In a 3-day rotation, calculate current position
    const daysInCurrentPeriod = consecutiveDays % 3;
    
    return {
      person: currentPerson,
      daysInCurrentPeriod: daysInCurrentPeriod === 0 ? 3 : daysInCurrentPeriod
    };
  }

  /**
   * Ensure schedule has entries for the given month
   * If not, extend the schedule using the 3-day rotation pattern
   */
  async ensureMonthPopulated(
    schedule: CustodySchedule,
    targetMonth: Date,
    storageManager: any
  ): Promise<CustodySchedule> {
    // Check if this month is fully populated
    if (this.isMonthFullyPopulated(schedule, targetMonth)) {
      return schedule; // Month already fully populated
    }

    console.log(`Month ${targetMonth.toISOString().slice(0, 7)} is not fully populated, extending...`);

    // Get the current rotation state
    const rotationState = this.getRotationState(schedule);
    
    // Find the last date and calculate next date
    const sortedDates = Object.keys(schedule.entries).sort();
    const lastDateStr = sortedDates[sortedDates.length - 1];
    const lastDate = new Date(lastDateStr);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Calculate how many days needed to cover target month plus buffer
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const daysBetween = Math.ceil((monthEnd.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Generate enough days to cover the target month plus additional months for buffer
    const daysToGenerate = Math.max(daysBetween + 90, 180); // At least 6 months ahead
    
    // Generate the extension
    const extension = this.generateExtension(
      nextDate,
      rotationState.person,
      rotationState.daysInCurrentPeriod,
      daysToGenerate
    );

    // Merge with existing schedule
    const updatedSchedule: CustodySchedule = {
      ...schedule,
      entries: {
        ...schedule.entries,
        ...extension
      },
      lastUpdated: new Date().toISOString()
    };

    // Validate the target month is now fully populated
    if (!this.isMonthFullyPopulated(updatedSchedule, targetMonth)) {
      console.warn(`Failed to fully populate month ${targetMonth.toISOString().slice(0, 7)}`);
    }

    // Save the extended schedule
    await storageManager.saveSchedule(updatedSchedule);
    
    return updatedSchedule;
  }

  /**
   * Generate schedule extension following 3-day rotation
   * Improved pattern continuity calculation
   */
  private generateExtension(
    startDate: Date,
    currentPerson: 'personA' | 'personB',
    daysInCurrentPeriod: number,
    totalDays: number
  ): Record<string, ScheduleEntry> {
    const extension: Record<string, ScheduleEntry> = {};
    
    let currentDate = new Date(startDate);
    let person = currentPerson;
    let daysRemaining = 3 - daysInCurrentPeriod; // Days left in current period
    
    for (let i = 0; i < totalDays; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      extension[dateStr] = {
        date: dateStr,
        assignedTo: person,
      };
      
      daysRemaining--;
      
      // Switch after current period completes
      if (daysRemaining <= 0) {
        person = person === 'personA' ? 'personB' : 'personA';
        daysRemaining = 3; // Start new 3-day period
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return extension;
  }

  /**
   * Check if schedule needs extension for a given date range
   */
  needsExtension(schedule: CustodySchedule, startDate: Date, endDate: Date): boolean {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    // Check if we have entries for the entire date range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!schedule.entries[dateStr]) {
        return true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return false;
  }

  /**
   * Ensure multiple months are populated
   */
  async ensureMonthsPopulated(
    schedule: CustodySchedule,
    monthsToCheck: Date[],
    storageManager: any
  ): Promise<CustodySchedule> {
    let currentSchedule = schedule;
    
    for (const month of monthsToCheck) {
      if (!this.isMonthFullyPopulated(currentSchedule, month)) {
        currentSchedule = await this.ensureMonthPopulated(currentSchedule, month, storageManager);
      }
    }
    
    return currentSchedule;
  }

  /**
   * Validate pattern integrity across a date range
   */
  validatePatternIntegrity(
    schedule: CustodySchedule,
    startDate: Date,
    endDate: Date
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const sortedDates = Object.keys(schedule.entries)
      .filter(date => date >= startDate.toISOString().split('T')[0] && 
                     date <= endDate.toISOString().split('T')[0])
      .sort();

    if (sortedDates.length === 0) {
      return { isValid: false, issues: ['No entries found in date range'] };
    }

    let currentPerson = schedule.entries[sortedDates[0]].assignedTo;
    let consecutiveDays = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const entry = schedule.entries[sortedDates[i]];
      
             if (entry.assignedTo === currentPerson && !entry.unavailableBy) {
         consecutiveDays++;
         
         // Check for violations of 3-day max (allowing for unavailable days)
         if (consecutiveDays > 4) {
           issues.push(`Person ${currentPerson} has ${consecutiveDays} consecutive days ending ${sortedDates[i]}`);
         }
       } else {
         // Person switch or unavailable day
         if (!entry.unavailableBy && consecutiveDays > 0 && consecutiveDays < 2) {
           issues.push(`Person ${currentPerson} has only ${consecutiveDays} day(s) ending ${sortedDates[i-1]}`);
         }
         
         currentPerson = entry.assignedTo;
         consecutiveDays = entry.unavailableBy ? 0 : 1;
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
} 