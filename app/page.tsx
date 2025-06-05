'use client';

import React, { useState, useEffect } from 'react';
import { addMonths } from 'date-fns';
import { Calendar as CalendarIcon, Plus, BarChart3, Database, X, User, AlertCircle, Info, Check, ChevronDown, Smartphone, TrendingUp, Clock, Users } from 'lucide-react';

import Calendar from '@/components/Calendar';
import SetupForm from '@/components/SetupForm';
import UnavailabilityForm from '@/components/UnavailabilityForm';
import DayDetailModal from '@/components/DayDetailModal';
import LoadingSkeleton from '@/components/LoadingSkeleton';

import { ScheduleService } from '@/lib/services/scheduleService';
import { StorageManager } from '@/lib/storage/storageManager';
import type { CustodySchedule, AppConfig } from '@/types';

const scheduleService = new ScheduleService();
const storageManager = new StorageManager();

export default function HomePage() {
  // App state
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [schedule, setSchedule] = useState<CustodySchedule | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // UI state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showUnavailabilityForm, setShowUnavailabilityForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingUnavailability, setIsSubmittingUnavailability] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ primary: string; fallback?: string; isConfigured: boolean } | null>(null);
  
  // Current user - for now we'll use personA as default, but this could be made dynamic
  const [currentUser] = useState<'personA' | 'personB'>('personA');
  
  // Help section state
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

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

  // Handle date click to open modal
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  // Handle unavailability submission
  const handleUnavailabilitySubmit = async (personId: 'personA' | 'personB', dates: string[]) => {
    setIsSubmittingUnavailability(true);
    
    try {
      const result = await scheduleService.markUnavailable(personId, dates);
      
      // Clear selected dates on success
      if (result.success) {
        setShowUnavailabilityForm(false);
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting unavailability:', error);
      return {
        success: false,
        message: 'Failed to submit unavailability request',
        handoffCount: 0,
      };
    } finally {
      setIsSubmittingUnavailability(false);
    }
  };

  // Handle day assignment switch
  const handleSwitchDay = async (date: string) => {
    try {
      setIsLoading(true);
      await storageManager.switchDayAssignment(date);
      // The subscription will automatically update the schedule
    } catch (error) {
      console.error('Error switching day assignment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle informational unavailability toggle
  const handleToggleInformationalUnavailability = async (date: string, personId: 'personA' | 'personB') => {
    try {
      setIsLoading(true);
      await storageManager.toggleInformationalUnavailability(date, personId);
      // The subscription will automatically update the schedule
    } catch (error) {
      console.error('Error toggling informational unavailability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle note save
  const handleSaveNote = async (date: string, note: string) => {
    try {
      setIsLoading(true);
      await storageManager.saveNote(date, note);
      // The subscription will automatically update the schedule
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle note delete
  const handleDeleteNote = async (date: string) => {
    try {
      setIsLoading(true);
      await storageManager.deleteNote(date);
      // The subscription will automatically update the schedule
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setIsLoading(false);
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
    }
  };

  const getScheduleStats = () => {
    if (!schedule) return null;
    return scheduleService.getScheduleStats(schedule, 30);
  };

  const getMonthlyStats = () => {
    if (!schedule || !config) return null;
    
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    let personADays = 0;
    let personBDays = 0;
    let totalDays = 0;
    
    let currentDate = new Date(monthStart);
    while (currentDate <= monthEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const entry = schedule.entries[dateStr];
      
      if (entry?.assignedTo) {
        totalDays++;
        if (entry.assignedTo === 'personA') {
          personADays++;
        } else if (entry.assignedTo === 'personB') {
          personBDays++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      personA: personADays,
      personB: personBDays,
      totalDays
    };
  };

  // Get the entry for the selected date
  const selectedEntry = selectedDate && schedule ? schedule.entries[selectedDate] : null;

  // Get stats for display
  const stats = getScheduleStats();
  const monthlyStats = getMonthlyStats();

  // If not initialized, show setup form
  if (isInitialized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <SetupForm onSetup={handleSetup} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  // Show loading skeleton while initializing
  if (!isInitialized || !schedule || !config) {
    return <LoadingSkeleton />;
  }

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
                  Wednes' Days
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Help Icon with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsHelpExpanded(!isHelpExpanded)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="How to use this app"
                >
                  <Info className="h-5 w-5" />
                </button>
                
                {isHelpExpanded && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsHelpExpanded(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border shadow-lg rounded-lg z-50 p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Quick Guide</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>• <strong>Click any day:</strong> Opens detailed options</div>
                        <div>• <strong>Switch button:</strong> Changes custody assignment</div>
                        <div>• <strong>Ban icon:</strong> Mark unavailable (informational)</div>
                        <div>• <strong>Note icon:</strong> Add personal reminders</div>
                        <div>• <strong>Split colors:</strong> Handoff days (custody changes)</div>
                        <div>• <strong>Info icon:</strong> Shows day details on hover</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Calendar */}
          <Calendar
            schedule={schedule}
            config={config}
            onDateClick={handleDateClick}
            selectedDates={[]}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onRemoveUnavailability={handleRemoveUnavailability}
            onMarkUnavailable={() => setShowUnavailabilityForm(true)}
            currentUser={currentUser}
            onSwitchDay={handleSwitchDay}
            onToggleInformationalUnavailability={handleToggleInformationalUnavailability}
          />

          {/* Monthly Distribution */}
          {monthlyStats && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {/* Monthly Distribution with Visual Charts */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-4">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Distribution
                </h4>
                
                {/* Single stacked progress bar */}
                <div className="space-y-3">
                  {/* Labels and counts */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700">{config.personA.name}</span>
                      <span className="text-gray-600">{monthlyStats.personA} days</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700">{config.personB.name}</span>
                      <span className="text-gray-600">{monthlyStats.personB} days</span>
                    </div>
                  </div>
                  
                  {/* Stacked progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-300" 
                        style={{ width: `${monthlyStats.totalDays > 0 ? (monthlyStats.personA / monthlyStats.totalDays) * 100 : 0}%` }}
                      ></div>
                      <div 
                        className="bg-orange-500 h-full transition-all duration-300" 
                        style={{ width: `${monthlyStats.totalDays > 0 ? (monthlyStats.personB / monthlyStats.totalDays) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Total days below the bar */}
                  <div className="text-center">
                    <span className="text-gray-500 text-sm">Total: {monthlyStats.totalDays} days</span>
                  </div>
                </div>
              </div>

              {/* Collapsible 30-Day Statistics */}
              {stats && (
                <div className="border-t pt-6">
                  <button
                    onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 transition-colors p-2 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-700">Next 30 Days Summary</span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                      isStatsExpanded ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  
                  {isStatsExpanded && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-blue-900">
                          {stats.totalHandoffs}
                        </div>
                        <div className="text-sm text-blue-600">Total Handoffs</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                          {stats.averagePeriodLength.toFixed(1)}
                        </div>
                        <div className="text-sm text-green-600">Avg Period Length</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <BarChart3 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                          {stats.periods.length}
                        </div>
                        <div className="text-sm text-purple-600">Custody Periods</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Day Detail Modal */}
      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          entry={selectedEntry}
          config={config}
          currentUser={currentUser}
          onClose={handleCloseModal}
          onSwitchDay={handleSwitchDay}
          onToggleInformationalUnavailability={handleToggleInformationalUnavailability}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {/* Unavailability Form Modal */}
      {showUnavailabilityForm && (
        <UnavailabilityForm
          config={config}
          selectedDates={[]}
          schedule={schedule}
          onClose={() => setShowUnavailabilityForm(false)}
          onSubmit={handleUnavailabilitySubmit}
          isSubmitting={isSubmittingUnavailability}
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