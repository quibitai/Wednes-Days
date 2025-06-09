'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, User, Settings, Sun, Moon, History, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import PreviewCalendar from '@/components/PreviewCalendar';
import ConfigurationPanel from '@/components/ConfigurationPanel';
import ScheduleSummary from '@/components/ScheduleSummary';
import DayDetailModal from '@/components/DayDetailModal';
import HandoffList from '@/components/HandoffList';
import HistoryPanel from '@/components/HistoryPanel';
import { StorageManager } from '@/lib/storage/storageManager';
import { PreviewManager } from '@/lib/services/previewManager';
import { ScheduleGenerator } from '@/lib/services/scheduleGenerator';
import { ScheduleExtender } from '@/lib/services/scheduleExtender';
import { useTheme } from '@/contexts/ThemeContext';
import type { 
  CustodySchedule, 
  AppConfig,
  SchedulePreview,
  Note,
  ScheduleEntry
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
  
  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nlpInput, setNlpInput] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
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
        
        if (savedConfig) {
          previewManager.setConfig(savedConfig);
        }
        
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

  const initializePreview = (currentSchedule: Record<string, any>) => {
    const newPreview = previewManager.initializePreview(currentSchedule);
    setPreview(newPreview);
  };

  const handleMarkUnavailable = (date: string, personId: 'personA' | 'personB') => {
    if (!preview) return;

    const tempPreview = previewManager.markUnavailable(preview, date, personId);
    setPreview(tempPreview); // Update UI to show the 'unavailable' status

    // Run the rebalance in the background
    setIsProcessing(true);
    previewManager.generateAIProposals(tempPreview)
        .then(finalPreview => {
            setPreview(finalPreview);
        })
        .catch(error => {
            console.error('Error during background AI proposal:', error);
            // Optionally revert to the simple markUnavailable state if AI fails
            setPreview(tempPreview);
        })
        .finally(() => {
            setIsProcessing(false);
        });
  };

  const handleRemoveUnavailable = async (date: string) => {
    if (!preview) return;

    try {
      setIsProcessing(true);
      const updatedPreview = previewManager.removeUnavailable(preview, date);
      setPreview(updatedPreview);
    } catch (error) {
      console.error('Error removing unavailability:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAdjustment = async (date: string, newAssignment: 'personA' | 'personB') => {
    if (!preview) return;

    try {
      setIsProcessing(true);
      const updatedPreview = previewManager.makeManualAdjustment(preview, date, newAssignment);
      setPreview(updatedPreview);
    } catch (error) {
      console.error('Error making manual adjustment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScheduleReset = async () => {
    try {
      const loadedSchedule = await storageManager.loadSchedule();
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
        const newPreview = previewManager.resetToCleanState(loadedSchedule.entries);
        setPreview(newPreview);
      }
    } catch (error) {
      console.error('Error reloading after reset:', error);
    }
  };

  const handleConfigChange = async (newConfig: AppConfig) => {
    try {
      await storageManager.saveConfig(newConfig);
      setConfig(newConfig);
      previewManager.setConfig(newConfig);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const handleMonthChange = async (newMonth: Date) => {
    setCurrentMonth(newMonth);
    
    if (schedule) {
      try {
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
          
          if (preview) {
            initializePreview(extendedSchedule.entries);
          }
        }
      } catch (error) {
        console.error('Error extending schedule for month:', error);
      }
    }
  };

  const handleGenerateSchedule = async () => {
    if (!config) return;
    
    setIsProcessing(true);
    try {
      const startDate = config.startDate ? new Date(config.startDate) : new Date();
      const initialPerson = config.initialPerson || 'personA';
      
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
      
      initializePreview(newSchedule);
      
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNaturalLanguageInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpInput.trim() || !preview) return;

    const originalInput = nlpInput;
    setNlpInput('');
    setIsProcessing(true);

    try {
        const response = await fetch('/api/ai/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: originalInput, userId: currentUser })
        });

        if (!response.ok) throw new Error('Failed to process request.');

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Could not parse request.');

        const { action, dates, person } = result.data || {};

        if (action === 'mark_unavailable' && dates?.length > 0) {
            let tempPreview = preview;
            for (const date of dates) {
                tempPreview = previewManager.markUnavailable(tempPreview, date, person || currentUser);
            }
            setPreview(tempPreview); // Show the initial 'unavailable' marks

            // Now run the full rebalance
            const finalPreview = await previewManager.generateAIProposals(tempPreview);
            setPreview(finalPreview);

        } else {
            alert(`Action understood: ${action}, but not yet implemented.`);
        }

    } catch (error) {
        alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setNlpInput(originalInput);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDayDetailClick = (date: string) => {
    setSelectedDate(date);
    setShowDayDetail(true);
  };

  const handleCloseDayDetail = () => {
    setShowDayDetail(false);
    setSelectedDate(null);
  };

  const handleSaveNote = async (date: string, noteContent: string) => {
    if (!config) return;

    try {
      const newNote: Note = {
        content: noteContent,
        authorId: currentUser,
        authorName: config[currentUser].name,
        timestamp: new Date().toISOString(),
      };
      
      await storageManager.saveNote(date, newNote);
      
      const loadedSchedule = await storageManager.loadSchedule();
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
        if (preview) {
          const newPreview = previewManager.resetToCleanState(loadedSchedule.entries);
          setPreview(newPreview);
        }
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDeleteNote = async (date: string) => {
    if (!preview) return;
    
    try {
      await storageManager.deleteNote(date);
      const loadedSchedule = await storageManager.loadSchedule();
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
        const newPreview = previewManager.resetToCleanState(loadedSchedule.entries);
        setPreview(newPreview);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const handleToggleBlockDay = async (date: string, personId: 'personA' | 'personB') => {
    if (!schedule) return;

    try {
      await storageManager.toggleInformationalUnavailability(date, personId);
      
      const loadedSchedule = await storageManager.loadSchedule();
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
        
        if (preview) {
          const newPreview = previewManager.resetToCleanState(loadedSchedule.entries);
          setPreview(newPreview);
        }
      }
    } catch (error) {
      console.error('Error toggling day block:', error);
      alert('Failed to toggle day block. Please try again.');
    }
  };

  const handleRevertChange = async (historyId: string) => {
    try {
      const reverted = await storageManager.revertChange(historyId);
      if (reverted) {
        const loadedSchedule = await storageManager.loadSchedule();
        if (loadedSchedule) {
          setSchedule(loadedSchedule);
          const newPreview = previewManager.resetToCleanState(loadedSchedule.entries);
          setPreview(newPreview);
        }
      }
    } catch (error) {
      console.error('Error reverting change:', error);
      throw error;
    }
  };

  const createTestHistory = async () => {
    try {
      if (!schedule) return;
      
      const testDate = Object.keys(schedule.entries)[0];
      if (!testDate) return;
      
      console.log('Creating test history entry for date:', testDate);
      
      await storageManager.switchDayAssignmentWithHistory(testDate, currentUser);
      
      const loadedSchedule = await storageManager.loadSchedule();
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
        const newPreview = previewManager.resetToCleanState(loadedSchedule.entries);
        setPreview(newPreview);
      }
      
      console.log('Test history entry created successfully');
    } catch (error) {
      console.error('Error creating test history:', error);
    }
  };

  const handleAcceptChanges = async () => {
    if (!preview || !schedule) return;

    try {
      setIsProcessing(true);
      
      const finalSchedule = previewManager.commitChanges(preview);
      
      const changedEntries: Record<string, any> = {};
      Object.keys(finalSchedule).forEach(date => {
        if (JSON.stringify(finalSchedule[date]) !== JSON.stringify(schedule.entries[date])) {
          changedEntries[date] = finalSchedule[date];
        }
      });

      if (Object.keys(changedEntries).length > 0) {
        await storageManager.bulkUpdateScheduleWithHistory(
          changedEntries,
          'bulk_update',
          `Applied ${Object.keys(changedEntries).length} schedule changes`,
          currentUser
        );
      }
      
      const loadedSchedule = await storageManager.loadSchedule();
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
        initializePreview(loadedSchedule.entries);
      }
      
    } catch (error) {
      console.error('Error accepting changes:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!schedule) return;
    initializePreview(schedule.entries);
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
            onScheduleReset={handleScheduleReset}
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Image src="/dog-icon.png" alt="Dog Icon" width={64} height={64} className="h-16 w-16" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Wednes' Days
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="View change history"
            >
              <History className="h-5 w-5" />
            </button>

            {schedule && (
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  List
                </button>
              </div>
            )}

            {config && (
              <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-500">
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
            )}
            
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setShowConfig(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {schedule && config && (
          <div className="w-full">
            {viewMode === 'calendar' ? (
              preview && (
                <PreviewCalendar
                  preview={preview}
                  config={config}
                  currentUser={currentUser}
                  currentMonth={currentMonth}
                  onMonthChange={handleMonthChange}
                  onMarkUnavailable={handleMarkUnavailable}
                  onRemoveUnavailable={handleRemoveUnavailable}
                  onManualAdjustment={handleManualAdjustment}
                  onDayDetailClick={handleDayDetailClick}
                  onToggleInformationalUnavailability={handleToggleBlockDay}
                  onAcceptChanges={handleAcceptChanges}
                  onDiscardChanges={handleDiscardChanges}
                />
              )
            ) : (
              <HandoffList
                schedule={schedule}
                config={config}
                onDayDetailClick={handleDayDetailClick}
              />
            )}
          </div>
        )}

        {preview && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-500 p-4">
            <form onSubmit={handleNaturalLanguageInput} className="space-y-3">
              <div>
                <label htmlFor="nlp-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tell me what you'd like to change:
                </label>
                <div className="flex space-x-2">
                  <input
                    id="nlp-input"
                    type="text"
                    value={nlpInput}
                    onChange={(e) => setNlpInput(e.target.value)}
                    placeholder="e.g., 'Mark me unavailable July 15-17' or 'Give Adam custody on July 20'"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={!nlpInput.trim() || isProcessing}
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {schedule && config && (
          <ScheduleSummary
            preview={preview || undefined}
            schedule={schedule}
            config={config}
            currentMonth={currentMonth}
          />
        )}

        {showConfig && (
          <ConfigurationPanel
            config={config}
            onSave={handleConfigChange}
            onClose={() => setShowConfig(false)}
            onScheduleReset={handleScheduleReset}
          />
        )}
      </div>

      {showDayDetail && selectedDate && schedule && config && (
        <DayDetailModal
          date={selectedDate}
          entry={schedule.entries[selectedDate] || null}
          config={config}
          currentUser={currentUser}
          onClose={handleCloseDayDetail}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onRevert={handleRevertChange}
      />
    </div>
  );
} 