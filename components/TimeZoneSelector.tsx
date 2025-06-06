'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Clock, MapPin, Check, AlertCircle } from 'lucide-react';
import { TimeZoneService, type TimeZoneInfo } from '@/lib/services/timeZoneService';

interface TimeZoneSelectorProps {
  onTimeZoneChange?: (timeZone: string) => void;
  compact?: boolean;
  showDebugInfo?: boolean;
}

export default function TimeZoneSelector({ 
  onTimeZoneChange, 
  compact = false,
  showDebugInfo = false 
}: TimeZoneSelectorProps) {
  const [timeZoneService] = useState(() => TimeZoneService.getInstance());
  const [currentTimeZone, setCurrentTimeZone] = useState<TimeZoneInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Initialize current time zone
    const tzInfo = timeZoneService.getCurrentTimeZone();
    setCurrentTimeZone(tzInfo);

    if (showDebugInfo) {
      setDebugInfo(timeZoneService.getDebugInfo());
    }
  }, [timeZoneService, showDebugInfo]);

  const handleTimeZoneChange = (newTimeZone: string) => {
    const success = timeZoneService.setTimeZone(newTimeZone, false);
    
    if (success) {
      const updatedInfo = timeZoneService.getCurrentTimeZone();
      setCurrentTimeZone(updatedInfo);
      setIsOpen(false);
      
      if (onTimeZoneChange) {
        onTimeZoneChange(newTimeZone);
      }
    }
  };

  const handleResetToAutoDetected = () => {
    timeZoneService.resetToAutoDetected();
    const updatedInfo = timeZoneService.getCurrentTimeZone();
    setCurrentTimeZone(updatedInfo);
    setIsOpen(false);
    
    if (onTimeZoneChange) {
      onTimeZoneChange(updatedInfo.timeZone);
    }
  };

  const regions = ['All', 'North America', 'Europe', 'Asia', 'Australia', 'Universal'];
  
  const filteredTimeZones = selectedRegion === 'All' 
    ? timeZoneService.COMMON_TIMEZONES
    : timeZoneService.COMMON_TIMEZONES.filter(tz => tz.region === selectedRegion);

  if (!currentTimeZone) {
    return (
      <div className="flex items-center text-gray-500 dark:text-gray-400">
        <AlertCircle className="h-4 w-4 mr-2" />
        <span>Loading timezone...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={`Current timezone: ${currentTimeZone.name}`}
        >
          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">{currentTimeZone.offset}</span>
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg z-50 p-4">
              <TimeZoneDropdownContent 
                currentTimeZone={currentTimeZone}
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
                filteredTimeZones={filteredTimeZones}
                handleTimeZoneChange={handleTimeZoneChange}
                handleResetToAutoDetected={handleResetToAutoDetected}
                setIsOpen={setIsOpen}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Time Zone Settings
        </h2>
      </div>

      <TimeZoneDropdownContent 
        currentTimeZone={currentTimeZone}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        filteredTimeZones={filteredTimeZones}
        handleTimeZoneChange={handleTimeZoneChange}
        handleResetToAutoDetected={handleResetToAutoDetected}
        setIsOpen={setIsOpen}
      />

      {showDebugInfo && debugInfo && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Debug Information
          </h4>
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Separate component for the dropdown content
interface TimeZoneDropdownContentProps {
  currentTimeZone: TimeZoneInfo;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  filteredTimeZones: any[];
  handleTimeZoneChange: (timeZone: string) => void;
  handleResetToAutoDetected: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

function TimeZoneDropdownContent({
  currentTimeZone,
  selectedRegion,
  setSelectedRegion,
  filteredTimeZones,
  handleTimeZoneChange,
  handleResetToAutoDetected,
  setIsOpen
}: TimeZoneDropdownContentProps) {
  const regions = ['All', 'North America', 'Europe', 'Asia', 'Australia', 'Universal'];
  
  return (
    <>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Current Time Zone
        </h3>
        <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {currentTimeZone.offset}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentTimeZone.name}
            </div>
            {currentTimeZone.isAutoDetected && (
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Auto-detected
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Region
        </label>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {regions.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Time Zone
        </label>
        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          {filteredTimeZones.map(tz => (
            <button
              key={tz.value}
              onClick={() => handleTimeZoneChange(tz.value)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                currentTimeZone.timeZone === tz.value 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{tz.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{tz.value}</div>
                </div>
                {currentTimeZone.timeZone === tz.value && (
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={handleResetToAutoDetected}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          Auto-detect
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </>
  );
} 