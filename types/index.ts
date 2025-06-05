/**
 * Core types for the Dog Custody Scheduler application
 */

export interface User {
  id: 'personA' | 'personB';
  name: string;
  color: string;
}

export interface ScheduleEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  assignedTo: 'personA' | 'personB';
  isUnavailable?: boolean; // Schedule-affecting unavailability (legacy, for existing data)
  unavailableBy?: 'personA' | 'personB'; // Schedule-affecting unavailability (legacy, for existing data)
  isAdjusted?: boolean; // Indicates if this day was modified by the algorithm
  originalAssignedTo?: 'personA' | 'personB'; // Original assignment before adjustment
  // New: Informational unavailability (doesn't affect schedule)
  informationalUnavailability?: {
    personA?: boolean; // Person A marked themselves unavailable (informational only)
    personB?: boolean; // Person B marked themselves unavailable (informational only)
  };
  // Notes for the day
  note?: string; // User-added note for this day
}

export interface CustodySchedule {
  entries: Record<string, ScheduleEntry>; // date string -> ScheduleEntry
  startDate: string;
  initialPerson: 'personA' | 'personB';
  lastUpdated: string;
}

export interface UnavailabilityRequest {
  personId: 'personA' | 'personB';
  dates: string[]; // Array of ISO date strings
  reason?: string;
}

export interface ScheduleAdjustment {
  conflictDates: string[];
  originalAssignments: Record<string, 'personA' | 'personB'>;
  proposedAssignments: Record<string, 'personA' | 'personB'>;
  handoffCount: number;
  isValid: boolean;
  reason?: string; // Explanation if invalid
  warnings?: string[]; // Warnings about rule violations
}

export interface AppConfig {
  personA: User;
  personB: User;
  maxConsecutiveDays: number;
  defaultRotationDays: number;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  maxConsecutiveDays: Record<'personA' | 'personB', number>;
}

/**
 * Represents a continuous period where one person has custody
 */
export interface CustodyPeriod {
  personId: 'personA' | 'personB';
  startDate: string;
  endDate: string;
  dayCount: number;
}

export interface AlgorithmOptions {
  lookAheadDays: number;
  prioritizeExtension: boolean;
  maxHandoffs: number;
} 