import React from 'react';

const LoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded-lg w-64 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>

        {/* Storage Info Skeleton */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
          </div>
        </div>

        {/* Selection Bar Skeleton */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded-full w-18 animate-pulse"></div>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="h-9 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
              <div className="h-9 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Calendar Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Calendar Header */}
          <div className="border-b bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-3 py-3 text-center">
                <div className="h-4 bg-gray-200 rounded w-8 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="min-h-[80px] border border-gray-100 p-2">
                <div className="h-4 bg-gray-200 rounded w-6 mb-2 animate-pulse"></div>
                <div className="mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                    {i % 3 === 0 && (
                      <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend Skeleton */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="h-5 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton; 