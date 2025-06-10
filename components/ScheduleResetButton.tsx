'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { StorageManager } from '@/lib/storage/storageManager';
import { ScheduleGenerator } from '@/lib/services/scheduleGenerator';
import type { AppConfig, CustodySchedule } from '@/types';

interface ScheduleResetButtonProps {
  config: AppConfig | null;
  onReset?: () => void;
}

export default function ScheduleResetButton({ config, onReset }: ScheduleResetButtonProps) {
  const [isResetting, setIsResetting] = React.useState(false);
  const [storageManager] = React.useState(new StorageManager());
  const [scheduleGenerator] = React.useState(new ScheduleGenerator());

  const resetToThreeDayRotation = async () => {
    if (!config) {
      alert('No configuration found. Please set up the app first.');
      return;
    }

    const confirmed = window.confirm(
      'This will reset the entire schedule to a 3-day rotation starting with Jane having custody yesterday. All existing schedule data and change history will be lost. Are you sure?'
    );

    if (!confirmed) return;

    setIsResetting(true);
    try {
      // Determine who Jane is
      let janeId: 'personA' | 'personB' | null = null;
      if (config.personA && config.personA.name === 'Jane') {
        janeId = 'personA';
      } else if (config.personB && config.personB.name === 'Jane') {
        janeId = 'personB';
      } else {
        alert(`Jane not found in configuration. Available names: ${config.personA?.name}, ${config.personB?.name}`);
        return;
      }

      console.log(`Jane is ${janeId}, resetting schedule...`);

      // Calculate dates starting from yesterday
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Generate a complete calendar year starting from yesterday
      const entries = scheduleGenerator.generateFullCalendarYear(yesterday, janeId);

      // Create new schedule
      const newSchedule: CustodySchedule = {
        entries: entries,
        startDate: yesterday.toISOString().split('T')[0],
        initialPerson: janeId,
        lastUpdated: new Date().toISOString()
      };

      // Save to storage
      await storageManager.saveSchedule(newSchedule);

      // Clear change history to start fresh
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('custody-change-history');
      }

      console.log('Schedule reset successfully!');
      console.log('Schedule starts:', yesterday.toISOString().split('T')[0], 'with', config[janeId].name);
      console.log('Full calendar year generated with 3-day rotation pattern');

      alert(`Schedule reset successfully! 3-day rotation starts with ${config[janeId].name} having custody yesterday.`);
      
      // Call the reset callback to refresh the parent component
      if (onReset) {
        onReset();
      }

    } catch (error) {
      console.error('Error resetting schedule:', error);
      alert('Failed to reset schedule. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <button
      onClick={resetToThreeDayRotation}
      disabled={isResetting}
      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 border border-red-200 dark:border-red-800 rounded-md transition-colors"
      title="Reset schedule to 3-day rotation with Jane starting yesterday"
    >
      <RotateCcw className="h-3 w-3 mr-1" />
      {isResetting ? 'Resetting...' : 'Reset to 3-Day Rotation'}
    </button>
  );
} 