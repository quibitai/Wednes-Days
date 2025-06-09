'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, User, Settings, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import Calendar from '@/components/Calendar';
import PreviewCalendar from '@/components/PreviewCalendar';
import ChangesPanel from '@/components/ChangesPanel';
import CompareView from '@/components/CompareView';
import ConfigurationPanel from '@/components/ConfigurationPanel';
import ScheduleSummary from '@/components/ScheduleSummary';
import { StorageManager } from '@/lib/storage/storageManager';
import { PreviewManager } from '@/lib/services/previewManager';
import { ScheduleGenerator } from '@/lib/services/scheduleGenerator';
import { ScheduleExtender } from '@/lib/services/scheduleExtender';
import { useTheme } from '@/contexts/ThemeContext';
import type { 
  CustodySchedule, 
  AppConfig,
  SchedulePreview,
  ScheduleChange
} from '@/types';

const storageManager = new StorageManager();
const previewManager = new PreviewManager();
const scheduleGenerator = new ScheduleGenerator();
const scheduleExtender = new ScheduleExtender();

export default function Home() {
  // Theme context
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Core state
  const [schedule, setSchedule] = useState<CustodySchedule | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<'personA' | 'personB'>('personA');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Preview system state
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [changes, setChanges] = useState<ScheduleChange[]>([]);
  
  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Debug: Check storage info
        const storageInfo = storageManager.getStorageInfo();
        console.log('Storage Info:', storageInfo);
        
        const [savedConfig, savedSchedule] = await Promise.all([
          storageManager.loadConfig(),
          storageManager.loadSchedule()
        ]);

        console.log('Loaded config:', savedConfig ? 'Found' : 'Not found');
        console.log('Loaded schedule:', savedSchedule ? 'Found' : 'Not found');
        
        setConfig(savedConfig);
        setSchedule(savedSchedule);
        
        if (savedSchedule) {
          initializePreview(savedSchedule.entries);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Initialize preview from current schedule
  const initializePreview = (currentSchedule: Record<string, any>) => {
    const newPreview = previewManager.initializePreview(currentSchedule);
    setPreview(newPreview);
    setChanges([]);
  };

  // Update changes list when preview changes
  const updateChanges = (updatedPreview: SchedulePreview) => {
    const newChanges = previewManager.getChanges(updatedPreview);
    setChanges(newChanges);
  };

  // Handle marking a day as unavailable
  const handleMarkUnavailable = async (date: string, personId: 'personA' | 'personB') => {
    if (!preview) return;

    try {
      setIsProcessing(true);
      
      // Mark as unavailable
      let updatedPreview = previewManager.markUnavailable(preview, date, personId);
      
      // Generate new proposals
      updatedPreview = await previewManager.generateProposals(updatedPreview);
      
      setPreview(updatedPreview);
      updateChanges(updatedPreview);
    } catch (error) {
      console.error('Error marking unavailable:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle removing unavailability
  const handleRemoveUnavailable = (date: string) => {
    if (!preview) return;

    const updatedPreview = previewManager.removeUnavailable(preview, date);
    setPreview(updatedPreview);
    updateChanges(updatedPreview);
  };

  // Handle manual adjustment
  const handleManualAdjustment = (date: string, newAssignment: 'personA' | 'personB') => {
    if (!preview) return;

    const updatedPreview = previewManager.makeManualAdjustment(preview, date, newAssignment);
    setPreview(updatedPreview);
    updateChanges(updatedPreview);
  };

  // Handle accepting all changes
  const handleAcceptAll = async () => {
    if (!preview || !schedule) return;

    try {
      setIsProcessing(true);
      
      // Commit changes
      const finalSchedule = previewManager.commitChanges(preview);
      
      // Update storage
      const updatedSchedule = {
        ...schedule,
        entries: finalSchedule,
        lastUpdated: new Date().toISOString()
      };
      
      await storageManager.saveSchedule(updatedSchedule);
      setSchedule(updatedSchedule);
      
      // Initialize new clean preview
      initializePreview(finalSchedule);
      
    } catch (error) {
      console.error('Error accepting changes:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle discarding all changes
  const handleDiscardAll = () => {
    if (!schedule) return;

    previewManager.discardChanges();
    initializePreview(schedule.entries);
  };

  // Handle schedule reset
  const handleScheduleReset = async () => {
    try {
      const loadedSchedule = await storageManager.loadSchedule();
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
        // Reset preview to clean state
        const newPreview = previewManager.resetToCleanState(loadedSchedule.entries);
        setPreview(newPreview);
        setChanges([]);
      }
    } catch (error) {
      console.error('Error reloading after reset:', error);
    }
  };

  // Handle configuration changes
  const handleConfigChange = async (newConfig: AppConfig) => {
    try {
      await storageManager.saveConfig(newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  // Handle month change with automatic schedule extension
  const handleMonthChange = async (newMonth: Date) => {
    setCurrentMonth(newMonth);
    
    // If we have a schedule, ensure the new month is populated
    if (schedule) {
      try {
        // Check if this month needs population
        const monthKey = newMonth.toISOString().slice(0, 7);
        const hasEntriesForMonth = Object.keys(schedule.entries).some(dateStr => 
          dateStr.startsWith(monthKey)
        );
        
        if (!hasEntriesForMonth) {
          console.log(`Extending schedule for month: ${monthKey}`);
          const extendedSchedule = await scheduleExtender.ensureMonthPopulated(
            schedule,
            newMonth,
            storageManager
          );
          
          setSchedule(extendedSchedule);
          
          // Update preview if it exists
          if (preview) {
            initializePreview(extendedSchedule.entries);
          }
        }
      } catch (error) {
        console.error('Error extending schedule for month:', error);
      }
    }
  };

  // Generate initial schedule if none exists
  const handleGenerateSchedule = async () => {
    if (!config) return;
    
    setIsProcessing(true);
    try {
      const startDate = config.startDate ? new Date(config.startDate) : new Date();
      const initialPerson = config.initialPerson || 'personA';
      
      // Generate a full year worth of schedule initially (365 days)
      const newScheduleEntries = scheduleGenerator.generate3DayRotation(
        startDate,
        initialPerson,
        365
      );
      
      const newSchedule: CustodySchedule = {
        entries: newScheduleEntries,
        startDate: startDate.toISOString().split('T')[0],
        initialPerson: initialPerson,
        lastUpdated: new Date().toISOString()
      };
      
      await storageManager.saveSchedule(newSchedule);
      setSchedule(newSchedule);
      
      // Initialize preview system
      initializePreview(newSchedule);
      
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Image src="/dog-icon.png" alt="Dog Icon" width={48} height={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Image src="/dog-icon.png" alt="Dog Icon" width={48} height={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Wednes' Days
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Configure your schedule to get started
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Set Up Configuration
          </button>
        </div>
        
        {showConfig && (
          <ConfigurationPanel
            config={config}
            onSave={handleConfigChange}
            onClose={() => setShowConfig(false)}
          />
        )}
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Image src="/dog-icon.png" alt="Dog Icon" width={48} height={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Ready to Create Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Generate your initial custody schedule
          </p>
          <button
            onClick={handleGenerateSchedule}
            disabled={isProcessing}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            Generate Schedule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image src="/dog-icon.png" alt="Dog Icon" width={64} height={64} className="h-16 w-16" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Wednes' Days
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Toggle */}
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCurrentUser('personA')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentUser === 'personA'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <User className="h-4 w-4 inline mr-1" />
                {config.personA.name}
              </button>
              <button
                onClick={() => setCurrentUser('personB')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentUser === 'personB'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <User className="h-4 w-4 inline mr-1" />
                {config.personB.name}
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowConfig(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar - Use PreviewCalendar when preview system is active */}
        {preview ? (
          <PreviewCalendar
            preview={preview}
            config={config}
            currentUser={currentUser}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
            onMarkUnavailable={handleMarkUnavailable}
            onRemoveUnavailable={handleRemoveUnavailable}
            onManualAdjustment={handleManualAdjustment}
          />
        ) : (
          <Calendar
            schedule={schedule}
            config={config}
            currentUser={currentUser}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
          />
        )}

        {/* Changes Panel - Show when there are pending changes */}
        {preview && preview.hasUnsavedChanges && (
          <ChangesPanel
            preview={preview}
            changes={changes}
            config={config}
            onAcceptAll={handleAcceptAll}
            onDiscardAll={handleDiscardAll}
            onShowCompare={() => setShowCompare(true)}
            isProcessing={isProcessing}
          />
        )}

        {/* Schedule Summary */}
        <ScheduleSummary
          preview={preview || undefined}
          schedule={schedule}
          config={config}
          currentMonth={currentMonth}
        />

        {/* Compare View Modal */}
        {showCompare && preview && (
          <CompareView
            preview={preview}
            changes={changes}
            config={config}
            onClose={() => setShowCompare(false)}
            onAcceptAll={handleAcceptAll}
            onDiscardAll={handleDiscardAll}
          />
        )}

        {/* Configuration Modal */}
        {showConfig && (
          <ConfigurationPanel
            config={config}
            onSave={handleConfigChange}
            onClose={() => setShowConfig(false)}
            onScheduleReset={handleScheduleReset}
          />
        )}
      </div>
    </div>
  );
} 