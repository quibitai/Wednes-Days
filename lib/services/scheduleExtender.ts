import type { ScheduleEntry, CustodySchedule } from '@/types';
import { ScheduleGenerator } from './scheduleGenerator';

export class ScheduleExtender {
  private scheduleGenerator = new ScheduleGenerator();

  /**
   * Ensure schedule has entries for the given month
   * If not, extend the schedule using the 3-day rotation pattern
   */
  async ensureMonthPopulated(
    schedule: CustodySchedule,
    targetMonth: Date,
    storageManager: any
  ): Promise<CustodySchedule> {
    const monthKey = targetMonth.toISOString().slice(0, 7); // YYYY-MM format
    
    // Check if this month already has entries
    const hasEntriesForMonth = Object.keys(schedule.entries).some(dateStr => 
      dateStr.startsWith(monthKey)
    );
    
    if (hasEntriesForMonth) {
      return schedule; // Month already populated
    }

    // Find the last date in the schedule to continue the pattern
    const sortedDates = Object.keys(schedule.entries).sort();
    const lastDateStr = sortedDates[sortedDates.length - 1];
    const lastEntry = schedule.entries[lastDateStr];
    
    if (!lastEntry) {
      throw new Error('No existing schedule entries found');
    }

    // Calculate how many days the last person has been assigned
    let consecutiveDays = 1;
    let currentPerson = lastEntry.assignedTo;
    
    // Count backwards to find how many consecutive days this person has
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const entry = schedule.entries[sortedDates[i]];
      if (entry.assignedTo === currentPerson) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    // Determine when to switch to the other person
    const daysUntilSwitch = 3 - (consecutiveDays % 3);
    
    // Start extending from the day after the last entry
    const lastDate = new Date(lastDateStr);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Calculate how many days we need to generate to cover the target month
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    
    // Generate enough days to reach the end of the target month
    const daysBetween = Math.ceil((monthEnd.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)) + 5; // Add buffer
    
    // Generate the extension
    const extension = this.generateExtension(
      nextDate,
      currentPerson,
      daysUntilSwitch,
      Math.max(daysBetween, 90) // Generate at least 3 months ahead
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

    // Save the extended schedule
    await storageManager.saveSchedule(updatedSchedule);
    
    return updatedSchedule;
  }

  /**
   * Generate schedule extension following 3-day rotation
   */
  private generateExtension(
    startDate: Date,
    currentPerson: 'personA' | 'personB',
    daysUntilSwitch: number,
    totalDays: number
  ): Record<string, ScheduleEntry> {
    const extension: Record<string, ScheduleEntry> = {};
    
    let currentDate = new Date(startDate);
    let person = currentPerson;
    let daysInCurrentPeriod = 3 - daysUntilSwitch; // How many days current person has already served
    
    for (let i = 0; i < totalDays; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      extension[dateStr] = {
        date: dateStr,
        assignedTo: person,
      };
      
      daysInCurrentPeriod++;
      
      // Switch after 3 days
      if (daysInCurrentPeriod >= 3) {
        person = person === 'personA' ? 'personB' : 'personA';
        daysInCurrentPeriod = 0;
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
} 