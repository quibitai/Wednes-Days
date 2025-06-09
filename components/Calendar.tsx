'use client';

import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay,
  isAfter,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, X, Check, Trash2, Ban, AlertTriangle, Calendar as CalendarIcon, ArrowRightLeft, StickyNote, Shield } from 'lucide-react';
import Image from 'next/image';
import type { CustodySchedule, AppConfig, ScheduleEntry } from '@/types';
import { hexToRgba } from '@/lib/colors';

interface CalendarProps {
  schedule: CustodySchedule | null;
  config: AppConfig | null;
  currentUser: 'personA' | 'personB';
  onDateClick?: (date: string, event?: React.MouseEvent) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  // New preview system props
  preview?: import('@/types').SchedulePreview | null;
  onMarkUnavailable?: (date: string, personId: 'personA' | 'personB') => void;
  onRemoveUnavailable?: (date: string) => void;
  onManualAdjustment?: (date: string, newAssignment: 'personA' | 'personB') => void;
  onDayDetailClick?: (date: string) => void;
  // Legacy props for backward compatibility
  previewChanges?: Record<string, 'personA' | 'personB'>;
  isPreviewMode?: boolean;
  onSwitchDay?: (date: string) => void;
  onToggleInformationalUnavailability?: (date: string, personId: 'personA' | 'personB') => void;
}

