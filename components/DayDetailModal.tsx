'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { X, ArrowRightLeft, Ban, User, Calendar, Save, Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { ScheduleEntry, AppConfig } from '@/types';

interface DayDetailModalProps {
  date: string;
  entry: ScheduleEntry | null;
  config: AppConfig;
  currentUser: 'personA' | 'personB';
  onClose: () => void;
  onSwitchDay: (date: string) => void;
  onToggleInformationalUnavailability: (date: string, personId: 'personA' | 'personB') => void;
  onSaveNote: (date: string, note: string) => void;
  onDeleteNote: (date: string) => void;
}

export default function DayDetailModal({
  date,
  entry,
  config,
  currentUser,
  onClose,
  onSwitchDay,
  onToggleInformationalUnavailability,
  onSaveNote,
  onDeleteNote,
}: DayDetailModalProps) {
  const [note, setNote] = useState(entry?.note || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setNote(entry?.note || '');
    setHasUnsavedChanges(false);
  }, [entry?.note]);

  const handleNoteChange = (value: string) => {
    setNote(value);
    setHasUnsavedChanges(value !== (entry?.note || ''));
  };

  const handleSaveNote = () => {
    if (note.trim()) {
      onSaveNote(date, note.trim());
    } else {
      onDeleteNote(date);
    }
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleDeleteNote = () => {
    setNote('');
    onDeleteNote(date);
    setHasUnsavedChanges(false);
  };

  const dateObj = parseISO(date);
  const dayName = format(dateObj, 'EEEE');
  const formattedDate = format(dateObj, 'MMMM d, yyyy');
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  
  const assignedPerson = entry?.assignedTo === 'personA' ? config.personA : config.personB;
  const otherPerson = entry?.assignedTo === 'personA' ? config.personB : config.personA;
  const isCurrentlyAdjusted = entry?.originalAssignedTo && entry.assignedTo !== entry.originalAssignedTo;
  const isCurrentUserUnavailable = entry?.informationalUnavailability?.[currentUser];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{dayName}</h2>
              <p className="text-sm text-gray-500">
                {formattedDate}
                {isWeekend && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Weekend</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {entry ? (
            <div className="space-y-6">
              {/* Assignment Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Image
                    src="/dog-iconB.png"
                    alt="Dog"
                    width={16}
                    height={16}
                    className="object-contain mr-2"
                  />
                  Custody Assignment
                </h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      entry.assignedTo === 'personA' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{assignedPerson.name}</div>
                      {isCurrentlyAdjusted && (
                        <div className="text-xs text-blue-600">Switched from {config[entry.originalAssignedTo!].name}</div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onSwitchDay(date)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isCurrentlyAdjusted
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="text-sm">Switch to {otherPerson.name}</span>
                  </button>
                </div>
              </div>

              {/* Availability Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Availability Status
                </h3>
                
                <div className="space-y-3">
                  {/* Current user unavailability */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Ban className={`h-4 w-4 ${isCurrentUserUnavailable ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-700">
                        {config[currentUser].name} unavailable (info only)
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleInformationalUnavailability(date, currentUser)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        isCurrentUserUnavailable
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isCurrentUserUnavailable ? 'Remove' : 'Mark Unavailable'}
                    </button>
                  </div>

                  {/* Other person unavailability (read-only) */}
                  {entry.informationalUnavailability && (
                    <div className="text-sm text-gray-600">
                      {Object.entries(entry.informationalUnavailability).map(([personId, isUnavailable]) => {
                        if (personId !== currentUser && isUnavailable) {
                          return (
                            <div key={personId} className="flex items-center space-x-2">
                              <Ban className="h-4 w-4 text-amber-600" />
                              <span>{config[personId as 'personA' | 'personB'].name} marked unavailable</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Notes
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={note}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="Add a note for this day..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  
                  {hasUnsavedChanges && (
                    <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      You have unsaved changes
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <button
                      onClick={handleDeleteNote}
                      disabled={!entry.note}
                      className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-sm">Delete Note</span>
                    </button>
                    
                    <button
                      onClick={handleSaveNote}
                      disabled={!hasUnsavedChanges}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      <span className="text-sm">Save Note</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No schedule entry for this date
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 