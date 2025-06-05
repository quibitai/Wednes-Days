'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Users, Play } from 'lucide-react';

interface SetupFormProps {
  onSetup: (config: {
    personAName: string;
    personBName: string;
    startDate: string;
    initialPerson: 'personA' | 'personB';
  }) => void;
  isLoading: boolean;
}

export default function SetupForm({ onSetup, isLoading }: SetupFormProps) {
  const [personAName, setPersonAName] = useState('');
  const [personBName, setPersonBName] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [initialPerson, setInitialPerson] = useState<'personA' | 'personB'>('personA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!personAName.trim() || !personBName.trim()) {
      alert('Please enter both names');
      return;
    }

    if (personAName.trim() === personBName.trim()) {
      alert('Please enter different names for each person');
      return;
    }

    onSetup({
      personAName: personAName.trim(),
      personBName: personBName.trim(),
      startDate,
      initialPerson,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dog Custody Scheduler
          </h1>
          <p className="text-gray-600">
            Set up your shared custody schedule for your beloved dog
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="personA" className="block text-sm font-medium text-gray-700 mb-2">
                First Person&apos;s Name
              </label>
              <input
                type="text"
                id="personA"
                value={personAName}
                onChange={(e) => setPersonAName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter first person's name"
                required
              />
            </div>

            <div>
              <label htmlFor="personB" className="block text-sm font-medium text-gray-700 mb-2">
                Second Person&apos;s Name
              </label>
              <input
                type="text"
                id="personB"
                value={personBName}
                onChange={(e) => setPersonBName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter second person's name"
                required
              />
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The date when the custody schedule begins
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Who gets the dog first on the start date?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInitialPerson('personA')}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    initialPerson === 'personA'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">
                    {personAName || 'First Person'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setInitialPerson('personB')}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    initialPerson === 'personB'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">
                    {personBName || 'Second Person'}
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Create Schedule</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Schedule Preview</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Default rotation: 3 nights on, 3 nights off</p>
              <p>• Maximum consecutive nights: 4 days</p>
              <p>• Automatic conflict resolution when someone is unavailable</p>
              <p>• Real-time updates for both users</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-gray-500">
          Both users will share the same schedule and can mark their unavailability
        </div>
      </div>
    </div>
  );
} 