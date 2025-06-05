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
  selectedDates?: string[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  previewChanges?: Record<string, 'personA' | 'personB'>;
  isPreviewMode?: boolean;
  onRemoveUnavailability?: (date: string) => void;
  onMarkUnavailable?: () => void;
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
  isSelected,
  isVisible,
  onClose,
  handoffInfo
}: { 
  entry: any; 
  date: string;
  dateObj: Date;
  config: any; 
  schedule: any; 
  isSelected: boolean;
  isVisible: boolean;
  onClose?: () => void;
  handoffInfo?: { isHandoff: boolean; fromPerson?: 'personA' | 'personB'; toPerson?: 'personA' | 'personB' };
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
  
  // Determine tooltip positioning based on day of week
  const dayOfWeek = dateObj.getDay();
  const isRightSide = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
  const isLeftSide = dayOfWeek === 0; // Sunday
  
  // Dynamic positioning classes
  const positionClasses = isRightSide 
    ? "absolute bottom-full right-0 mb-2" 
    : isLeftSide 
    ? "absolute bottom-full left-0 mb-2"
    : "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2";
  
  return (
    <div 
      className={`${positionClasses} bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl z-[60] text-sm pointer-events-auto max-w-xs whitespace-nowrap`}
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
        {isWeekend && <span className="text-xs bg-blue-600 px-1 rounded">Weekend</span>}
        {handoffInfo?.isHandoff && (
          <span className="text-xs bg-purple-600 px-1 rounded">Handoff</span>
        )}
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
          <div className="text-blue-300 mt-1">
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
        
        {isSelected && (
          <div className="text-blue-300 mt-1">• Selected for unavailability</div>
        )}
      </div>
      
      {/* Tooltip arrow - positioned based on tooltip placement */}
      <div className={`absolute top-full ${
        isRightSide 
          ? "right-4 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          : isLeftSide
          ? "left-4 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          : "left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
      }`}></div>
    </div>
  );
};

