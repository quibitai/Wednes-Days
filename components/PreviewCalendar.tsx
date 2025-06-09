'use client';

import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay,
  isAfter
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Ban, ArrowRightLeft, StickyNote, Shield } from 'lucide-react';
import Image from 'next/image';
import type { SchedulePreview, AppConfig } from '@/types';
import { hexToRgba } from '@/lib/colors';

interface PreviewCalendarProps {
  preview: SchedulePreview;
  config: AppConfig;
  currentUser: 'personA' | 'personB';
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onMarkUnavailable: (date: string, personId: 'personA' | 'personB') => void;
  onRemoveUnavailable: (date: string) => void;
  onManualAdjustment: (date: string, newAssignment: 'personA' | 'personB') => void;
  onDayDetailClick?: (date: string) => void;
  onToggleInformationalUnavailability?: (date: string, personId: 'personA' | 'personB') => void;
  onAcceptChanges?: () => void;
  onDiscardChanges?: () => void;
}

export default function PreviewCalendar({
  preview,
  config,
  currentUser,
  currentMonth,
  onMonthChange,
  onMarkUnavailable,
  onRemoveUnavailable,
  onManualAdjustment,
  onDayDetailClick,
  onToggleInformationalUnavailability,
  onAcceptChanges,
  onDiscardChanges,
}: PreviewCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const today = new Date();

  // Get effective assignment for a date (manual > proposed > current)
  const getEffectiveAssignment = (dateStr: string): 'personA' | 'personB' | null => {
    if (preview.manual[dateStr]) {
      return preview.manual[dateStr].assignedTo;
    }
    if (preview.proposed[dateStr]) {
      return preview.proposed[dateStr].assignedTo;
    }
    if (preview.current[dateStr]) {
      return preview.current[dateStr].assignedTo;
    }
    return null;
  };

  // Check if a date has been changed from original
  const isDateChanged = (dateStr: string): boolean => {
    const currentAssignment = preview.current[dateStr]?.assignedTo;
    const effectiveAssignment = getEffectiveAssignment(dateStr);
    return currentAssignment !== effectiveAssignment;
  };

  // Get the reason for a change
  const getChangeReason = (dateStr: string): 'unavailable' | 'manual' | 'proposed' | null => {
    if (preview.unavailable[dateStr]) return 'unavailable';
    if (preview.manual[dateStr]) return 'manual';
    if (preview.proposed[dateStr]) return 'proposed';
    return null;
  };

  const renderDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isCurrentMonth = format(date, 'MM') === format(currentMonth, 'MM');
    const isPast = !isAfter(date, new Date()) && !isSameDay(date, new Date());
    
    // Get effective assignment (considering all changes)
    const effectiveAssignment = preview.manual[dateStr]?.assignedTo || 
                              preview.proposed[dateStr]?.assignedTo || 
                              preview.current[dateStr]?.assignedTo;
    
    // Check if this date has changed
    const originalAssignment = preview.current[dateStr]?.assignedTo;
    const isChanged = originalAssignment && effectiveAssignment && originalAssignment !== effectiveAssignment;
    
    // Check if current user has blocked this day
    const isBlockedByCurrentUser = preview.current[dateStr]?.informationalUnavailability?.[currentUser];
    
    // Determine change reason
    let changeReason: 'unavailable' | 'manual' | 'proposed' | null = null;
    if (isChanged) {
      if (preview.unavailable[dateStr]) {
        changeReason = 'unavailable';
      } else if (preview.manual[dateStr]) {
        changeReason = 'manual';
      } else if (preview.proposed[dateStr]) {
        changeReason = 'proposed';
      }
    }

    // Check if this is a handoff day
    const isHandoffDay = (): { isHandoff: boolean; fromPerson?: 'personA' | 'personB'; toPerson?: 'personA' | 'personB' } => {
      const prevDate = format(addDays(date, -1), 'yyyy-MM-dd');
      const prevAssignment = preview.manual[prevDate]?.assignedTo || 
                            preview.proposed[prevDate]?.assignedTo || 
                            preview.current[prevDate]?.assignedTo;
      
      if (prevAssignment && effectiveAssignment && prevAssignment !== effectiveAssignment) {
        return {
          isHandoff: true,
          fromPerson: prevAssignment,
          toPerson: effectiveAssignment
        };
      }
      return { isHandoff: false };
    };

    const handoffInfo = isHandoffDay();
    
    // Base classes for day cell
    let dayClasses = `
      relative h-24 border border-gray-300 dark:border-gray-500 cursor-pointer
      transition-all duration-200 hover:shadow-md overflow-hidden
    `;
    
    // Style based on assignment and changes
    let dayStyle: React.CSSProperties = {};
    
    if (handoffInfo.isHandoff) {
      // Handoff days get special styling handled below
      dayClasses += ' bg-transparent';
    } else if (effectiveAssignment && config[effectiveAssignment]) {
      const color = config[effectiveAssignment].color;
      dayStyle.backgroundColor = hexToRgba(color, isCurrentMonth ? 0.2 : 0.1);
    } else {
      // Unassigned days, including overflow
      dayClasses += ` ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'}`;
    }

    // Add border styling for changes
    if (isChanged) {
      if (changeReason === 'unavailable') {
        dayClasses += ' border-red-400 border-2 border-dashed';
      } else if (changeReason === 'manual') {
        dayClasses += ' border-blue-400 border-2';
      } else if (changeReason === 'proposed') {
        dayClasses += ' border-green-400 border-2';
      }
    }

    const hasNote = !!preview.current[dateStr]?.note;

    return (
      <div
        key={dateStr}
        className={`border border-gray-300 dark:border-gray-500 min-h-[120px] p-2 relative group
          cursor-pointer transition-colors
          ${handoffInfo.isHandoff 
            ? '' // No background classes for handoff days - use inline styles only
            : `hover:bg-gray-50 dark:hover:bg-gray-800 ${isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-800 opacity-60'}`
          }
          ${isChanged ? 'border-dashed border-2 border-green-500' : ''}
        `}
        style={dayStyle}
        onMouseEnter={() => setHoveredDate(dateStr)}
        onMouseLeave={() => setHoveredDate(null)}
        onClick={() => onDayDetailClick?.(dateStr)}
      >
        <div className="flex justify-between items-start mb-2 pointer-events-none">
          <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'}`}>
            {format(date, 'd')}
          </span>
        </div>

        {/* Note Indicator */}
        {hasNote && (
          <div className="absolute bottom-2 right-2 pointer-events-none z-10">
            <StickyNote className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </div>
        )}

        {/* Today indicator - dog icon */}
        {isToday && (
          <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 z-20">
            {/* The 'dark:' modifier with 'hidden' and 'block' can be used for theme-specific images */}
            <Image
              src="/dog-iconB.png"
              alt="Today"
              width={40}
              height={40}
              className="object-contain drop-shadow-lg dark:hidden"
            />
            <Image
              src="/dog-iconW.png"
              alt="Today"
              width={40}
              height={40}
              className="object-contain drop-shadow-lg hidden dark:block"
            />
          </div>
        )}

        {/* Handoff day split background */}
        {handoffInfo.isHandoff && (
          <div className="absolute inset-0 flex pointer-events-none">
            {/* From person half */}
            <div 
              className="w-1/2 h-full"
              style={{
                backgroundColor: hexToRgba(handoffInfo.fromPerson ? config[handoffInfo.fromPerson].color : '#808080', isCurrentMonth ? 0.2 : 0.1)
              }}
            />
            {/* To person half */}
            <div 
              className="w-1/2 h-full"
              style={{
                backgroundColor: hexToRgba(handoffInfo.toPerson ? config[handoffInfo.toPerson].color : '#808080', isCurrentMonth ? 0.2 : 0.1)
              }}
            />
            {/* Handoff dotted divider line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 transform -translate-x-1/2 border-l-2 border-dotted border-gray-500" />
          </div>
        )}

        {/* Assignment display - different for handoff vs regular days */}
        {handoffInfo.isHandoff ? (
          <div className="absolute bottom-2 left-0 right-0 flex z-10">
            {/* From person name - left half */}
            <div className="w-1/2 px-1">
              <div 
                className="text-xs font-medium text-center truncate"
                style={{ color: handoffInfo.fromPerson ? config[handoffInfo.fromPerson].color : '#gray' }}
              >
                {handoffInfo.fromPerson ? config[handoffInfo.fromPerson].name : ''}
              </div>
            </div>
            {/* To person name - right half */}
            <div className="w-1/2 px-1">
              <div 
                className="text-xs font-medium text-center truncate"
                style={{ color: handoffInfo.toPerson ? config[handoffInfo.toPerson].color : '#gray' }}
              >
                {handoffInfo.toPerson ? config[handoffInfo.toPerson].name : ''}
              </div>
            </div>
          </div>
        ) : (
          effectiveAssignment && (
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <div className="text-xs font-medium truncate" style={{ color: config[effectiveAssignment].color }}>
                {config[effectiveAssignment].name}
              </div>
              {isChanged && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {changeReason === 'unavailable' && '• Unavailable'}
                  {changeReason === 'manual' && '• Manual'}
                  {changeReason === 'proposed' && '• Auto-suggested'}
                </div>
              )}
            </div>
          )
        )}

        {/* Action buttons - show on hover for ALL days including overflow, or if unavailable */}
        {(hoveredDate === dateStr || preview.unavailable[dateStr]) && (
          <div className="absolute top-1 right-1 flex space-x-1 z-20">
            {/* Block Day button - show for future dates when handler exists */}
            {!isPast && onToggleInformationalUnavailability && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleInformationalUnavailability(dateStr, currentUser);
                }}
                className={`p-1 transition-colors pointer-events-auto ${
                  isBlockedByCurrentUser
                    ? 'text-orange-600 dark:text-orange-400' // Style for an already-blocked day
                    : 'text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400'
                }`}
                title={
                  isBlockedByCurrentUser
                    ? "You have blocked this day. Click to unblock."
                    : "Block this day (auto-scheduler will not assign it to you)."
                }
              >
                <Shield className="h-4 w-4" />
              </button>
            )}
            
            {/* Remove unavailable */}
            {preview.unavailable[dateStr] && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveUnavailable(dateStr);
                }}
                className="text-red-500 hover:text-red-600 transition-colors pointer-events-auto"
                title="Remove unavailability"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Mark unavailable */}
            {!preview.unavailable[dateStr] && effectiveAssignment === currentUser && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkUnavailable(dateStr, currentUser);
                }}
                className="text-red-500 hover:text-red-600 transition-colors pointer-events-auto"
                title="Mark unavailable"
              >
                <Ban className="h-4 w-4" />
              </button>
            )}
            
            {/* Manual assignment toggle */}
            {!preview.unavailable[dateStr] && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentAssignment = getEffectiveAssignment(dateStr);
                  if (currentAssignment) {
                    const newAssignment = currentAssignment === 'personA' ? 'personB' : 'personA';
                    onManualAdjustment(dateStr, newAssignment);
                  }
                }}
                className="text-blue-500 hover:text-blue-600 transition-colors pointer-events-auto"
                title="Switch assignment"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(new Date(day));
    day = addDays(day, 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-500">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-500">
        <button
          onClick={() => onMonthChange(addDays(currentMonth, -30))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400 pointer-events-auto"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={() => onMonthChange(addDays(currentMonth, 30))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) => 
          week.map((day) => renderDay(day))
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-500 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-orange-500" />
              <span>Block Day</span>
            </div>
            <div className="flex items-center space-x-1">
              <Ban className="w-3 h-3 text-red-500" />
              <span>Mark Unavailable</span>
            </div>
            <div className="flex items-center space-x-1">
              <ArrowRightLeft className="w-3 h-3 text-blue-500" />
              <span>Swap Assignment</span>
            </div>
            <div className="flex items-center space-x-1">
              <StickyNote className="w-3 h-3 text-yellow-500" />
              <span>Add Note</span>
            </div>
          </div>
          
          {/* Accept/Discard buttons - show when there are unsaved changes */}
          {preview.hasUnsavedChanges && (
            <div className="flex space-x-2">
              <button
                onClick={onDiscardChanges}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={onAcceptChanges}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                Accept
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 