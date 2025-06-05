'use client';

import React, { useState, useEffect } from 'react';
import { addMonths } from 'date-fns';
import { Calendar as CalendarIcon, Plus, BarChart3, Database, X } from 'lucide-react';

import Calendar from '@/components/Calendar';
import SetupForm from '@/components/SetupForm';
import UnavailabilityForm from '@/components/UnavailabilityForm';

import { ScheduleService } from '@/lib/services/scheduleService';
import type { CustodySchedule, AppConfig, UnavailabilityRequest } from '@/types';

const scheduleService = new ScheduleService();

export default function HomePage() {
  // App state
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [schedule, setSchedule] = useState<CustodySchedule | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // UI state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showUnavailabilityForm, setShowUnavailabilityForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingUnavailability, setIsSubmittingUnavailability] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ primary: string; fallback?: string; isConfigured: boolean } | null>(null);

  // Check if app is initialized and set up subscriptions
  useEffect(() => {
    let scheduleUnsubscribe: (() => void) | null = null;
    let configUnsubscribe: (() => void) | null = null;

    const checkInitialization = async () => {
      try {
        setStorageInfo(scheduleService.getStorageInfo());
        
        const initialized = await scheduleService.isInitialized();
        setIsInitialized(initialized);

        if (initialized) {
          // Set up real-time subscriptions
          scheduleUnsubscribe = scheduleService.subscribeToSchedule((newSchedule) => {
            setSchedule(newSchedule);
          });

          configUnsubscribe = scheduleService.subscribeToConfig((newConfig) => {
            setConfig(newConfig);
          });
        }
      } catch (error) {
        console.error('Error checking initialization:', error);
        setIsInitialized(false);
      }
    };

    checkInitialization();

    // Cleanup subscriptions on unmount
    return () => {
      if (scheduleUnsubscribe) scheduleUnsubscribe();
      if (configUnsubscribe) configUnsubscribe();
    };
  }, [isInitialized]);

  // Handle initial setup
  const handleSetup = async (setupConfig: {
    personAName: string;
    personBName: string;
    startDate: string;
    initialPerson: 'personA' | 'personB';
  }) => {
    setIsLoading(true);
    try {
      await scheduleService.initializeApp(setupConfig);
      setIsInitialized(true);
      setStorageInfo(scheduleService.getStorageInfo());
    } catch (error) {
      console.error('Error initializing app:', error);
      alert('Failed to initialize the application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date selection for unavailability
  const handleDateClick = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(prev => prev.filter(d => d !== date));
    } else {
      setSelectedDates(prev => [...prev, date].sort());
    }
  };

  // Clear selected dates
  const handleClearSelection = () => {
    setSelectedDates([]);
  };

  // Handle unavailability submission
  const handleUnavailabilitySubmit = async (
    personId: 'personA' | 'personB',
    dates: string[]
  ) => {
    setIsSubmittingUnavailability(true);
    try {
      const request: UnavailabilityRequest = {
        personId,
        dates,
      };

      const result = await scheduleService.markUnavailable(request);
      
      // Clear selected dates on success
      if (result.success) {
        setSelectedDates([]);
        setShowUnavailabilityForm(false);
      }

      return result;
    } catch (error) {
      console.error('Error marking unavailable:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request',
      };
    } finally {
      setIsSubmittingUnavailability(false);
    }
  };

  // Handle removing unavailability
  const handleRemoveUnavailability = async (date: string) => {
    if (!schedule) return;
    
    try {
      const entry = schedule.entries[date];
      if (!entry?.isUnavailable || !entry.unavailableBy) return;

      // Create a request to "re-mark" as available by creating a dummy request
      // and then clearing the unavailable flag directly through the service
      const result = await scheduleService.removeUnavailability(date);
      
      if (!result.success) {
        alert(result.message || 'Failed to remove unavailability');
      }
    } catch (error) {
      console.error('Error removing unavailability:', error);
      alert('An error occurred while removing unavailability');
    }
  };

  // Get schedule statistics
  const getScheduleStats = () => {
    if (!schedule) return null;
    return scheduleService.getScheduleStats(schedule, 30);
  };

  // Show setup form if not initialized
  if (isInitialized === false) {
    return (
      <div>
        <SetupForm onSetup={handleSetup} isLoading={isLoading} />
        {/* Debug info */}
        {storageInfo && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs flex items-center space-x-2">
            <Database className="h-3 w-3" />
            <span>Using: {storageInfo.primary} (Configured: {storageInfo.isConfigured ? 'Yes' : 'No'})</span>
          </div>
        )}
      </div>
    );
  }

  // Show loading state while checking initialization
  if (isInitialized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          {storageInfo && (
            <p className="text-xs text-gray-500 mt-2">Storage: {storageInfo.primary} (Configured: {storageInfo.isConfigured ? 'Yes' : 'No'})</p>
          )}
        </div>
      </div>
    );
  }

  const stats = getScheduleStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Dog Custody Scheduler
                </h1>
                {config && (
                  <p className="text-sm text-gray-500">
                    {config.personA.name} & {config.personB.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Stats */}
              {stats && (
                <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>{stats.totalHandoffs} handoffs</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Next 30 days
                  </div>
                </div>
              )}

              {/* Selection indicator */}
              {selectedDates.length > 0 && (
                <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-2 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    {selectedDates.length} selected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Instructions */}
          {selectedDates.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">How to mark unavailable dates:</div>
                  <div className="text-blue-700">
                    Click on future dates to select them, then click "Mark as Unavailable"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected dates info */}
          {selectedDates.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    <span className="font-medium">
                      {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="text-xs text-yellow-700 mt-1">
                      Click calendar dates to add/remove • Click "Preview Changes" to see the impact
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowUnavailabilityForm(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                  >
                    Mark as Unavailable
                  </button>
                  <button
                    onClick={handleClearSelection}
                    className="text-yellow-600 hover:text-yellow-800 text-sm font-medium px-3 py-2 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              {/* Show selected dates */}
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <div className="text-xs text-yellow-700 mb-2">Selected dates:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map(date => (
                    <button
                      key={date}
                      onClick={() => handleDateClick(date)}
                      className="inline-flex items-center px-2 py-1 bg-yellow-200 text-yellow-800 rounded-md text-xs hover:bg-yellow-300 transition-colors"
                      title="Click to remove"
                    >
                      {new Date(date).toLocaleDateString()}
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Calendar */}
          <Calendar
            schedule={schedule}
            config={config}
            onDateClick={handleDateClick}
            selectedDates={selectedDates}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onRemoveUnavailability={handleRemoveUnavailability}
          />

          {/* Stats Panel */}
          {stats && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Schedule Statistics (Next 30 Days)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalHandoffs}
                  </div>
                  <div className="text-sm text-gray-500">Total Handoffs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.averagePeriodLength.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">Avg Period Length</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.periods.length}
                  </div>
                  <div className="text-sm text-gray-500">Custody Periods</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Unavailability Form Modal */}
      {showUnavailabilityForm && (
        <UnavailabilityForm
          config={config}
          selectedDates={selectedDates}
          schedule={schedule}
          onClose={() => setShowUnavailabilityForm(false)}
          onSubmit={handleUnavailabilitySubmit}
          isSubmitting={isSubmittingUnavailability}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Debug info */}
      {storageInfo && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs flex items-center space-x-2">
          <Database className="h-3 w-3" />
          <span>Using: {storageInfo.primary} (Configured: {storageInfo.isConfigured ? 'Yes' : 'No'})</span>
        </div>
      )}
    </div>
  );
} 