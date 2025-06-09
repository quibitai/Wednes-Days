import React from 'react';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';
import { ArrowRightLeft, Calendar, Clock, User, StickyNote } from 'lucide-react';
import type { CustodySchedule, AppConfig } from '@/types';

interface HandoffListProps {
  schedule: CustodySchedule;
  config: AppConfig;
  onDayDetailClick?: (date: string) => void;
}

interface HandoffEvent {
  date: string;
  fromPerson: 'personA' | 'personB';
  toPerson: 'personA' | 'personB';
  isToday: boolean;
  isPast: boolean;
  daysFromNow: number;
}

export default function HandoffList({ schedule, config, onDayDetailClick }: HandoffListProps) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Function to identify handoffs (similar to Calendar.tsx logic)
  const getHandoffEvents = (): HandoffEvent[] => {
    const handoffs: HandoffEvent[] = [];
    const sortedDates = Object.keys(schedule.entries).sort();
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const previousDate = sortedDates[i - 1];
      
      const currentEntry = schedule.entries[currentDate];
      const previousEntry = schedule.entries[previousDate];
      
      if (currentEntry && previousEntry && 
          currentEntry.assignedTo !== previousEntry.assignedTo) {
        
        const dateObj = parseISO(currentDate);
        const isToday = isSameDay(dateObj, today);
        const isPast = !isAfter(dateObj, today) && !isToday;
        const daysFromNow = Math.ceil((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        handoffs.push({
          date: currentDate,
          fromPerson: previousEntry.assignedTo,
          toPerson: currentEntry.assignedTo,
          isToday,
          isPast,
          daysFromNow,
        });
      }
    }
    
    return handoffs;
  };

  const handoffEvents = getHandoffEvents();
  
  // Filter to show upcoming handoffs (including today) and recent past handoffs
  const relevantHandoffs = handoffEvents.filter(handoff => 
    handoff.daysFromNow >= -7 && handoff.daysFromNow <= 30
  );

  const getTimeDescription = (handoff: HandoffEvent): string => {
    if (handoff.isToday) return 'Today';
    if (handoff.daysFromNow === 1) return 'Tomorrow';
    if (handoff.daysFromNow === -1) return 'Yesterday';
    if (handoff.daysFromNow > 0) return `In ${handoff.daysFromNow} days`;
    if (handoff.daysFromNow < 0) return `${Math.abs(handoff.daysFromNow)} days ago`;
    return '';
  };

  const getTimeColor = (handoff: HandoffEvent): string => {
    if (handoff.isToday) return 'text-blue-600 dark:text-blue-400';
    if (handoff.daysFromNow > 0 && handoff.daysFromNow <= 3) return 'text-orange-600 dark:text-orange-400';
    if (handoff.daysFromNow > 0) return 'text-gray-600 dark:text-gray-400';
    return 'text-gray-500 dark:text-gray-500';
  };

  if (relevantHandoffs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <ArrowRightLeft className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Upcoming Handoffs
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No custody exchanges scheduled in the next 30 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <ArrowRightLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Custody Handoffs
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upcoming and recent custody exchanges
        </p>
      </div>

      {/* Handoff List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {relevantHandoffs.map((handoff, index) => {
          const dayEntry = schedule.entries[handoff.date];
          const hasNote = !!dayEntry?.note;
          
          return (
            <div 
              key={`${handoff.date}-${index}`} 
              className={`px-6 py-4 transition-colors ${
                onDayDetailClick 
                  ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => onDayDetailClick?.(handoff.date)}
            >
              <div className="flex items-center justify-between">
                {/* Date and Time Info */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      handoff.isToday 
                        ? 'bg-blue-100 dark:bg-blue-900/30' 
                        : handoff.isPast 
                        ? 'bg-gray-100 dark:bg-gray-800' 
                        : 'bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                      <Calendar className={`h-5 w-5 ${
                        handoff.isToday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : handoff.isPast 
                          ? 'text-gray-500 dark:text-gray-400' 
                          : 'text-orange-600 dark:text-orange-400'
                      }`} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {format(parseISO(handoff.date), 'EEEE, MMMM d')}
                      </span>
                      <span className={`text-sm font-medium ${getTimeColor(handoff)}`}>
                        {getTimeDescription(handoff)}
                      </span>
                      {/* Note indicator */}
                      {hasNote && (
                        <StickyNote className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(parseISO(handoff.date), 'yyyy')}
                      {hasNote && (
                        <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                          • Has note
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Handoff Direction */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-sm font-medium" style={{ color: config[handoff.fromPerson].color }}>
                        {config[handoff.fromPerson].name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">From</div>
                    </div>
                    
                    <ArrowRightLeft className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    
                    <div className="text-left">
                      <div className="text-sm font-medium" style={{ color: config[handoff.toPerson].color }}>
                        {config[handoff.toPerson].name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">To</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Showing handoffs from 7 days ago to 30 days ahead • {relevantHandoffs.length} total
        </p>
      </div>
    </div>
  );
} 