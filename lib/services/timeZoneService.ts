/**
 * TimeZone Service - Comprehensive time zone detection and management
 * 
 * Best practices implemented:
 * - Auto-detect user's time zone with fallbacks
 * - Store user preference with validation
 * - Provide explicit time zone conversion methods
 * - Handle edge cases and DST transitions
 * - Support manual time zone override
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO, isValid } from 'date-fns';

export interface TimeZoneInfo {
  timeZone: string;
  name: string;
  offset: string;
  isAutoDetected: boolean;
  lastUpdated: string;
}

export interface DateWithTimeZone {
  utcDate: Date;
  localDate: Date;
  timeZone: string;
  offset: string;
  formattedLocal: string;
  formattedUTC: string;
  isoString: string;
}

export class TimeZoneService {
  private static instance: TimeZoneService;
  private currentTimeZone: TimeZoneInfo | null = null;
  private readonly STORAGE_KEY = 'user-timezone-preference';
  private readonly FALLBACK_TIMEZONE = 'UTC';
  
  // Common time zones for the selector
  public readonly COMMON_TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'North America' },
    { value: 'America/Chicago', label: 'Central Time (CT)', region: 'North America' },
    { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'North America' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'North America' },
    { value: 'America/Anchorage', label: 'Alaska Time (AT)', region: 'North America' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)', region: 'North America' },
    { value: 'Europe/London', label: 'British Time (GMT/BST)', region: 'Europe' },
    { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)', region: 'Europe' },
    { value: 'Europe/Berlin', label: 'Central European Time (CET/CEST)', region: 'Europe' },
    { value: 'Europe/Rome', label: 'Central European Time (CET/CEST)', region: 'Europe' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', region: 'Asia' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', region: 'Asia' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', region: 'Asia' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', region: 'Australia' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Universal' },
  ];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): TimeZoneService {
    if (!TimeZoneService.instance) {
      TimeZoneService.instance = new TimeZoneService();
    }
    return TimeZoneService.instance;
  }

  /**
   * Initialize time zone detection and load stored preferences
   */
  private initialize(): void {
    try {
      // First, try to load stored preference
      const stored = this.loadStoredTimeZone();
      
      if (stored && this.isValidTimeZone(stored.timeZone)) {
        this.currentTimeZone = stored;
        console.log('TimeZone: Loaded stored preference:', stored.timeZone);
        return;
      }

      // If no valid stored preference, auto-detect
      this.autoDetectTimeZone();
    } catch (error) {
      console.error('TimeZone: Initialization failed, using fallback:', error);
      this.setFallbackTimeZone();
    }
  }

  /**
   * Auto-detect user's time zone using multiple methods
   */
  private autoDetectTimeZone(): void {
    let detectedTimeZone: string | null = null;

    try {
      // Method 1: Intl.DateTimeFormat (most reliable)
      if (Intl && Intl.DateTimeFormat) {
        detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('TimeZone: Intl.DateTimeFormat detected:', detectedTimeZone);
      }

      // Method 2: Fallback using date offset (less reliable but works)
      if (!detectedTimeZone || !this.isValidTimeZone(detectedTimeZone)) {
        detectedTimeZone = this.getTimeZoneFromOffset();
        console.log('TimeZone: Offset-based detection:', detectedTimeZone);
      }

      // Method 3: Ultimate fallback
      if (!detectedTimeZone || !this.isValidTimeZone(detectedTimeZone)) {
        detectedTimeZone = this.FALLBACK_TIMEZONE;
        console.log('TimeZone: Using fallback timezone');
      }

      // Set the detected time zone
      this.setTimeZone(detectedTimeZone, true);

    } catch (error) {
      console.error('TimeZone: Auto-detection failed:', error);
      this.setFallbackTimeZone();
    }
  }

  /**
   * Get time zone from offset (fallback method)
   */
  private getTimeZoneFromOffset(): string {
    const offset = new Date().getTimezoneOffset();
    
    // Simple mapping of common offsets to time zones
    // Note: Some offsets overlap due to DST, so we pick the most common one
    const offsetMap: Record<number, string> = {
      300: 'America/New_York',    // UTC-5 (EST)
      240: 'America/New_York',    // UTC-4 (EDT)
      360: 'America/Chicago',     // UTC-6 (CST)
      420: 'America/Denver',      // UTC-7 (MST/PDT)
      480: 'America/Los_Angeles', // UTC-8 (PST)
      0: 'UTC',                   // UTC
      [-60]: 'Europe/London',     // UTC+1 (CET) 
      [-120]: 'Europe/Paris',     // UTC+2 (CEST)
      [-540]: 'Asia/Tokyo',       // UTC+9 (JST)
    };

    return offsetMap[offset] || this.FALLBACK_TIMEZONE;
  }

  /**
   * Validate if a time zone string is valid
   */
  public isValidTimeZone(timeZone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set time zone (manual or auto-detected)
   */
  public setTimeZone(timeZone: string, isAutoDetected: boolean = false): boolean {
    if (!this.isValidTimeZone(timeZone)) {
      console.error('TimeZone: Invalid timezone provided:', timeZone);
      return false;
    }

    const timeZoneInfo: TimeZoneInfo = {
      timeZone,
      name: this.getTimeZoneName(timeZone),
      offset: this.getTimeZoneOffset(timeZone),
      isAutoDetected,
      lastUpdated: new Date().toISOString(),
    };

    this.currentTimeZone = timeZoneInfo;
    this.saveTimeZonePreference(timeZoneInfo);
    
    console.log('TimeZone: Set to:', timeZone, isAutoDetected ? '(auto-detected)' : '(manual)');
    return true;
  }

  /**
   * Get current time zone info
   */
  public getCurrentTimeZone(): TimeZoneInfo {
    if (!this.currentTimeZone) {
      this.autoDetectTimeZone();
    }
    return this.currentTimeZone!;
  }

  /**
   * Get time zone display name
   */
  private getTimeZoneName(timeZone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'longGeneric',
      });
      
      const parts = formatter.formatToParts(new Date());
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      return timeZonePart?.value || timeZone;
    } catch (error) {
      return timeZone;
    }
  }

  /**
   * Get time zone offset string (e.g., "UTC-05:00")
   */
  private getTimeZoneOffset(timeZone: string): string {
    try {
      const now = new Date();
      const utcDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetDate = toZonedTime(utcDate, timeZone);
      const offset = (targetDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
      
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(offset));
      const minutes = Math.round((Math.abs(offset) - hours) * 60);
      
      return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return 'UTC+00:00';
    }
  }

  /**
   * Set fallback time zone when detection fails
   */
  private setFallbackTimeZone(): void {
    this.currentTimeZone = {
      timeZone: this.FALLBACK_TIMEZONE,
      name: 'Coordinated Universal Time',
      offset: 'UTC+00:00',
      isAutoDetected: true,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Convert a date string to DateWithTimeZone object
   * Input should be in ISO format or a valid date string
   */
  public parseDate(dateInput: string | Date, inputTimeZone?: string): DateWithTimeZone | null {
    try {
      let inputDate: Date;
      
      if (typeof dateInput === 'string') {
        // If string contains time zone info, parse as-is
        if (dateInput.includes('T') && (dateInput.includes('Z') || dateInput.includes('+') || dateInput.includes('-'))) {
          inputDate = parseISO(dateInput);
        } else {
          // If just date (YYYY-MM-DD), treat as noon in the specified timezone to avoid DST issues
          const tz = inputTimeZone || this.getCurrentTimeZone().timeZone;
          inputDate = toZonedTime(`${dateInput}T12:00:00`, tz);
        }
      } else {
        inputDate = dateInput;
      }

      if (!isValid(inputDate)) {
        console.error('TimeZone: Invalid date provided:', dateInput);
        return null;
      }

      const userTimeZone = this.getCurrentTimeZone().timeZone;
      const localDate = toZonedTime(inputDate, userTimeZone);

      return {
        utcDate: inputDate,
        localDate,
        timeZone: userTimeZone,
        offset: this.getTimeZoneOffset(userTimeZone),
        formattedLocal: formatInTimeZone(inputDate, userTimeZone, 'yyyy-MM-dd'),
        formattedUTC: format(inputDate, 'yyyy-MM-dd'),
        isoString: inputDate.toISOString(),
      };
    } catch (error) {
      console.error('TimeZone: Error parsing date:', error);
      return null;
    }
  }

  /**
   * Convert a local date to UTC for storage
   */
  public toUTC(dateInput: string | Date, sourceTimeZone?: string): Date | null {
    try {
      const tz = sourceTimeZone || this.getCurrentTimeZone().timeZone;
      
      if (typeof dateInput === 'string') {
        // If it's a date string without time, add noon to avoid DST issues
        const dateStr = dateInput.includes('T') ? dateInput : `${dateInput}T12:00:00`;
        return toZonedTime(dateStr, tz);
      } else {
        return dateInput;
      }
    } catch (error) {
      console.error('TimeZone: Error converting to UTC:', error);
      return null;
    }
  }

  /**
   * Format date in user's time zone
   */
  public formatInUserTimeZone(date: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
    try {
      const userTimeZone = this.getCurrentTimeZone().timeZone;
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      
      if (!isValid(dateObj)) {
        return 'Invalid Date';
      }
      
      return formatInTimeZone(dateObj, userTimeZone, formatStr);
    } catch (error) {
      console.error('TimeZone: Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Get today's date in user's time zone
   */
  public getTodayInUserTimeZone(): string {
    const userTimeZone = this.getCurrentTimeZone().timeZone;
    return formatInTimeZone(new Date(), userTimeZone, 'yyyy-MM-dd');
  }

  /**
   * Save time zone preference to localStorage
   */
  private saveTimeZonePreference(timeZoneInfo: TimeZoneInfo): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(timeZoneInfo));
    } catch (error) {
      console.error('TimeZone: Failed to save preference:', error);
    }
  }

  /**
   * Load time zone preference from localStorage
   */
  private loadStoredTimeZone(): TimeZoneInfo | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TimeZoneInfo;
        // Validate that stored timezone is still valid
        if (this.isValidTimeZone(parsed.timeZone)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('TimeZone: Failed to load stored preference:', error);
    }
    return null;
  }

  /**
   * Reset to auto-detected time zone
   */
  public resetToAutoDetected(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.autoDetectTimeZone();
    } catch (error) {
      console.error('TimeZone: Failed to reset to auto-detected:', error);
      this.setFallbackTimeZone();
    }
  }

  /**
   * Get time zone information for debugging
   */
  public getDebugInfo(): object {
    return {
      current: this.currentTimeZone,
      detected: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: new Date().getTimezoneOffset(),
      now: new Date().toISOString(),
      nowLocal: this.formatInUserTimeZone(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };
  }
} 