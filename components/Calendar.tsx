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
  isAfter,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, X, Check, Trash2, Ban, Dog, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import type { CustodySchedule, AppConfig, ScheduleEntry } from '@/types';

interface CalendarProps {
  schedule: CustodySchedule | null;
  config: AppConfig | null;
  onDateClick?: (date: string, event?: React.MouseEvent) => void;
  selectedDates?: string[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  previewChanges?: Record<string, 'personA' | 'personB'>;
  isPreviewMode?: boolean;
  onRemoveUnavailability?: (date: string) => void;
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
  config, 
  schedule, 
  isSelected 
}: { 
  entry: any; 
  date: string; 
  config: any; 
  schedule: any; 
  isSelected: boolean;
}) => {
  if (!entry || !config) return null;

  const person = entry.assignedTo === 'personA' ? config.personA : config.personB;
  const consecutiveDays = getConsecutiveDays(schedule, date, entry.assignedTo);
  
  // Use parseISO for consistent date parsing with the rest of the calendar
  const dateObj = parseISO(date);
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6; // Sunday = 0, Saturday = 6
  
  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap text-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <div className="flex items-center space-x-2 mb-1">
        <Dog className="h-3 w-3" />
        <span className="font-medium">{person.name}</span>
        {isWeekend && <span className="text-xs bg-blue-600 px-1 rounded">Weekend</span>}
      </div>
      
      <div className="text-xs text-gray-300">
        <div>Period: Day {consecutiveDays.before + 1} of {consecutiveDays.total}</div>
        {entry.isUnavailable && (
          <div className="flex items-center space-x-1 text-red-300 mt-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Marked unavailable</span>
          </div>
        )}
        {entry.isAdjusted && (
          <div className="flex items-center space-x-1 text-yellow-300 mt-1">
            <Clock className="h-3 w-3" />
            <span>Schedule adjusted</span>
          </div>
        )}
        {isSelected && (
          <div className="text-blue-300 mt-1">• Selected for unavailability</div>
        )}
      </div>
      
      {/* Tooltip arrow */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
  );
};

export default function Calendar({
  schedule,
  config,
  onDateClick,
  selectedDates = [],
  currentMonth,
  onMonthChange,
  previewChanges = {},
  isPreviewMode = false,
  onRemoveUnavailability,
}: CalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ date: string; x: number; y: number } | null>(null);

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

  const days = [];
  let day = calendarStart;

  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

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

  const renderDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = getDayEntry(date);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isToday = isSameDay(date, today);
    const isPast = !isAfter(date, today) && !isToday;
    const isSelected = selectedDates.includes(dateStr);
    const hasPreviewChange = previewChanges[dateStr];
    const isHovered = hoveredDate === dateStr;
    
    if (!entry) return null;

    const displayPerson = hasPreviewChange || entry.assignedTo;
    const isAdjusted = entry.isAdjusted && !hasPreviewChange;
    const isUnavailable = entry.isUnavailable;
    const isClickable = isCurrentMonth && !isPast && onDateClick;

    // Different visual states
    let dayClasses = `
      relative min-h-[80px] border transition-all duration-200 cursor-pointer group
      ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
      ${isToday ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
      ${isSelected ? 'ring-2 ring-yellow-400 ring-opacity-70 shadow-lg scale-105' : ''}
      ${isClickable ? 'hover:shadow-md hover:scale-102' : 'cursor-not-allowed opacity-60'}
      ${isPast ? 'bg-gray-50' : ''}
      ${isHovered && !isPast && isCurrentMonth ? 'shadow-lg' : ''}
    `;

    // Background color based on assignment
    if (!isPast && isCurrentMonth) {
      if (hasPreviewChange) {
        dayClasses += ` ${getPersonColor(hasPreviewChange, false, true)} border-dashed border-2`;
      } else {
        dayClasses += ` ${getPersonColor(displayPerson, isAdjusted)}`;
      }
    }

    const personName = displayPerson === 'personA' ? config.personA.name : config.personB.name;
    const previewPersonName = hasPreviewChange ? (hasPreviewChange === 'personA' ? config.personA.name : config.personB.name) : null;

    return (
      <div
        key={dateStr}
        className={dayClasses.trim()}
        onClick={(e) => isClickable && onDateClick(dateStr, e)}
        onContextMenu={(e) => handleRightClick(e, dateStr, entry)}
        onMouseEnter={() => setHoveredDate(dateStr)}
        onMouseLeave={() => setHoveredDate(null)}
      >
        {/* Date number */}
        <div className="absolute top-2 left-2 text-sm font-medium">
          {format(date, 'd')}
        </div>

        {/* Quick actions - show on hover for future dates */}
        {isHovered && isCurrentMonth && !isPast && (
          <div className={`absolute flex space-x-1 ${isSelected ? 'top-1 left-1' : 'top-2 right-2'}`}>
            {isUnavailable && onRemoveUnavailability && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveUnavailability(dateStr);
                }}
                className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                title="Remove unavailability"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
        )}

        {/* Preview indicator */}
        {hasPreviewChange && (
          <div className="absolute top-1 right-1">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Clock className="h-3 w-3 text-white" />
            </div>
          </div>
        )}

        {/* Person indicator and status */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span className="font-medium truncate">
                {hasPreviewChange ? previewPersonName : personName}
              </span>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center space-x-1">
              {isAdjusted && !hasPreviewChange && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Schedule adjusted" />
              )}
              {isUnavailable && (
                <div className="flex items-center space-x-1">
                  <Ban className="h-3 w-3 text-red-500" />
                  {isHovered && isCurrentMonth && !isPast && (
                    <span className="text-xs text-red-600 font-medium">Unavailable</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover effect for clickable dates */}
        {isClickable && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 transition-opacity duration-200 rounded" />
        )}

        {/* Enhanced Tooltip */}
        {isCurrentMonth && !isPast && (
          <DateTooltip 
            entry={entry}
            date={dateStr}
            config={config}
            schedule={schedule}
            isSelected={isSelected}
          />
        )}
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

      {/* Legend */}
      <div className="border-t bg-gray-50 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
            <span className="text-gray-700">{config.personA.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
            <span className="text-gray-700">{config.personB.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Ban className="h-4 w-4 text-red-500" />
            <span className="text-gray-700">Unavailable</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-700">Adjusted</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Click dates to select • Hover unavailable dates for quick remove • Right-click for options
        </div>
      </div>
    </div>
  );
} 