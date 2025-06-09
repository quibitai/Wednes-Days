'use client';

import React from 'react';
import { X, Calendar, ArrowRight } from 'lucide-react';
import type { SchedulePreview, ScheduleChange, AppConfig } from '@/types';

interface CompareViewProps {
  preview: SchedulePreview;
  changes: ScheduleChange[];
  config: AppConfig;
  onClose: () => void;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
}

export default function CompareView({ 
  preview, 
  changes, 
  config, 
  onClose, 
  onAcceptAll, 
  onDiscardAll 
}: CompareViewProps) {
  const finalSchedule = {
    ...preview.current,
    ...preview.proposed,
    ...preview.manual
  };

  // Group changes by month for better organization
  const changesByMonth = changes.reduce((acc, change) => {
    const month = change.date.substring(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month].push(change);
    return acc;
  }, {} as Record<string, ScheduleChange[]>);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatMonth = (monthStr: string) => {
    return new Date(`${monthStr}-01`).toLocaleDateString('en-US', { 
      month: 'long',
      year: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Schedule Changes Preview
            </h2>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
              {changes.length} change{changes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Before Column */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Current Schedule
              </h3>
              <div className="space-y-4">
                {Object.entries(changesByMonth).map(([month, monthChanges]) => (
                  <div key={month} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {formatMonth(month)}
                    </h4>
                    <div className="space-y-2">
                      {monthChanges.map((change) => {
                        const currentEntry = preview.current[change.date];
                        return (
                          <div key={change.date} className="flex items-center justify-between py-2 px-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(change.date)}
                            </span>
                            <div className="font-medium" style={{ 
                              color: currentEntry?.assignedTo === 'personA' ? config.personA.color : config.personB.color 
                            }}>
                              {currentEntry?.assignedTo === 'personA' ? config.personA.name : config.personB.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* After Column */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Proposed Schedule
              </h3>
              <div className="space-y-4">
                {Object.entries(changesByMonth).map(([month, monthChanges]) => (
                  <div key={month} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {formatMonth(month)}
                    </h4>
                    <div className="space-y-2">
                      {monthChanges.map((change) => {
                        const finalEntry = finalSchedule[change.date];
                        const getReasonBadge = () => {
                          switch (change.reason) {
                            case 'unavailable':
                              return <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded">Unavailable</span>;
                            case 'manual':
                              return <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">Manual</span>;
                            case 'auto_balance':
                              return <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded">Auto</span>;
                          }
                        };

                        return (
                          <div key={change.date} className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(change.date)}
                              </span>
                              {getReasonBadge()}
                            </div>
                            <div className="font-medium" style={{ 
                              color: finalEntry?.assignedTo === 'personA' ? config.personA.color : config.personB.color 
                            }}>
                              {finalEntry?.assignedTo === 'personA' ? config.personA.name : config.personB.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Total Changes:</span>
                <div className="text-blue-900 dark:text-blue-100 font-semibold">{changes.length}</div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Unavailable:</span>
                <div className="text-blue-900 dark:text-blue-100 font-semibold">
                  {changes.filter(c => c.reason === 'unavailable').length}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Auto-balance:</span>
                <div className="text-blue-900 dark:text-blue-100 font-semibold">
                  {changes.filter(c => c.reason === 'auto_balance').length}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Manual:</span>
                <div className="text-blue-900 dark:text-blue-100 font-semibold">
                  {changes.filter(c => c.reason === 'manual').length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close Preview
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                onDiscardAll();
                onClose();
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Discard All
            </button>
            <button
              onClick={() => {
                onAcceptAll();
                onClose();
              }}
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium"
            >
              Accept All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 