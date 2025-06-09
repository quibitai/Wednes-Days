'use client';

import React from 'react';
import { Check, X, Calendar, ArrowRight, AlertTriangle, Eye } from 'lucide-react';
import type { SchedulePreview, ScheduleChange, AppConfig } from '@/types';

interface ChangesPanelProps {
  preview: SchedulePreview;
  changes: ScheduleChange[];
  config: AppConfig;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
  onShowCompare: () => void;
  isProcessing?: boolean;
}

export default function ChangesPanel({ 
  preview, 
  changes, 
  config, 
  onAcceptAll, 
  onDiscardAll, 
  onShowCompare,
  isProcessing = false 
}: ChangesPanelProps) {
  if (!preview.hasUnsavedChanges || changes.length === 0) {
    return null;
  }

  const unavailableCount = Object.keys(preview.unavailable).length;
  const changesCount = changes.length;

  const getReasonIcon = (reason: ScheduleChange['reason']) => {
    switch (reason) {
      case 'unavailable':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'manual':
        return <ArrowRight className="h-3 w-3 text-blue-500" />;
      case 'auto_balance':
        return <Calendar className="h-3 w-3 text-green-500" />;
    }
  };

  const getReasonText = (reason: ScheduleChange['reason']) => {
    switch (reason) {
      case 'unavailable':
        return 'Unavailable';
      case 'manual':
        return 'Manual';
      case 'auto_balance':
        return 'Auto-balance';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-200 dark:border-amber-700 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              Pending Changes
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-amber-700 dark:text-amber-300">
            <span>{changesCount} day{changesCount !== 1 ? 's' : ''} affected</span>
            {unavailableCount > 0 && (
              <span className="px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded-full text-xs">
                {unavailableCount} unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div className="p-4">
        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
          {changes.slice(0, 8).map((change) => (
            <div key={change.date} className="flex items-center justify-between text-sm py-1">
              <div className="flex items-center space-x-2">
                {getReasonIcon(change.reason)}
                <span className="text-gray-600 dark:text-gray-300">
                  {new Date(change.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}:
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium" style={{ 
                  color: change.fromPerson === 'personA' ? config.personA.color : config.personB.color 
                }}>
                  {config[change.fromPerson].name}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <span className="font-medium" style={{ 
                  color: change.toPerson === 'personA' ? config.personA.color : config.personB.color 
                }}>
                  {config[change.toPerson].name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({getReasonText(change.reason)})
                </span>
              </div>
            </div>
          ))}
          {changes.length > 8 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
              +{changes.length - 8} more changes
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onShowCompare}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Eye className="h-4 w-4 mr-1" />
            Compare View
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onDiscardAll}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 rounded-md transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Discard All
            </button>
            <button
              onClick={onAcceptAll}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md transition-colors"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 