export default function Calendar({
  schedule,
  config,
  currentUser,
  onDateClick,
  selectedDates = [],
  currentMonth,
  onMonthChange,
  previewChanges = {},
  isPreviewMode = false,
  onRemoveUnavailability,
  onMarkUnavailable,
  onSwitchDay,
  onToggleInformationalUnavailability,
}: CalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ date: string; x: number; y: number } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

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

  // Add debugging function to window for console access
  useEffect(() => {
    (window as any).debugCalendar = () => {
      console.log('=== CALENDAR DEBUG ===');
      console.log('Current Month:', currentMonth);
      console.log('Month Start:', startOfMonth(currentMonth));
      console.log('Calendar Start:', startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }));
      
      if (schedule) {
        console.log('Schedule Start Date:', schedule.startDate);
        console.log('First 14 schedule entries:');
        Object.entries(schedule.entries).slice(0, 14).forEach(([date, entry]) => {
          const d = new Date(date);
          console.log(`${date} (${d.toLocaleDateString('en-US', { weekday: 'short' })}) -> ${entry.assignedTo}`);
        });
      }
    };
  }, [schedule, currentMonth]);

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

  // Debug logging to understand the date alignment issue
  console.log('Calendar Debug:', {
    currentMonth: currentMonth.toISOString(),
    monthStart: monthStart.toISOString(),
    calendarStart: calendarStart.toISOString(),
    calendarStartDay: calendarStart.getDay(), // Should be 0 (Sunday)
  });

  // Debug schedule data
  if (schedule) {
    console.log('Schedule Debug:', {
      startDate: schedule.startDate,
      firstFewEntries: Object.entries(schedule.entries).slice(0, 7).map(([date, entry]) => ({
        date,
        assignedTo: entry.assignedTo,
        dayOfWeek: new Date(date).getDay(),
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
      }))
    });
  }

  const days = [];
  let day = calendarStart;

  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Debug first few days of the calendar
  console.log('First 7 days:', days.slice(0, 7).map(d => ({
    date: format(d, 'yyyy-MM-dd'),
    dayName: format(d, 'EEEE'),
    dayOfWeek: d.getDay()
  })));

  const today = new Date();

  const getPersonColor = (personId: 'personA' | 'personB', isAdjusted = false, isPreview = false) => {
    const baseColors = {
      personA: isPreview 
        ? 'bg-blue-100 border-blue-300 text-blue-800' 
        : isAdjusted 
          ? 'bg-blue-200 border-blue-400 text-blue-900' 
          : 'bg-blue-100 border-blue-200 text-blue-800',
      personB: isPreview 
        ? 'bg-orange-100 border-orange-300 text-orange-800' 
        : isAdjusted 
          ? 'bg-orange-200 border-orange-400 text-orange-900' 
          : 'bg-orange-100 border-orange-200 text-orange-800',
    };
    return baseColors[personId];
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
    const isPast = !isAfter(date, today) && !isToday;
    const isSelected = selectedDates.includes(dateStr);
    const hasPreviewChange = previewChanges[dateStr];
    const isHovered = hoveredDate === dateStr;
    const handoffInfo = isHandoffDay(date);
    
    // Debug logging for the 27th and other potentially bold days
    if (dateStr === '2025-06-27' || dateStr.includes('2025-06-')) {
      console.log(`${dateStr} debug:`, {
        isSelected,
        selectedDates,
        hasPreviewChange,
        previewChanges,
        isToday,
        isAdjusted: entry?.isAdjusted,
        isCurrentlyAdjusted: entry?.originalAssignedTo && entry.assignedTo !== entry.originalAssignedTo,
        entry
      });
    }
    
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
    
    // Debug tooltip visibility with more detail
    if (isHovered || activeTooltip === dateStr || dateStr === '2025-06-28') {
      console.log('Tooltip visibility debug for', dateStr, {
        entry: !!entry,
        isPast,
        isHovered,
        activeTooltip,
        activeTooltipMatches: activeTooltip === dateStr,
        hoveredOrActive: (isHovered || activeTooltip === dateStr),
        finalCalc: Boolean(entry && !isPast && (isHovered || activeTooltip === dateStr)),
        isTooltipVisible,
        today: today.toISOString().split('T')[0],
        dateStr,
        isAfterToday: isAfter(date, today),
        isSameAsToday: isSameDay(date, today)
      });
    }

    // Different visual states - make overflow dates more muted
    // Remove any potential bold styling that might be causing the issue
    let dayClasses = `
      relative min-h-[80px] border-2 transition-all duration-200 cursor-pointer group font-normal
      ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400 opacity-60'}
      ${isSelected ? 'ring-2 ring-yellow-400 ring-opacity-70 shadow-lg scale-105' : ''}
      ${isClickable ? 'hover:shadow-md hover:scale-102' : 'cursor-not-allowed opacity-60'}
      ${isPast ? 'bg-gray-50' : ''}
      ${isHovered && !isPast ? 'shadow-lg' : ''}
      ${!isCurrentMonth ? 'border-gray-200' : 'border-gray-300'}
    `;

    // Background color based on assignment - muted for overflow dates
    // Don't use isAdjusted for visual changes as it may be causing the bold appearance
    if (!isPast && displayPerson && !handoffInfo.isHandoff) {
      if (hasPreviewChange) {
        const previewColor = getPersonColor(hasPreviewChange, false, true);
        dayClasses += ` ${previewColor} border-dashed border-2`;
        if (!isCurrentMonth) {
          dayClasses += ' opacity-50';
        }
      } else {
        // Use normal colors, don't emphasize adjusted days with bold styling
        const personColor = getPersonColor(displayPerson, false); // Changed from isAdjusted to false
        dayClasses += ` ${personColor}`;
        if (!isCurrentMonth) {
          dayClasses += ' opacity-50';
        }
      }
    } else if (!isPast && !handoffInfo.isHandoff) {
      // Default background for non-handoff days without assignments
      dayClasses += ' bg-white';
    }

    const personName = displayPerson ? (displayPerson === 'personA' ? config.personA.name : config.personB.name) : null;
    const previewPersonName = hasPreviewChange ? (hasPreviewChange === 'personA' ? config.personA.name : config.personB.name) : null;

    return (
      <div
        key={dateStr}
        className={dayClasses.trim()}
        onClick={(e) => isClickable && onDateClick(dateStr, e)}
        onContextMenu={(e) => entry && handleRightClick(e, dateStr, entry)}
        onMouseEnter={() => {
          console.log('Mouse enter for date:', dateStr);
          setHoveredDate(dateStr);
          // Close any active manual tooltip when hovering a different day
          if (activeTooltip && activeTooltip !== dateStr) {
            setActiveTooltip(null);
          }
        }}
        onMouseLeave={() => {
          console.log('Mouse leave for date:', dateStr);
          setHoveredDate(null);
        }}
      >
        {/* Handoff day split background */}
        {handoffInfo.isHandoff && !isPast && (
          <div className="absolute inset-0 flex">
            {/* Left half - outgoing person */}
            <div className={`w-1/2 h-full ${
              handoffInfo.fromPerson === 'personA' 
                ? 'bg-blue-100 border-blue-200' 
                : 'bg-orange-100 border-orange-200'
            } ${!isCurrentMonth ? 'opacity-50' : ''}`} />
            {/* Right half - incoming person */}
            <div className={`w-1/2 h-full ${
              handoffInfo.toPerson === 'personA' 
                ? 'bg-blue-100 border-blue-200' 
                : 'bg-orange-100 border-orange-200'
            } ${!isCurrentMonth ? 'opacity-50' : ''}`} />
            {/* Vertical divider */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 transform -translate-x-px"></div>
          </div>
        )}

        {/* Date number - muted for overflow dates, ensure normal font weight */}
        <div className={`absolute top-2 left-2 text-sm font-medium z-10 ${!isCurrentMonth ? 'text-gray-400' : ''}`}>
          {format(date, 'd')}
        </div>

        {/* Today indicator - dog icon */}
        {isToday && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
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
                <StickyNote className="h-4 w-4 text-yellow-600" />
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
                    ? 'text-blue-600 hover:text-blue-700' 
                    : 'text-gray-400 hover:text-gray-500'
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
                    ? 'text-red-600 hover:text-red-700'
                    : 'text-gray-400 hover:text-gray-500'
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
        {isSelected && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
        )}

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
                <User className={`h-3 w-3 flex-shrink-0 ${!isCurrentMonth ? 'text-gray-400' : ''}`} />
                <span className={`font-medium truncate ${!isCurrentMonth ? 'text-gray-400' : ''}`}>
                  {hasPreviewChange ? previewPersonName : personName}
                </span>
              </div>
              
              {/* Right side with status indicators and info button */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                {/* Legacy unavailability indicator */}
                {isUnavailable && (
                  <Ban className={`h-3 w-3 text-red-500 ${!isCurrentMonth ? 'opacity-60' : ''}`} />
                )}
                
                {/* Info button - always show for entries, aligned with unavailability */}
                {!isPast && (
                  <button
                    onClick={(e) => {
                      handleInfoClick(dateStr, e);
                    }}
                    className={`p-0.5 transition-colors ${
                      activeTooltip === dateStr
                        ? 'text-blue-600 bg-blue-100 rounded-full'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full'
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
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 transition-opacity duration-200 rounded z-0" />
        )}

        {/* Enhanced Tooltip - show for all dates with entries, not just current month */}
        <DateTooltip 
          entry={entry}
          date={dateStr}
          dateObj={date}
          config={config}
          schedule={schedule}
          isSelected={isSelected}
          isVisible={isTooltipVisible}
          onClose={activeTooltip === dateStr ? () => setActiveTooltip(null) : undefined}
          handoffInfo={handoffInfo}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowContextMenu(null)}
          />
          <div 
            className="fixed z-50 bg-white border shadow-lg rounded-lg py-2 min-w-[160px]"
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
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove Unavailability</span>
              </button>
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm">
                Select dates and mark unavailable
              </div>
            )}
          </div>
        </>
      )}

      {/* Calendar Header */}
      <div className="border-b bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onMonthChange(addDays(monthStart, -1))}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          
          <button
            onClick={() => onMonthChange(addDays(monthEnd, 1))}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Preview Legend */}
      {isPreviewMode && Object.keys(previewChanges).length > 0 && (
        <div className="border-b bg-blue-50 px-6 py-3">
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border-blue-300 border-dashed border-2 rounded"></div>
              <span className="text-blue-800 font-medium">Preview Changes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-gray-700">New Assignment</span>
            </div>
          </div>
        </div>
      )}

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="px-3 py-3 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map(renderDay)}
      </div>
    </div>
  );
} 