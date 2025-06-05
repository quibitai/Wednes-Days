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
import { ChevronLeft, ChevronRight, Clock, User, X, Check, Trash2, Ban, AlertTriangle, Calendar as CalendarIcon, ArrowRightLeft, StickyNote, Info } from 'lucide-react';
import Image from 'next/image';
import type { CustodySchedule, AppConfig, ScheduleEntry } from '@/types';

interface CalendarProps {
  schedule: CustodySchedule | null;
  config: AppConfig | null;
  currentUser: 'personA' | 'personB';
  onDateClick?: (date: string, event?: React.MouseEvent) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  previewChanges?: Record<string, 'personA' | 'personB'>;
  isPreviewMode?: boolean;
  onRemoveUnavailability?: (date: string) => void;
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
  previewChanges = {},
  isPreviewMode = false,
  onRemoveUnavailability,
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
    const hasNote = entry?.note && entry.note.trim().length > 0;
    // Make overflow dates clickable too, only restrict past dates
    const isClickable = !isPast && onDateClick;

    // Check if current assignment differs from original for switch button state
    const isCurrentlyAdjusted = entry?.originalAssignedTo && entry.assignedTo !== entry.originalAssignedTo;

    // Check if tooltip should be visible (hover or manually activated)
    // Make sure we have an entry and it's not a past date
    const isTooltipVisible = Boolean(entry && !isPast && (isHovered || activeTooltip === dateStr));
    
    // Base classes without color-specific styling
    let dayClasses = `
      relative min-h-[80px] border-2 border-gray-200 dark:border-gray-800 transition-all duration-200 cursor-pointer group font-normal
      bg-white dark:bg-black
      ${isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600 opacity-85'}
      ${isClickable ? 'hover:bg-gray-50 dark:hover:bg-gray-900' : 'cursor-not-allowed opacity-60'}
      ${isPast ? 'bg-gray-50 dark:bg-black/50' : ''}
      ${isHovered && !isPast ? 'shadow-lg' : ''}
      ${isTooltipVisible ? 'z-[110]' : 'z-10'}
    `;

    // Calculate background color and style
    let dayStyle: React.CSSProperties = {};
    
    if (!isPast && displayPerson && !handoffInfo.isHandoff) {
      const personColors = getPersonColor(displayPerson, isAdjusted, !!hasPreviewChange);
      dayStyle = {
        backgroundColor: personColors.backgroundColor,
        color: personColors.color,
      };
      
      if (hasPreviewChange) {
        dayClasses += ' border-dashed';
      }
      
      if (!isCurrentMonth) {
        dayStyle.opacity = 0.85;
      }
    }

    const personName = displayPerson ? (displayPerson === 'personA' ? config.personA.name : config.personB.name) : null;
    const previewPersonName = hasPreviewChange ? (hasPreviewChange === 'personA' ? config.personA.name : config.personB.name) : null;

