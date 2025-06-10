'use client';

import React, { useState } from 'react';
import { X, Save, User, RotateCcw } from 'lucide-react';
import { StorageManager } from '@/lib/storage/storageManager';
import { ScheduleGenerator } from '@/lib/services/scheduleGenerator';
import type { AppConfig, CustodySchedule } from '@/types';

interface ConfigurationPanelProps {
  config: AppConfig | null;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  onScheduleReset?: () => void;
}

export default function ConfigurationPanel({ config, onSave, onClose, onScheduleReset }: ConfigurationPanelProps) {
  const [formData, setFormData] = useState({
    personAName: config?.personA.name || 'Person A',
    personBName: config?.personB.name || 'Person B',
    personAColor: config?.personA.color || '#3B82F6',
    personBColor: config?.personB.color || '#EF4444',
    maxConsecutiveDays: config?.maxConsecutiveDays || 7,
    defaultRotationDays: config?.defaultRotationDays || 3,
    startDate: config?.startDate || new Date().toISOString().split('T')[0],
    initialPerson: config?.initialPerson || 'personA' as 'personA' | 'personB',
  });

  const [isResetting, setIsResetting] = useState(false);
  const [storageManager] = useState(new StorageManager());
  const [scheduleGenerator] = useState(new ScheduleGenerator());

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

      console.log('Schedule reset successfully with full calendar year generation');
      alert(`Schedule reset successfully! 3-day rotation starts with ${config[janeId].name} having custody yesterday.`);
      
      // Call the reset callback to refresh the parent component
      if (onScheduleReset) {
        onScheduleReset();
      }

      // Close the settings panel
      onClose();

    } catch (error) {
      console.error('Error resetting schedule:', error);
      alert('Failed to reset schedule. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newConfig: AppConfig = {
      personA: {
        id: 'personA',
        name: formData.personAName.trim(),
        color: formData.personAColor,
      },
      personB: {
        id: 'personB',
        name: formData.personBName.trim(),
        color: formData.personBColor,
      },
      maxConsecutiveDays: formData.maxConsecutiveDays,
      defaultRotationDays: formData.defaultRotationDays,
      startDate: formData.startDate,
      initialPerson: formData.initialPerson,
    };

    onSave(newConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Person A */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 inline mr-2" />
              Person A
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={formData.personAName}
                onChange={(e) => setFormData({ ...formData, personAName: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Name"
                required
              />
              <input
                type="color"
                value={formData.personAColor}
                onChange={(e) => setFormData({ ...formData, personAColor: e.target.value })}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
          </div>

          {/* Person B */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 inline mr-2" />
              Person B
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={formData.personBName}
                onChange={(e) => setFormData({ ...formData, personBName: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Name"
                required
              />
              <input
                type="color"
                value={formData.personBColor}
                onChange={(e) => setFormData({ ...formData, personBColor: e.target.value })}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The date when the custody schedule should begin
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Who Starts with Custody
              </label>
              <select
                value={formData.initialPerson}
                onChange={(e) => setFormData({ ...formData, initialPerson: e.target.value as 'personA' | 'personB' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="personA">{formData.personAName}</option>
                <option value="personB">{formData.personBName}</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Who should have custody on the start date
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Rotation Days
              </label>
              <input
                type="number"
                min="1"
                max="14"
                value={formData.defaultRotationDays}
                onChange={(e) => setFormData({ ...formData, defaultRotationDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Consecutive Days
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.maxConsecutiveDays}
                onChange={(e) => setFormData({ ...formData, maxConsecutiveDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Reset Schedule Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Schedule Management
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Note:</strong> If you don't have a schedule yet, saving this configuration will generate a new schedule using your selected start date and initial person.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Reset the entire schedule to a 3-day rotation starting with Jane having custody yesterday.
            </p>
            <button
              type="button"
              onClick={resetToThreeDayRotation}
              disabled={isResetting}
              className="w-full px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 border border-red-200 dark:border-red-800 rounded-md transition-colors"
            >
              <RotateCcw className="h-4 w-4 inline mr-2" />
              {isResetting ? 'Resetting...' : 'Reset to 3-Day Rotation'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              <Save className="h-4 w-4 inline mr-2" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 