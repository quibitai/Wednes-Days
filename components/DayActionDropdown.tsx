'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowRightLeft, EyeOff, Eye } from 'lucide-react';
import type { AppConfig, ScheduleEntry } from '@/types';

interface DayActionDropdownProps {
  date: string;
  entry: ScheduleEntry | null;
  config: AppConfig;
  currentUser: 'personA' | 'personB'; // Which user is performing the action
  position: { x: number; y: number };
  onClose: () => void;
  onSwitchDay: (date: string) => void;
  onToggleInformationalUnavailability: (date: string, personId: 'personA' | 'personB') => void;
}

export default function DayActionDropdown({
  date,
  entry,
  config,
  currentUser,
  position,
  onClose,
  onSwitchDay,
  onToggleInformationalUnavailability,
}: DayActionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Position dropdown to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 120),
  };

  const otherPersonId = currentUser === 'personA' ? 'personB' : 'personA';
  const otherPersonName = config[otherPersonId].name;
  const currentUserName = config[currentUser].name;
  
  // Determine who to switch to based on current assignment
  const currentlyAssignedTo = entry?.assignedTo;
  const switchToPersonId = currentlyAssignedTo === 'personA' ? 'personB' : 'personA';
  const switchToPersonName = config[switchToPersonId].name;
  
  const isCurrentUserMarkedUnavailable = entry?.informationalUnavailability?.[currentUser];
  const assignedPersonName = entry ? config[entry.assignedTo].name : 'Unassigned';

  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dateObj.setHours(0, 0, 0, 0);
  const isPastDate = dateObj < today;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Date header */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900">
          {dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
        <div className="text-xs text-gray-500">
          Assigned to: {assignedPersonName}
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        {/* Switch assignment option */}
        {!isPastDate && (
          <button
            onClick={() => {
              onSwitchDay(date);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
          >
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            <span>Switch to {switchToPersonName}</span>
          </button>
        )}

        {/* Informational unavailability toggle */}
        <button
          onClick={() => {
            onToggleInformationalUnavailability(date, currentUser);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
        >
          {isCurrentUserMarkedUnavailable ? (
            <>
              <Eye className="h-4 w-4 text-green-600" />
              <span>Mark {currentUserName} as Available</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 text-amber-600" />
              <span>Mark {currentUserName} as Unavailable</span>
            </>
          )}
        </button>
      </div>

      {/* Helper text */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {isPastDate 
            ? "Past dates: Unavailability only" 
            : "Switch: Changes schedule • Unavailable: Info only"
          }
        </div>
      </div>
    </div>
  );
} 