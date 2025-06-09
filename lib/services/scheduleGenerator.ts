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
} 