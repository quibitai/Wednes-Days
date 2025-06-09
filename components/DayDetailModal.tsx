'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Save, Trash2, User } from 'lucide-react';
import type { ScheduleEntry, AppConfig, Note } from '@/types';

interface DayDetailModalProps {
  date: string;
  entry: ScheduleEntry | null;
  config: AppConfig;
  onClose: () => void;
  onSaveNote: (date: string, noteContent: string) => void;
  onDeleteNote: (date: string) => void;
  currentUser: 'personA' | 'personB';
}

export default function DayDetailModal({
  date,
  entry,
  config,
  onClose,
  onSaveNote,
  onDeleteNote,
}: DayDetailModalProps) {
  const [noteContent, setNoteContent] = useState(entry?.note?.content || '');

  useEffect(() => {
    setNoteContent(entry?.note?.content || '');
  }, [date, entry?.note]);

  const handleSave = () => {
    onSaveNote(date, noteContent);
    onClose();
  };

  const handleDelete = () => {
    onDeleteNote(date);
    onClose();
  };

  const dateObj = parseISO(date);
  const formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');
  const noteTimestamp = entry?.note?.timestamp ? format(parseISO(entry.note.timestamp), 'MMM d, h:mm a') : '';

  return (
    <div 
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{formattedDate}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">NOTE</h3>
          {entry?.note?.authorName && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2 mb-3">
              <User className="h-3 w-3" />
              <span>Last edited by <strong>{entry.note.authorName}</strong> on {noteTimestamp}</span>
            </div>
          )}
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a shared note for this day..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            rows={6}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleDelete}
            disabled={!entry?.note?.content}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 inline mr-1" />
            Delete
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <Save className="h-4 w-4 inline mr-1" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 