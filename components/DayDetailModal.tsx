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

  useEffect(() => {
    setNote(entry?.note || '');
  }, [date, entry?.note]);
  
  const handleSave = () => {
    if (note !== (entry?.note || '')) {
      onSaveNote(date, note);
    }
    onClose();
  };

  const handleDelete = () => {
    onDeleteNote(date);
    onClose();
  };

  const dateObj = parseISO(date);
  const dayName = format(dateObj, 'EEEE');
  const formattedDate = format(dateObj, 'MMMM d, yyyy');
  
  const assignedPersonId = entry?.assignedTo;
  const assignedPerson = assignedPersonId ? config[assignedPersonId] : null;
  const otherPersonId = assignedPersonId === 'personA' ? 'personB' : 'personA';
  const otherPerson = config[otherPersonId];

  const isCurrentUserUnavailable = entry?.informationalUnavailability?.[currentUser];

  return (
    <div 
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col border-2 border-gray-300 dark:border-gray-600"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{dayName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="p-6 overflow-y-auto space-y-6"
          style={{
            backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff'
          }}
        >
          {entry && assignedPerson ? (
            <>
              {/* Assignment Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 block">Custody Assignment</label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">{assignedPerson.name}</span>
                  </div>
                  <button
                    onClick={() => onSwitchDay(date)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                  >
                    <ArrowRightLeft className="h-4 w-4 inline mr-2" />
                    Switch to {otherPerson.name}
                  </button>
                </div>
              </div>

              {/* Availability Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 block">Availability Status</label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isCurrentUserUnavailable ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {config[currentUser].name} is {isCurrentUserUnavailable ? 'unavailable' : 'available'}
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleInformationalUnavailability(date, currentUser)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                      isCurrentUserUnavailable
                        ? 'text-orange-800 dark:text-orange-200 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                        : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Mark as {isCurrentUserUnavailable ? 'Available' : 'Unavailable'}
                  </button>
                </div>
                {Object.entries(entry.informationalUnavailability || {}).map(([personId, isUnavailable]) => {
                  if (personId !== currentUser && isUnavailable) {
                    return (
                      <div key={personId} className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                        <div className="text-xs text-orange-700 dark:text-orange-300 flex items-center">
                          <Ban className="h-3 w-3 mr-1.5" />
                          <span>{config[personId as 'personA' | 'personB'].name} is also marked unavailable.</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Notes Section */}
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Notes</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note about this day..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                             placeholder-gray-500 dark:placeholder-gray-400
                             focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:border-gray-500 dark:focus:border-gray-400
                             transition-colors"
                  rows={4}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schedule entry for this date.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {entry && (
          <div 
            className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0"
            style={{
              backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#f9fafb'
            }}
          >
            <button
              onClick={handleDelete}
              disabled={!entry.note}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 inline mr-2" />
              Delete Note
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white rounded-lg transition-colors"
            >
              Save & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 