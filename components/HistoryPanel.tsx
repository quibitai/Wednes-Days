import React, { useState, useEffect } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { History, Clock, User, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { StorageManager } from '@/lib/storage/storageManager';
import type { ChangeHistoryEntry } from '@/types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [historyEntries, setHistoryEntries] = useState<ChangeHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const storageManager = new StorageManager();

  // Load change history when panel opens
  useEffect(() => {
    const loadHistory = async () => {
      if (!isOpen) return;

      setIsLoading(true);
      try {
        const history = await storageManager.loadChangeHistory();
        setHistoryEntries(history?.entries || []);
      } catch (error) {
        console.error('Error loading change history:', error);
        setHistoryEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [isOpen]);

  const getRelativeTime = (timestamp: string): string => {
    try {
      const date = parseISO(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  const getChangeTypeIcon = (description: string) => {
    if (description.includes('unavailable')) {
      return <Calendar className="h-4 w-4 text-red-500" />;
    }
    if (description.includes('manual') || description.includes('switch')) {
      return <User className="h-4 w-4 text-blue-500" />;
    }
    if (description.includes('rebalance') || description.includes('auto')) {
      return <Clock className="h-4 w-4 text-green-500" />;
    }
    return <History className="h-4 w-4 text-gray-500" />;
  };

  const getChangeTypeColor = (description: string): string => {
    if (description.includes('unavailable')) {
      return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
    }
    if (description.includes('manual') || description.includes('switch')) {
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
    if (description.includes('rebalance') || description.includes('auto')) {
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
    }
    return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Change History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No History Available
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Schedule changes will appear here as you make them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show first 5 entries by default, expand to show all */}
              {(isExpanded ? historyEntries : historyEntries.slice(0, 5)).map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className={`border-l-4 pl-4 py-3 rounded-r-lg ${getChangeTypeColor(entry.description)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getChangeTypeIcon(entry.description)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {entry.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getRelativeTime(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Expand/Collapse Button */}
              {historyEntries.length > 5 && (
                <div className="text-center pt-3">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    <span>
                      {isExpanded 
                        ? `Show Less (${historyEntries.length - 5} hidden)` 
                        : `Show All ${historyEntries.length} Changes`
                      }
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            History shows recent schedule modifications and system changes
          </p>
        </div>
      </div>
    </div>
  );
} 