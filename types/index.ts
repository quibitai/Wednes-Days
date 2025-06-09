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
  note?: string; // User-added note for this day
  // Legacy fields for backward compatibility
  isUnavailable?: boolean; 
  unavailableBy?: 'personA' | 'personB';
  isAdjusted?: boolean;
  originalAssignedTo?: 'personA' | 'personB';
  informationalUnavailability?: {
    personA?: boolean;
    personB?: boolean;
  };
  processedForRebalance?: boolean;
}

export interface SchedulePreview {
  current: Record<string, ScheduleEntry>; // Current saved schedule
  unavailable: Record<string, 'personA' | 'personB'>; // Days marked unavailable
  proposed: Record<string, ScheduleEntry>; // Auto-generated proposals
  manual: Record<string, ScheduleEntry>; // Manual adjustments to proposals
  hasUnsavedChanges: boolean; // Dirty state
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

/**
 * Represents a single change that can be undone
 */
export interface ChangeHistoryEntry {
  id: string;
  timestamp: string;
  type: 'manual_switch' | 'auto_rebalance' | 'mark_unavailable' | 'bulk_update';
  description: string;
  changedBy: 'personA' | 'personB';
  affectedDates: string[];
  previousEntries: Record<string, ScheduleEntry>;
}

/**
 * Change history management
 */
export interface ChangeHistory {
  entries: ChangeHistoryEntry[];
  maxEntries: number;
}

/**
 * Preview-commit workflow types
 */
export interface ScheduleChange {
  date: string;
  fromPerson: 'personA' | 'personB';
  toPerson: 'personA' | 'personB';
  reason: 'unavailable' | 'manual' | 'auto_balance';
} 