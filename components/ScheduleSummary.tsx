import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import type { AppConfig, SchedulePreview, CustodySchedule } from '@/types';
import { ScheduleService } from '@/lib/services/scheduleService';

interface ScheduleSummaryProps {
  preview?: SchedulePreview;
  schedule?: CustodySchedule;
  config: AppConfig;
  currentMonth: Date;
}

export default function ScheduleSummary({ preview, schedule, config, currentMonth }: ScheduleSummaryProps) {
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const scheduleService = new ScheduleService();

  const getMonthStats = () => {
    // Use preview if available, otherwise use regular schedule
    const entries = preview ? 
      { ...preview.current, ...preview.proposed, ...preview.manual } : 
      schedule?.entries || {};

    // Filter entries for current month
    const monthStr = currentMonth.toISOString().slice(0, 7); // YYYY-MM format
    const monthEntries = Object.entries(entries).filter(([date]) => 
      date.startsWith(monthStr)
    );

    let personADays = 0;
    let personBDays = 0;

    monthEntries.forEach(([, entry]) => {
      if (entry?.assignedTo === 'personA') {
        personADays++;
      } else if (entry?.assignedTo === 'personB') {
        personBDays++;
      }
    });

    const totalDays = personADays + personBDays;
    const personAPercentage = totalDays > 0 ? (personADays / totalDays) * 100 : 0;
    const personBPercentage = totalDays > 0 ? (personBDays / totalDays) * 100 : 0;

    return {
      personADays,
      personBDays,
      totalDays,
      personAPercentage,
      personBPercentage
    };
  };

  const getAdvancedStats = () => {
    if (!schedule) return null;
    return scheduleService.getScheduleStats(schedule);
  };

  const stats = getMonthStats();
  const advancedStats = getAdvancedStats();

  if (stats.totalDays === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Distribution
      </h3>
      
      {/* Visual Graph */}
      <div className="flex rounded-lg overflow-hidden h-6 mb-3 border border-gray-200 dark:border-gray-700">
        {/* Person A section */}
        <div 
          className="h-full flex items-center justify-center text-xs font-medium"
          style={{ 
            width: `${stats.personAPercentage}%`,
            backgroundColor: config.personA.color,
            opacity: 0.2,
            minWidth: stats.personADays > 0 ? '20px' : '0',
            color: config.personA.color
          }}
        >
          {stats.personADays > 2 && stats.personADays}
        </div>
        
        {/* Person B section */}
        <div 
          className="h-full flex items-center justify-center text-xs font-medium"
          style={{ 
            width: `${stats.personBPercentage}%`,
            backgroundColor: config.personB.color,
            opacity: 0.2,
            minWidth: stats.personBDays > 0 ? '20px' : '0',
            color: config.personB.color
          }}
        >
          {stats.personBDays > 2 && stats.personBDays}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: config.personA.color, opacity: 0.2 }}
          />
          <span className="text-gray-700 dark:text-gray-300">
            {config.personA.name}: {stats.personADays} days ({Math.round(stats.personAPercentage)}%)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: config.personB.color, opacity: 0.2 }}
          />
          <span className="text-gray-700 dark:text-gray-300">
            {config.personB.name}: {stats.personBDays} days ({Math.round(stats.personBPercentage)}%)
          </span>
        </div>
      </div>

      {/* Target Summary */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Target: 3-4 nights per person • Total: {stats.totalDays} days
      </div>

      {/* More Stats Button */}
      {advancedStats && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowAdvancedStats(!showAdvancedStats)}
            className="w-full flex items-center justify-center space-x-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <BarChart3 className="h-3 w-3" />
            <span>More Stats</span>
            {showAdvancedStats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Advanced Statistics */}
          {showAdvancedStats && (
            <div className="mt-3 space-y-3 text-xs">
              {/* Year-to-Date Split */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Year-to-Date Split</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: config.personA.color }}>
                    {config.personA.name}: {advancedStats.yearToDateSplit.personA}%
                  </span>
                  <span style={{ color: config.personB.color }}>
                    {config.personB.name}: {advancedStats.yearToDateSplit.personB}%
                  </span>
                </div>
              </div>

              {/* Average Block Length */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-3 w-3 text-gray-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Average Block Length</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: config.personA.color }}>
                    {config.personA.name}: {advancedStats.averageBlockLength.personA} days
                  </span>
                  <span style={{ color: config.personB.color }}>
                    {config.personB.name}: {advancedStats.averageBlockLength.personB} days
                  </span>
                </div>
              </div>

              {/* Monthly Handoffs */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="h-3 w-3 text-gray-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Recent Monthly Handoffs</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {advancedStats.monthlyHandoffs.slice(-6).map((monthData, index) => (
                    <div key={index} className="text-center">
                      <div className="text-gray-500 dark:text-gray-400">{monthData.month}</div>
                      <div className="font-medium text-gray-700 dark:text-gray-300">{monthData.handoffs}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 