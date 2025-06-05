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

  const algorithm = new CustodySchedulingAlgorithm();

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {result ? (result.success ? 'Success!' : 'Error') : 'Mark as Unavailable'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
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
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
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
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="radio"
                      name="person"
                      value="personA"
                      checked={selectedPerson === 'personA'}
                      onChange={(e) => setSelectedPerson(e.target.value as 'personA')}
                      className="mr-3 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-900 font-medium">{config.personA.name}</span>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="radio"
                      name="person"
                      value="personB"
                      checked={selectedPerson === 'personB'}
                      onChange={(e) => setSelectedPerson(e.target.value as 'personB')}
                      className="mr-3 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-900 font-medium">{config.personB.name}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {selectedPerson && previewData && (
                <div className="mb-6">
                  {previewData.warnings && previewData.warnings.length > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium text-yellow-800 mb-1">Warning: 4-Day Rule Violation</div>
                          <div className="text-yellow-700 mb-3">
                            {previewData.conflictDates.length > 0 ? (
                              `Will adjust ${previewData.conflictDates.length} date${previewData.conflictDates.length !== 1 ? 's' : ''} and create ${previewData.handoffCount} handoff${previewData.handoffCount !== 1 ? 's' : ''}`
                            ) : (
                              'Will mark as unavailable'
                            )}
                          </div>
                          <div className="text-yellow-800">
                            <div className="font-medium mb-1">Rule violations:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {previewData.warnings.map((warning, index) => (
                                <li key={index} className="text-xs">{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium text-green-800 mb-1">Ready to Apply</div>
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

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedPerson || !previewData?.isValid || isSubmitting}
                  className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-medium ${
                    previewData?.warnings && previewData.warnings.length > 0
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting 
                    ? 'Applying...' 
                    : previewData?.warnings && previewData.warnings.length > 0
                      ? 'Apply with Warnings'
                      : 'Mark as Unavailable'
                  }
                </button>
              </div>
            </>
          ) : (
            /* Result */
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                result.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {result.success ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <h3 className={`text-lg font-medium mb-2 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? 'Schedule Updated!' : 'Update Failed'}
              </h3>
              <p className={`text-sm mb-6 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
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