    return (
      <div
        key={dateStr}
        className={dayClasses.trim()}
        style={dayStyle}
        onClick={(e) => isClickable && onDateClick(dateStr, e)}
        onContextMenu={(e) => entry && handleRightClick(e, dateStr, entry)}
        onMouseEnter={() => {
          setHoveredDate(dateStr);
          // Close any active manual tooltip when hovering a different day
          if (activeTooltip && activeTooltip !== dateStr) {
            setActiveTooltip(null);
          }
        }}
        onMouseLeave={() => {
          setHoveredDate(null);
          setTooltipPosition(null);
        }}
      >
        {/* Handoff day split background */}
        {handoffInfo.isHandoff && !isPast && (
          <div className="absolute inset-0 flex overflow-hidden">
            {/* Left half - outgoing person */}
            <div 
              className={`w-1/2 h-full ${!isCurrentMonth ? 'opacity-85' : ''}`}
              style={{
                backgroundColor: handoffInfo.fromPerson === 'personA' ? 'var(--color-person-a-100)' : 'var(--color-person-b-100)'
              }}
            />
            {/* Right half - incoming person */}
            <div 
              className={`w-1/2 h-full ${!isCurrentMonth ? 'opacity-85' : ''}`}
              style={{
                backgroundColor: handoffInfo.toPerson === 'personA' ? 'var(--color-person-a-100)' : 'var(--color-person-b-100)'
              }}
            />
            {/* Vertical divider */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500 transform -translate-x-px"></div>
          </div>
        )}

        {/* Date number - muted for overflow dates, ensure normal font weight */}
        <div className={`absolute top-2 left-2 text-sm font-medium z-10 ${
          !isCurrentMonth ? 'text-gray-600 dark:text-gray-400' : 
          handoffInfo.isHandoff ? 
            (handoffInfo.fromPerson === 'personA' ? 'text-person-a-800' : 'text-person-b-800') :
            ''
        }`}>
          {format(date, 'd')}
        </div>

        {/* Today indicator - dog icon */}
        {isToday && (
          <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <Image
              src="/dog-iconB.png"
              alt="Today"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        )}

        {/* Action buttons - always visible for current month, non-past dates */}
        {isCurrentMonth && !isPast && entry && (
          <div className="absolute top-1 right-1 flex space-x-1 z-10">
            {/* Note indicator - moved to top area */}
            {hasNote && (
              <div className="p-1">
                <StickyNote className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}
            
            {/* Switch button */}
            {onSwitchDay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchDay(dateStr);
                }}
                className={`p-1 transition-colors ${
                  isCurrentlyAdjusted 
                    ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'
                }`}
                title={isCurrentlyAdjusted ? "Day has been switched - click to switch back" : "Switch assignment to other person"}
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            )}
            
            {/* Informational unavailability button */}
            {onToggleInformationalUnavailability && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleInformationalUnavailability(dateStr, currentUser);
                }}
                className={`p-1 transition-colors ${
                  entry.informationalUnavailability?.[currentUser]
                    ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'
                }`}
                title={
                  entry.informationalUnavailability?.[currentUser]
                    ? "You marked yourself unavailable - click to remove"
                    : "Mark yourself as unavailable (informational only)"
                }
              >
                <Ban className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Quick actions - show on hover for legacy unavailability removal */}
        {isHovered && !isPast && entry && isUnavailable && onRemoveUnavailability && (
          <div className="absolute top-1 left-1 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveUnavailability(dateStr);
              }}
              className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Remove unavailability"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Selection indicator */}
        {/* Preview indicator */}
        {hasPreviewChange && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Clock className="h-3 w-3 text-white" />
            </div>
          </div>
        )}

        {/* Person indicator and status - only show if there's an entry, muted for overflow */}
        {entry && displayPerson && (
          <div className="absolute bottom-2 left-2 right-2 z-10">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1 flex-1 min-w-0">
                <User className={`h-3 w-3 flex-shrink-0 ${
                  !isCurrentMonth ? 'text-gray-600 dark:text-gray-400' : 
                  handoffInfo.isHandoff ? 
                    (handoffInfo.fromPerson === 'personA' ? 'text-person-a-800' : 'text-person-b-800') :
                    ''
                }`} />
                <span className={`font-medium truncate ${
                  !isCurrentMonth ? 'text-gray-600 dark:text-gray-400' : 
                  handoffInfo.isHandoff ? 
                    (handoffInfo.fromPerson === 'personA' ? 'text-person-a-800' : 'text-person-b-800') :
                    ''
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
                
                {/* Info button - always show for entries, aligned with unavailability */}
                {!isPast && (
                  <button
                    onClick={(e) => {
                      handleInfoClick(dateStr, e);
                    }}
                    className={`p-0.5 transition-colors ${
                      activeTooltip === dateStr
                        ? 'text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 rounded-full'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full'
                    }`}
                    title="Show day details"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hover effect for clickable dates */}
        {isClickable && (
          <div className="absolute inset-0 bg-black dark:bg-white bg-opacity-0 dark:bg-opacity-0 hover:bg-opacity-5 dark:hover:bg-opacity-5 transition-opacity duration-200 rounded z-0" />
        )}

        {/* Enhanced Tooltip - show for all dates with entries, not just current month */}
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
    );
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowContextMenu(null)}
          />
          <div 
            className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-lg py-2 min-w-[160px]"
            style={{ 
              left: showContextMenu.x, 
              top: showContextMenu.y,
              transform: 'translate(-50%, -10px)'
            }}
          >
            {schedule.entries[showContextMenu.date]?.isUnavailable ? (
              <button
                onClick={() => {
                  onRemoveUnavailability?.(showContextMenu.date);
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
      <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onMonthChange(addDays(monthStart, -1))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          
          <button
            onClick={() => onMonthChange(addDays(monthEnd, 1))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
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
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="px-3 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
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