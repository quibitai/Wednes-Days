/**
 * Date Utilities - Standardized date handling with time zone awareness
 * 
 * Best practices implemented:
 * - Always store dates in UTC with ISO 8601 format
 * - Explicit time zone handling for all operations
 * - Consistent date validation and normalization
 * - Safe handling of date strings and objects
 * - DST-aware date calculations
 */

import { format, parseISO, isValid, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { TimeZoneService } from '@/lib/services/timeZoneService';

export interface NormalizedDate {
  date: Date;
  isoString: string;
  localString: string;
  userTimeZone: string;
  isValid: boolean;
}

export class DateUtils {
  private static timeZoneService = TimeZoneService.getInstance();

  /**
   * Normalize any date input to a standardized format
   * Always returns UTC date for storage, with local representation
   */
  static normalize(dateInput: string | Date | null | undefined): NormalizedDate | null {
    if (!dateInput) {
      return null;
    }

    try {
      let parsedDate: Date;
      
      if (typeof dateInput === 'string') {
        // Handle different string formats
        if (dateInput.includes('T') || dateInput.includes('Z')) {
          // ISO string or datetime
          parsedDate = parseISO(dateInput);
        } else {
          // Simple date string (YYYY-MM-DD)
          // Parse as noon in user's timezone to avoid DST issues
          const userTz = this.timeZoneService.getCurrentTimeZone().timeZone;
          parsedDate = fromZonedTime(`${dateInput}T12:00:00`, userTz);
        }
      } else {
        parsedDate = dateInput;
      }

      if (!isValid(parsedDate)) {
        console.warn('DateUtils: Invalid date input:', dateInput);
        return null;
      }

      const userTimeZone = this.timeZoneService.getCurrentTimeZone().timeZone;
      
      return {
        date: parsedDate,
        isoString: parsedDate.toISOString(),
        localString: formatInTimeZone(parsedDate, userTimeZone, 'yyyy-MM-dd'),
        userTimeZone,
        isValid: true,
      };
    } catch (error) {
      console.error('DateUtils: Error normalizing date:', error);
      return null;
    }
  }

  /**
   * Create a date for storage (always UTC)
   */
  static createForStorage(dateString: string, timeZone?: string): string | null {
    try {
      const tz = timeZone || this.timeZoneService.getCurrentTimeZone().timeZone;
      
      // Treat date string as noon in the specified timezone to avoid DST issues
      const fullDateString = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
      const utcDate = fromZonedTime(fullDateString, tz);
      
      if (!isValid(utcDate)) {
        return null;
      }
      
      return utcDate.toISOString();
    } catch (error) {
      console.error('DateUtils: Error creating date for storage:', error);
      return null;
    }
  }

  /**
   * Format date for display in user's timezone
   */
  static formatForDisplay(
    dateInput: string | Date, 
    formatString: string = 'yyyy-MM-dd',
    timeZone?: string
  ): string {
    try {
      const tz = timeZone || this.timeZoneService.getCurrentTimeZone().timeZone;
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return 'Invalid Date';
      }
      
      return formatInTimeZone(date, tz, formatString);
    } catch (error) {
      console.error('DateUtils: Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Get today's date in user's timezone (for display)
   */
  static getTodayLocal(): string {
    const userTimeZone = this.timeZoneService.getCurrentTimeZone().timeZone;
    return formatInTimeZone(new Date(), userTimeZone, 'yyyy-MM-dd');
  }

  /**
   * Get today's date in UTC (for storage/comparisons)
   */
  static getTodayUTC(): string {
    return new Date().toISOString();
  }

  /**
   * Compare two dates (handles different formats)
   */
  static compareDates(date1: string | Date, date2: string | Date): number {
    try {
      const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
      const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
      
      if (!isValid(d1) || !isValid(d2)) {
        throw new Error('Invalid date(s) for comparison');
      }
      
      return d1.getTime() - d2.getTime();
    } catch (error) {
      console.error('DateUtils: Error comparing dates:', error);
      return 0;
    }
  }

  /**
   * Check if two dates are the same day (ignoring time)
   */
  static isSameDay(date1: string | Date, date2: string | Date): boolean {
    try {
      const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
      const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
      
      if (!isValid(d1) || !isValid(d2)) {
        return false;
      }
      
      const userTimeZone = this.timeZoneService.getCurrentTimeZone().timeZone;
      const local1 = formatInTimeZone(d1, userTimeZone, 'yyyy-MM-dd');
      const local2 = formatInTimeZone(d2, userTimeZone, 'yyyy-MM-dd');
      
      return local1 === local2;
    } catch (error) {
      console.error('DateUtils: Error checking if same day:', error);
      return false;
    }
  }

  /**
   * Add days to a date (timezone-aware)
   */
  static addDays(dateInput: string | Date, days: number): string | null {
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return null;
      }
      
      const newDate = addDays(date, days);
      return newDate.toISOString();
    } catch (error) {
      console.error('DateUtils: Error adding days:', error);
      return null;
    }
  }

  /**
   * Subtract days from a date (timezone-aware)
   */
  static subtractDays(dateInput: string | Date, days: number): string | null {
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return null;
      }
      
      const newDate = subDays(date, days);
      return newDate.toISOString();
    } catch (error) {
      console.error('DateUtils: Error subtracting days:', error);
      return null;
    }
  }

  /**
   * Get start of day in user's timezone
   */
  static getStartOfDay(dateInput: string | Date): string | null {
    try {
      const userTimeZone = this.timeZoneService.getCurrentTimeZone().timeZone;
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return null;
      }
      
      // Get date in user's timezone, then get start of day, then convert back to UTC
      const localDate = toZonedTime(date, userTimeZone);
      const startOfLocalDay = startOfDay(localDate);
      const utcStartOfDay = fromZonedTime(startOfLocalDay, userTimeZone);
      
      return utcStartOfDay.toISOString();
    } catch (error) {
      console.error('DateUtils: Error getting start of day:', error);
      return null;
    }
  }

  /**
   * Get end of day in user's timezone
   */
  static getEndOfDay(dateInput: string | Date): string | null {
    try {
      const userTimeZone = this.timeZoneService.getCurrentTimeZone().timeZone;
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return null;
      }
      
      // Get date in user's timezone, then get end of day, then convert back to UTC
      const localDate = toZonedTime(date, userTimeZone);
      const endOfLocalDay = endOfDay(localDate);
      const utcEndOfDay = fromZonedTime(endOfLocalDay, userTimeZone);
      
      return utcEndOfDay.toISOString();
    } catch (error) {
      console.error('DateUtils: Error getting end of day:', error);
      return null;
    }
  }

  /**
   * Validate date string format
   */
  static isValidDateString(dateString: string): boolean {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }
    
    try {
      const date = parseISO(dateString);
      return isValid(date);
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert date to user's preferred format
   */
  static toUserFormat(
    dateInput: string | Date,
    options: {
      includeTime?: boolean;
      includeTimeZone?: boolean;
      shortFormat?: boolean;
    } = {}
  ): string {
    try {
      const { includeTime = false, includeTimeZone = false, shortFormat = false } = options;
      const userTimeZone = this.timeZoneService.getCurrentTimeZone().timeZone;
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return 'Invalid Date';
      }
      
      let formatString = shortFormat ? 'MMM d, yyyy' : 'MMMM d, yyyy';
      
      if (includeTime) {
        formatString += ' h:mm a';
      }
      
      let result = formatInTimeZone(date, userTimeZone, formatString);
      
      if (includeTimeZone) {
        const tzInfo = this.timeZoneService.getCurrentTimeZone();
        result += ` (${tzInfo.offset})`;
      }
      
      return result;
    } catch (error) {
      console.error('DateUtils: Error formatting to user format:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Get relative time string (e.g., "2 days ago", "in 3 days")
   */
  static getRelativeTime(dateInput: string | Date): string {
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return 'Invalid Date';
      }
      
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Tomorrow';
      } else if (diffDays === -1) {
        return 'Yesterday';
      } else if (diffDays > 1) {
        return `In ${diffDays} days`;
      } else {
        return `${Math.abs(diffDays)} days ago`;
      }
    } catch (error) {
      console.error('DateUtils: Error getting relative time:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Parse legacy date formats for backward compatibility
   */
  static migrateLegacyDate(legacyDate: string): string | null {
    try {
      // Handle simple YYYY-MM-DD format from existing data
      if (/^\d{4}-\d{2}-\d{2}$/.test(legacyDate)) {
        const userTimeZone = this.timeZoneService.getCurrentTimeZone().timeZone;
        const utcDate = fromZonedTime(`${legacyDate}T12:00:00`, userTimeZone);
        return utcDate.toISOString();
      }
      
      // Handle ISO strings
      if (legacyDate.includes('T')) {
        const date = parseISO(legacyDate);
        if (isValid(date)) {
          return date.toISOString();
        }
      }
      
      return null;
    } catch (error) {
      console.error('DateUtils: Error migrating legacy date:', error);
      return null;
    }
  }

  /**
   * Get debug information about date handling
   */
  static getDebugInfo(dateInput?: string | Date): object {
    const tzService = this.timeZoneService;
    const currentTz = tzService.getCurrentTimeZone();
    
    const debugInfo: any = {
      currentTimeZone: currentTz,
      now: {
        utc: new Date().toISOString(),
        local: formatInTimeZone(new Date(), currentTz.timeZone, 'yyyy-MM-dd HH:mm:ss'),
        todayLocal: this.getTodayLocal(),
        todayUTC: this.getTodayUTC(),
      },
      timeZoneService: tzService.getDebugInfo(),
    };
    
    if (dateInput) {
      const normalized = this.normalize(dateInput);
      debugInfo.inputAnalysis = {
        input: dateInput,
        normalized,
        formatted: normalized ? this.toUserFormat(normalized.date, { includeTime: true, includeTimeZone: true }) : null,
      };
    }
    
    return debugInfo;
  }
} 