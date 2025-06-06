'use client';

import React, { useState, useEffect } from 'react';
import { addMonths, format } from 'date-fns';
import { Plus, BarChart3, Database, X, User, AlertCircle, Info, Check, ChevronDown, Smartphone, TrendingUp, Clock, Users, ArrowRightLeft, Ban, StickyNote, Moon, Sun } from 'lucide-react';
import Image from 'next/image';

import Calendar from '@/components/Calendar';
import DayDetailModal from '@/components/DayDetailModal';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AIInterface from '@/components/AIInterface';
import TimeZoneSelector from '@/components/TimeZoneSelector';

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ primary: string; fallback?: string; isConfigured: boolean } | null>(null);
  
  // Current user - for now we'll use personA as default, but this could be made dynamic
  const [currentUser] = useState<'personA' | 'personB'>('personA');
  
  // Help section state
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Dark mode effect
  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    
    // Apply dark mode class to document
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Check if app is initialized and set up subscriptions
  useEffect(() => {
    let scheduleUnsubscribe: (() => void) | null = null;
    let configUnsubscribe: (() => void) | null = null;

    const checkInitialization = async () => {
      try {
        setStorageInfo(scheduleService.getStorageInfo());
        
        const initialized = await scheduleService.isInitialized();
        
        // If not initialized, auto-initialize with Jane and Adam
        if (!initialized) {
          console.log('Auto-initializing app with Jane and Adam...');
          // Fixed start date to ensure consistent schedule for all visitors
          const startDate = '2025-06-05'; // Adam starts Wednesday, June 5th
          
          await scheduleService.initializeApp({
            personAName: 'Adam',
            personBName: 'Jane', 
            startDate: startDate,
            initialPerson: 'personA' // Adam starts first
          });
          
          console.log('App auto-initialized successfully with Adam starting June 5th');
        }
        
        setIsInitialized(true);

        // Set up real-time subscriptions
        scheduleUnsubscribe = scheduleService.subscribeToSchedule((newSchedule) => {
          setSchedule(newSchedule);
        });

        configUnsubscribe = scheduleService.subscribeToConfig((newConfig) => {
          setConfig(newConfig);
        });
        
      } catch (error) {
        console.error('Error during initialization:', error);
        // Still set initialized to true so we show the UI, but with error state
        setIsInitialized(true);
      }
    };

    checkInitialization();

    // Cleanup subscriptions on unmount
    return () => {
      if (scheduleUnsubscribe) scheduleUnsubscribe();
      if (configUnsubscribe) configUnsubscribe();
    };
  }, []);

  // Handle initial setup (keeping for future use but not currently used)
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

  // Handle time zone change
  const handleTimeZoneChange = (newTimeZone: string) => {
    console.log('Time zone changed to:', newTimeZone);
    // The schedule will automatically refresh due to date formatting changes
    // No need to reload data since dates are stored in UTC
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

  // Show loading skeleton while initializing
  if (!isInitialized || !schedule || !config) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/dog-icon.png"
                alt="Wednes' Days"
                width={48}
                height={48}
                className="object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Wednes' Days
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Time Zone Selector */}
              <TimeZoneSelector compact onTimeZoneChange={handleTimeZoneChange} />

              {/* Help Icon with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsHelpExpanded(!isHelpExpanded)}
                  className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
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
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg rounded-lg z-50 p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Guide</h3>
                      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                          <ArrowRightLeft className="h-4 w-4 mr-3 text-blue-600 dark:text-blue-400" />
                          <span>Changes custody assignment</span>
                        </div>
                        <div className="flex items-center">
                          <Ban className="h-4 w-4 mr-3 text-red-600 dark:text-red-400" />
                          <span>Mark unavailable (informational)</span>
                        </div>
                        <div className="flex items-center">
                          <StickyNote className="h-4 w-4 mr-3 text-yellow-600 dark:text-yellow-400" />
                          <span>Add or view notes</span>
                        </div>
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
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onRemoveUnavailability={handleRemoveUnavailability}
            currentUser={currentUser}
            onSwitchDay={handleSwitchDay}
            onToggleInformationalUnavailability={handleToggleInformationalUnavailability}
          />

          {/* AI Interface for Testing */}
          {schedule && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🤖 AI Schedule Assistant (Testing)</h2>
              <AIInterface 
                userId={currentUser} 
                currentSchedule={schedule.entries || {}} 
              />
            </div>
          )}

          {/* Monthly Distribution */}
          {monthlyStats && (
            <div className="py-4">
              {/* Monthly Distribution with Visual Charts */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-300 mb-4">
                  {format(currentMonth, 'MMMM yyyy')} Distribution
                </h4>
                
                {/* Single stacked progress bar */}
                <div className="space-y-2">
                  {/* Labels and counts */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-300">{config.personA.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{monthlyStats.personA} days</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-300">{config.personB.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{monthlyStats.personB} days</span>
                    </div>
                  </div>
                  
                  {/* Stacked progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="h-full transition-all duration-300" 
                        style={{ 
                          backgroundColor: 'var(--color-person-a)',
                          width: `${monthlyStats.totalDays > 0 ? (monthlyStats.personA / monthlyStats.totalDays) * 100 : 0}%` 
                        }}
                      ></div>
                      <div 
                        className="h-full transition-all duration-300" 
                        style={{ 
                          backgroundColor: 'var(--color-person-b)',
                          width: `${monthlyStats.totalDays > 0 ? (monthlyStats.personB / monthlyStats.totalDays) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible 30-Day Statistics */}
              {stats && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <button
                    onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors p-2 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-800 dark:text-gray-300">Next 30 Days Summary</span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                      isStatsExpanded ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  
                  {isStatsExpanded && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                        <Users className="h-5 w-5 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.totalHandoffs}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Handoffs</div>
                      </div>
                      <div className="text-center p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                        <Clock className="h-5 w-5 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.averagePeriodLength.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg Period Length</div>
                      </div>
                      <div className="text-center p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                        <BarChart3 className="h-5 w-5 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.periods.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Custody Periods</div>
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

      {/* Debug info */}
      {storageInfo && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs flex items-center space-x-2 border border-gray-700">
          <Database className="h-3 w-3" />
          <span>Using: {storageInfo.primary} (Configured: {storageInfo.isConfigured ? 'Yes' : 'No'})</span>
        </div>
      )}
    </div>
  );
} 