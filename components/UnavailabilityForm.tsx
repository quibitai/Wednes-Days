'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, CheckCircle, Clock, User, ArrowRight } from 'lucide-react';
import type { AppConfig, UnavailabilityRequest, ScheduleAdjustment } from '@/types';
import { CustodySchedulingAlgorithm } from '@/lib/scheduling/algorithm';

interface UnavailabilityFormProps {
  config: AppConfig | null;
  selectedDates: string[];
  schedule: any;
  onClose: () => void;
  onSubmit: (personId: 'personA' | 'personB', dates: string[]) => Promise<{
    success: boolean;
    message: string;
    handoffCount?: number;
  }>;
  isSubmitting: boolean;
  onClearSelection: () => void;
}

export default function UnavailabilityForm({
  config,
  selectedDates,
  schedule,
  onClose,
  onSubmit,
  isSubmitting,
  onClearSelection,
}: UnavailabilityFormProps) {
  const [selectedPerson, setSelectedPerson] = useState<'personA' | 'personB' | ''>('');
  const [previewData, setPreviewData] = useState<ScheduleAdjustment | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const algorithm = new CustodySchedulingAlgorithm();

  // Animation entrance effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Enhanced mobile detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Generate preview when person is selected
  useEffect(() => {
    if (selectedPerson && selectedDates.length > 0 && schedule && config) {
      try {
        const request: UnavailabilityRequest = {
          personId: selectedPerson,
          dates: selectedDates,
        };

        const { adjustment } = algorithm.processUnavailabilityRequest(schedule, request, config);
        setPreviewData(adjustment);
      } catch (error) {
        console.error('Error generating preview:', error);
        setPreviewData(null);
      }
    } else {
      setPreviewData(null);
    }
  }, [selectedPerson, selectedDates, schedule, config]);

  const handleSubmit = async () => {
    if (!selectedPerson || selectedDates.length === 0) return;

    const response = await onSubmit(selectedPerson, selectedDates);
    setResult(response);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Wait for animation to complete
  };

  const formatDates = (dates: string[]) => {
    if (dates.length === 0) return '';
    if (dates.length === 1) return new Date(dates[0]).toLocaleDateString();
    
    const sortedDates = [...dates].sort();
    const first = new Date(sortedDates[0]).toLocaleDateString();
    const last = new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString();
    
    if (dates.length === 2) {
      return `${first} and ${last}`;
    }
    
    return `${first} through ${last} (${dates.length} dates)`;
  };

  if (!config) return null;

  // Mobile bottom sheet styles
  const mobileStyles = isMobile ? {
    overlay: "fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50",
    container: `bg-white rounded-t-2xl w-full max-h-[90vh] overflow-hidden transition-transform duration-300 ease-out ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`,
    content: "overflow-y-auto max-h-[80vh]"
  } : {
    overlay: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50",
    container: `bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden transition-all duration-300 ease-out ${
      isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
    }`,
    content: "overflow-y-auto"
  };

  return (
    <div className={mobileStyles.overlay}>
      <div className={mobileStyles.container}>
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center p-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {result ? (result.success ? 'Success!' : 'Error') : 'Mark as Unavailable'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className={`p-6 ${mobileStyles.content}`}>
          {!result ? (
            <>
              {/* Selected Dates */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">Selected Dates</span>
                  </div>
                  <button
                    onClick={onClearSelection}
                    className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium">
                    {formatDates(selectedDates)}
                  </p>
                  <p className="text-red-600 text-xs mt-1">
                    {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>

              {/* Person Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Who will be unavailable for overnight care on these dates?
                </label>
                <div className="space-y-3">
                  {/* Enhanced touch-friendly person selection */}
                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPerson === 'personA' 
                      ? 'border-red-500 bg-red-50 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isMobile ? 'min-h-[64px]' : ''}`}>
                    <input
                      type="radio"
                      name="person"
                      value="personA"
                      checked={selectedPerson === 'personA'}
                      onChange={(e) => setSelectedPerson(e.target.value as 'personA')}
                      className="mr-4 text-red-600 focus:ring-red-500 scale-125"
                    />
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedPerson === 'personA' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <User className={`h-5 w-5 ${
                          selectedPerson === 'personA' ? 'text-red-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <span className="text-gray-900 font-medium text-lg">{config.personA.name}</span>
                    </div>
                    {selectedPerson === 'personA' && (
                      <CheckCircle className="h-5 w-5 text-red-600 ml-auto" />
                    )}
                  </label>

                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPerson === 'personB' 
                      ? 'border-red-500 bg-red-50 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isMobile ? 'min-h-[64px]' : ''}`}>
                    <input
                      type="radio"
                      name="person"
                      value="personB"
                      checked={selectedPerson === 'personB'}
                      onChange={(e) => setSelectedPerson(e.target.value as 'personB')}
                      className="mr-4 text-red-600 focus:ring-red-500 scale-125"
                    />
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedPerson === 'personB' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <User className={`h-5 w-5 ${
                          selectedPerson === 'personB' ? 'text-red-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <span className="text-gray-900 font-medium text-lg">{config.personB.name}</span>
                    </div>
                    {selectedPerson === 'personB' && (
                      <CheckCircle className="h-5 w-5 text-red-600 ml-auto" />
                    )}
                  </label>
                </div>
              </div>

              {/* Enhanced Preview */}
              {selectedPerson && previewData && (
                <div className="mb-6">
                  {previewData.warnings && previewData.warnings.length > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium text-yellow-800 mb-1">⚠️ 4-Day Rule Violation</div>
                          <div className="text-yellow-700 mb-3">
                            {previewData.conflictDates.length > 0 ? (
                              `Will adjust ${previewData.conflictDates.length} date${previewData.conflictDates.length !== 1 ? 's' : ''} and create ${previewData.handoffCount} handoff${previewData.handoffCount !== 1 ? 's' : ''}`
                            ) : (
                              'Will mark as unavailable'
                            )}
                          </div>
                          <div className="text-yellow-800">
                            <div className="font-medium mb-2">Rule violations:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {previewData.warnings.map((warning, index) => (
                                <li key={index} className="text-sm">{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium text-green-800 mb-1">✅ Ready to Apply</div>
                          <div className="text-green-700">
                            {previewData.conflictDates.length > 0 ? (
                              `Will adjust ${previewData.conflictDates.length} date${previewData.conflictDates.length !== 1 ? 's' : ''} and create ${previewData.handoffCount} handoff${previewData.handoffCount !== 1 ? 's' : ''}`
                            ) : (
                              'No schedule conflicts - will mark as unavailable'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Action Buttons */}
              <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} space-${isMobile ? 'y' : 'x'}-3`}>
                <button
                  onClick={handleClose}
                  className={`${isMobile ? 'w-full' : 'flex-1'} px-4 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium text-lg`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedPerson || !previewData?.isValid || isSubmitting}
                  className={`${isMobile ? 'w-full' : 'flex-1'} px-4 py-4 text-white rounded-xl transition-all font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    previewData?.warnings && previewData.warnings.length > 0
                      ? 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800' 
                      : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                  } ${isMobile ? 'shadow-lg' : ''}`}
                >
                  {isSubmitting 
                    ? 'Applying...' 
                    : previewData?.warnings && previewData.warnings.length > 0
                      ? '⚠️ Apply with Warnings'
                      : '🚫 Mark as Unavailable'
                  }
                </button>
              </div>
            </>
          ) : (
            /* Enhanced Result Display */
            <div className="text-center py-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
                result.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {result.success ? (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-red-600" />
                )}
              </div>
              <h3 className={`text-xl font-medium mb-3 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? '🎉 Schedule Updated!' : '❌ Update Failed'}
              </h3>
              <p className={`text-base mb-8 leading-relaxed ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
              <button
                onClick={handleClose}
                className="px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors font-medium text-lg shadow-lg"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 