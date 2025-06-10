import type { ScheduleEntry } from '@/types';

export class ScheduleGenerator {
  /**
   * Generate a schedule starting from a given date
   */
  generateSchedule(
    startDate: Date,
    rotationDays: number,
    initialPerson: 'personA' | 'personB',
    totalDays: number = 30
  ): Record<string, ScheduleEntry> {
    const schedule: Record<string, ScheduleEntry> = {};
    
    let currentDate = new Date(startDate);
    let currentPerson = initialPerson;
    let daysInCurrentPeriod = 0;
    
    for (let i = 0; i < totalDays; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      schedule[dateStr] = {
        date: dateStr,
        assignedTo: currentPerson,
      };
      
      daysInCurrentPeriod++;
      
      // Switch person after rotation period
      if (daysInCurrentPeriod >= rotationDays) {
        currentPerson = currentPerson === 'personA' ? 'personB' : 'personA';
        daysInCurrentPeriod = 0;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return schedule;
  }

  /**
   * Generate a perfect 3-day rotation schedule
   */
  generate3DayRotation(
    startDate: Date,
    initialPerson: 'personA' | 'personB',
    totalDays: number = 30
  ): Record<string, ScheduleEntry> {
    return this.generateSchedule(startDate, 3, initialPerson, totalDays);
  }

  /**
   * Generate a complete calendar year with 3-day rotation
   * Ensures all 12 months are fully populated
   */
  generateFullCalendarYear(
    startDate: Date,
    initialPerson: 'personA' | 'personB'
  ): Record<string, ScheduleEntry> {
    const year = startDate.getFullYear();
    const endOfYear = new Date(year, 11, 31); // December 31st of the same year
    
    // Calculate total days needed
    const daysDifference = Math.ceil((endOfYear.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return this.generate3DayRotation(startDate, initialPerson, daysDifference);
  }

  /**
   * Generate N complete months with 3-day rotation
   * Ensures month boundaries are respected
   */
  generateCompleteMonths(
    startDate: Date,
    initialPerson: 'personA' | 'personB',
    monthCount: number = 12
  ): Record<string, ScheduleEntry> {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthCount);
    endDate.setDate(0); // Go to last day of previous month (i.e., last day of the target month)
    
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return this.generate3DayRotation(startDate, initialPerson, daysDifference);
  }

  /**
   * Get the last day of a month
   */
  private getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Validate that a schedule has complete month coverage
   */
  validateMonthCoverage(
    schedule: Record<string, ScheduleEntry>,
    year: number,
    month: number
  ): boolean {
    const lastDay = this.getLastDayOfMonth(year, month);
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
      if (!schedule[dateStr]) {
        return false;
      }
    }
    
    return true;
  }
} 