const getConsecutiveDays = (
  schedule: any,
  date: string,
  personId: 'personA' | 'personB'
): { before: number; after: number; total: number } => {
  if (!schedule?.entries) return { before: 0, after: 0, total: 1 };
  
  const entries = schedule.entries;
  
  // Use parseISO for consistent date parsing with the rest of the calendar
  const currentDate = parseISO(date);
  let before = 0;
  let after = 0;

  // Count days before
  let checkDate = new Date(currentDate);
  checkDate.setDate(checkDate.getDate() - 1);
  while (entries[checkDate.toISOString().split('T')[0]]?.assignedTo === personId) {
    before++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count days after
  checkDate = new Date(currentDate);
  checkDate.setDate(checkDate.getDate() + 1);
  while (entries[checkDate.toISOString().split('T')[0]]?.assignedTo === personId) {
    after++;
    checkDate.setDate(checkDate.getDate() + 1);
  }

  return { before, after, total: before + 1 + after };
};

const DateTooltip = ({ 
  entry, 
  date, 
  dateObj,
  config, 
  schedule, 
  isVisible,
  onClose,
  handoffInfo,
  calendarStart
}: { 
  entry: any; 
  date: string;
  dateObj: Date;
  config: any; 
  schedule: any; 
  isVisible: boolean;
  onClose?: () => void;
  handoffInfo?: { isHandoff: boolean; fromPerson?: 'personA' | 'personB'; toPerson?: 'personA' | 'personB' };
  calendarStart: Date;
}) => {
  if (!entry || !config || !isVisible) {
    return null;
  }

  const person = entry.assignedTo === 'personA' ? config.personA : config.personB;
  const consecutiveDays = getConsecutiveDays(schedule, date, entry.assignedTo);
  
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const isCurrentlyAdjusted = entry.originalAssignedTo && entry.assignedTo !== entry.originalAssignedTo;
  const hasNote = entry.note && entry.note.trim().length > 0;
  
  const unavailablePersons = [];
  if (entry.informationalUnavailability?.personA) {
    unavailablePersons.push(config.personA.name);
  }
  if (entry.informationalUnavailability?.personB) {
    unavailablePersons.push(config.personB.name);
  }
  
  // Determine tooltip positioning based on day of week and row position
  const dayOfWeek = dateObj.getDay();
  const isRightSide = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
  const isLeftSide = dayOfWeek === 0; // Sunday
  
  // Check if this date is in the first week of the calendar (top row) using the actual calendar start
  const daysDifference = Math.floor((dateObj.getTime() - calendarStart.getTime()) / (24 * 60 * 60 * 1000));
  const isTopRow = daysDifference < 7;
  
  // Position tooltip below for top row, above for other rows
  const verticalPosition = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';
  const arrowPosition = isTopRow ? 'bottom-full' : 'top-full';
  const arrowBorder = isTopRow ? 'border-b-4 border-b-gray-900' : 'border-t-4 border-t-gray-900';
  
  // Dynamic positioning classes with proper padding to avoid edge cutoff
  const positionClasses = isRightSide 
    ? `absolute ${verticalPosition} right-2` 
    : isLeftSide 
    ? `absolute ${verticalPosition} left-2`
    : `absolute ${verticalPosition} left-1/2 transform -translate-x-1/2`;
  
  return (
    <div 
      className={`${positionClasses} bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl z-[100] text-sm pointer-events-auto max-w-xs whitespace-nowrap`}
    >
      {/* Close button for mobile */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 text-gray-400 hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      
      <div className="flex items-center space-x-2 mb-1">
        <Image
          src="/dog-iconW.png"
          alt="Dog"
          width={12}
          height={12}
          className="object-contain"
        />
        <span className="font-medium">{person.name}</span>
        {isWeekend && <span className="text-xs bg-gray-600 px-1 rounded">Weekend</span>}
      </div>
      
      <div className="text-xs text-gray-300 whitespace-nowrap">
        <div>Period: Day {consecutiveDays.before + 1} of {consecutiveDays.total}</div>
        
        {/* Handoff info */}
        {handoffInfo?.isHandoff && handoffInfo.fromPerson && handoffInfo.toPerson && (
          <div className="text-purple-300 mt-1">
            <span>• Handoff from {config[handoffInfo.fromPerson].name} to {config[handoffInfo.toPerson].name}</span>
          </div>
        )}
        
        {/* Switching info */}
        {isCurrentlyAdjusted && (
          <div className="text-gray-300 mt-1">
            <span>• Switched from {config[entry.originalAssignedTo].name}</span>
          </div>
        )}
        
        {/* Unavailability info */}
        {unavailablePersons.length > 0 && (
          <div className="text-amber-300 mt-1">
            <span>• {unavailablePersons.join(', ')} unavailable</span>
          </div>
        )}
        
        {/* Legacy unavailability */}
        {entry.isUnavailable && (
          <div className="flex items-center space-x-1 text-red-300 mt-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Marked unavailable</span>
          </div>
        )}
        
        {/* Note content */}
        {hasNote && (
          <div className="text-yellow-300 mt-1 max-w-xs">
            <span>• Note: {entry.note}</span>
          </div>
        )}
      </div>
      
      {/* Tooltip arrow - positioned based on tooltip placement */}
      <div className={`absolute ${arrowPosition} ${
        isRightSide 
          ? `right-6 transform border-l-4 border-r-4 ${arrowBorder} border-transparent`
          : isLeftSide
          ? `left-6 transform border-l-4 border-r-4 ${arrowBorder} border-transparent`
          : `left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 ${arrowBorder} border-transparent`
      }`}></div>
    </div>
  );
};

export default function Calendar({
  schedule,
  config,
  currentUser,
  onDateClick,
  currentMonth,
  onMonthChange,
  preview = null,
  onMarkUnavailable,
  onRemoveUnavailable,
  onManualAdjustment,
  onDayDetailClick,
  // Legacy props
  previewChanges = {},
  isPreviewMode = false,
  onSwitchDay,
  onToggleInformationalUnavailability,
}: CalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ date: string; x: number; y: number } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveTooltip(null);
    };

    if (activeTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeTooltip]);

  if (!schedule || !config) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;

  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const today = new Date();

  const getPersonColor = (personId: 'personA' | 'personB', isAdjusted = false, isPreview = false) => {
    if (personId === 'personA') {
      return {
        backgroundColor: isPreview ? 'var(--color-person-a-100)' : isAdjusted ? 'var(--color-person-a-200)' : 'var(--color-person-a-100)',
        color: isAdjusted ? 'var(--color-person-a-900)' : 'var(--color-person-a-800)',
      };
    } else {
      return {
        backgroundColor: isPreview ? 'var(--color-person-b-100)' : isAdjusted ? 'var(--color-person-b-200)' : 'var(--color-person-b-100)',
        color: isAdjusted ? 'var(--color-person-b-900)' : 'var(--color-person-b-800)',
      };
    }
  };

  const getDayEntry = (date: Date): ScheduleEntry | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedule.entries[dateStr] || null;
  };

  const isHandoffDay = (date: Date): { isHandoff: boolean; fromPerson?: 'personA' | 'personB'; toPerson?: 'personA' | 'personB' } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentEntry = schedule.entries[dateStr];
    
    if (!currentEntry) return { isHandoff: false };
    
    // Get previous day
    const previousDate = addDays(date, -1);
    const previousDateStr = format(previousDate, 'yyyy-MM-dd');
    const previousEntry = schedule.entries[previousDateStr];
    
    if (!previousEntry) return { isHandoff: false };
    
    // Check if assignment changed from previous day
    if (previousEntry.assignedTo !== currentEntry.assignedTo) {
      return {
        isHandoff: true,
        fromPerson: previousEntry.assignedTo,
        toPerson: currentEntry.assignedTo
      };
    }
    
    return { isHandoff: false };
  };

  const handleRightClick = (e: React.MouseEvent, dateStr: string, entry: ScheduleEntry) => {
    e.preventDefault();
    const isCurrentMonth = isSameMonth(parseISO(dateStr), currentMonth);
    const isPast = !isAfter(parseISO(dateStr), today) && !isSameDay(parseISO(dateStr), today);
    
    if (!isCurrentMonth || isPast) return;

    setShowContextMenu({
      date: dateStr,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleInfoClick = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTooltip(activeTooltip === dateStr ? null : dateStr);
  };

  const renderDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = getDayEntry(date);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isToday = isSameDay(date, today);
    const isPast = !isAfter(date, today) && !isSameDay(date, today);
    const hasPreviewChange = previewChanges[dateStr];
    const isHovered = hoveredDate === dateStr;
    const handoffInfo = isHandoffDay(date);
    
    // Always render a cell, even if there's no entry
    const displayPerson = entry ? (hasPreviewChange || entry.assignedTo) : null;
    const isAdjusted = entry?.isAdjusted && !hasPreviewChange;
    const isUnavailable = entry?.isUnavailable;
    const hasNote = !!entry?.note;
    // Make overflow dates clickable too, only restrict past dates
    const isClickable = !isPast && onDateClick;

    // Check if current assignment differs from original for switch button state
    const isCurrentlyAdjusted = entry?.originalAssignedTo && entry.assignedTo !== entry.originalAssignedTo;

    // Check if tooltip should be visible (hover or manually activated)
    // Make sure we have an entry and it's not a past date
    const isTooltipVisible = Boolean(entry && !isPast && (isHovered || activeTooltip === dateStr));

    // Check if current user has blocked this day
    const isBlockedByCurrentUser = entry?.informationalUnavailability?.[currentUser];
    
    // Base day styling  
    let dayClasses = `
      border border-gray-300 dark:border-gray-500 min-h-[120px] p-2 relative
      transition-all duration-300 cursor-pointer hover:shadow-md group
      ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800 opacity-70'}
    `;

    let dayStyle: React.CSSProperties = {};

    if (handoffInfo.isHandoff) {
      dayClasses += ' bg-transparent';
    } else if (displayPerson) {
      const person = config[displayPerson];
      dayStyle.backgroundColor = hexToRgba(person.color, isCurrentMonth ? 0.2 : 0.1);
    } else {
      dayClasses += ` ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'}`;
    }

    if (hasPreviewChange) {
      const previewPerson = config[hasPreviewChange];
      dayStyle.backgroundColor = previewPerson.color;
      dayStyle.opacity = isCurrentMonth ? 0.3 : 0.15; // Slightly more intense for preview
      dayStyle.backgroundImage = `repeating-linear-gradient(
        45deg,
        transparent,
        transparent 8px,
        rgba(255,255,255,0.3) 8px,
        rgba(255,255,255,0.3) 16px
      )`;
    }

    // Border styling
    if (isHovered) {
      dayClasses += ' border-blue-500 dark:border-blue-400';
    } else if (isToday) {
      dayClasses += ' border-blue-300 dark:border-blue-500';
    } else if (isUnavailable) {
      dayClasses += ' border-red-400 border-dashed';
    } else {
      dayClasses += ' border-gray-200 dark:border-gray-500';
    }

    // Opacity for overflow days and past dates
    if (!isPast) {
      if (!isCurrentMonth) {
        dayStyle.opacity = 0.7; // Reduce opacity for overflow days
      }
    } else {
      dayStyle.opacity = 0.6; // Past dates are more muted
    }

    const personName = displayPerson ? (displayPerson === 'personA' ? config.personA.name : config.personB.name) : null;
    const previewPersonName = hasPreviewChange ? (hasPreviewChange === 'personA' ? config.personA.name : config.personB.name) : null;

    return (
      <div
        key={dateStr}
        className={dayClasses}
        onClick={() => {
          console.log('Calendar day clicked:', dateStr, 'onDayDetailClick:', !!onDayDetailClick);
          console.log('Date object:', date, 'Entry exists:', !!entry);
          console.log('Is current month:', isCurrentMonth, 'Is past:', isPast);
          onDayDetailClick?.(dateStr);
        }}
      >
        {/* Day number */}
        <div className="flex justify-between items-start mb-2 pointer-events-none">
          <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'}`}>
            {date.getDate()}
          </span>
        </div>
        
        {/* Note Indicator */}
        {hasNote && (
            <div className="absolute bottom-2 right-2 pointer-events-none">
                <StickyNote className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
            </div>
        )}

        {/* Today indicator - dog icon */}
        {isToday && (
          <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
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
        {handoffInfo.isHandoff && !isPast && (
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

        {/* Person indicator and status - only show if there's an entry, muted for overflow */}
        {entry && displayPerson && (
          <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
            {handoffInfo.isHandoff ? (
              /* Handoff day - show both names */
              <div className="flex text-xs">
                {/* From person name - left half */}
                <div className="w-1/2 pr-1">
                  <div 
                    className="font-medium text-center truncate"
                    style={{ color: handoffInfo.fromPerson ? config[handoffInfo.fromPerson].color : '#gray' }}
                  >
                    {handoffInfo.fromPerson ? config[handoffInfo.fromPerson].name : ''}
                  </div>
                </div>
                {/* To person name - right half */}
                <div className="w-1/2 pl-1">
                  <div 
                    className="font-medium text-center truncate"
                    style={{ color: handoffInfo.toPerson ? config[handoffInfo.toPerson].color : '#gray' }}
                  >
                    {handoffInfo.toPerson ? config[handoffInfo.toPerson].name : ''}
                  </div>
                </div>
              </div>
            ) : (
              /* Regular day - show single person with status */
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 flex-1 min-w-0">
                  <User className={`h-3 w-3 flex-shrink-0 ${
                    !isCurrentMonth ? 'text-gray-600 dark:text-gray-400' : ''
                  }`} />
                  <span className={`font-medium truncate ${
                    !isCurrentMonth ? 'text-gray-600 dark:text-gray-400' : ''
                  }`}>
                    {hasPreviewChange ? previewPersonName : personName}
                  </span>
                </div>
                
                {/* Right side with status indicators and info button */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {/* Legacy unavailability indicator */}
                  {isUnavailable && (
                    <Ban className={`h-3 w-3 text-red-500 dark:text-red-400 ${!isCurrentMonth ? 'opacity-60' : ''}`} />
                  )}
                  
                  {/* Blocked day indicator - show for current user */}
                  {isBlockedByCurrentUser && (
                    <div className="flex items-center space-x-1">
                      <Shield className={`h-3 w-3 text-orange-500 dark:text-orange-400 ${!isCurrentMonth ? 'opacity-60' : ''}`} />
                      <span className="text-xs text-orange-600 dark:text-orange-400">Blocked</span>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons - show on hover for future dates */}
        {!isPast && isHovered && (
          <div className="absolute top-1 right-1 flex space-x-1 z-20">
            {/* Block Day button - always show for future dates when handler exists */}
            {onToggleInformationalUnavailability && (
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
            
            {/* Unavailable button - show only if day is currently unavailable */}
            {isUnavailable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Add unavailable removal logic here if needed
                }}
                className="p-1 transition-colors pointer-events-auto text-red-600 dark:text-red-400"
                title="This day is marked unavailable"
              >
                <Ban className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Hover effect for clickable dates */}
        {isClickable && (
          <div className="absolute inset-0 bg-black dark:bg-white bg-opacity-0 dark:bg-opacity-0 hover:bg-opacity-5 dark:hover:bg-opacity-5 transition-opacity duration-200 rounded z-0 pointer-events-none" />
        )}

        {/* Enhanced Tooltip - show for all dates with entries, not just current month */}
        <div className="pointer-events-none">
          <DateTooltip 
            entry={entry}
            date={dateStr}
            dateObj={date}
            config={config}
            schedule={schedule}
            isVisible={isTooltipVisible}
            onClose={activeTooltip === dateStr ? () => setActiveTooltip(null) : undefined}
            handoffInfo={handoffInfo}
            calendarStart={calendarStart}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-500">
      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowContextMenu(null)}
          />
          <div 
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-500 shadow-lg rounded-lg py-2 min-w-[160px]"
            style={{ 
              left: showContextMenu.x, 
              top: showContextMenu.y,
              transform: 'translate(-50%, -10px)'
            }}
          >
            {schedule.entries[showContextMenu.date]?.isUnavailable ? (
              <button
                onClick={() => {
                  onRemoveUnavailable?.(showContextMenu.date);
                  setShowContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove Unavailability</span>
              </button>
            ) : (
              <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
                No actions available
              </div>
            )}
          </div>
        </>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-500">
        <button
          onClick={() => onMonthChange(addDays(currentMonth, -30))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
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

      {/* Preview Legend */}
      {isPreviewMode && Object.keys(previewChanges).length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 px-6 py-3">
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 border-dashed border-2 rounded"></div>
              <span className="text-gray-800 dark:text-gray-200 font-medium">Preview Changes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">New Assignment</span>
            </div>
          </div>
        </div>
      )}

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 overflow-hidden rounded-b-lg">
        {days.map(renderDay)}
      </div>
    </div>
  );
} 