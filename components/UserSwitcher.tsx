'use client';

import React from 'react';
import { User, ChevronDown } from 'lucide-react';

interface UserSwitcherProps {
  currentUser: 'personA' | 'personB';
  onUserChange: (user: 'personA' | 'personB') => void;
  config: {
    personA: { name: string };
    personB: { name: string };
  };
}

export default function UserSwitcher({ currentUser, onUserChange, config }: UserSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const currentUserName = currentUser === 'personA' ? config.personA.name : config.personB.name;
  const otherUser = currentUser === 'personA' ? 'personB' : 'personA';
  const otherUserName = otherUser === 'personA' ? config.personA.name : config.personB.name;

  const handleUserSwitch = () => {
    onUserChange(otherUser);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={`Currently viewing as ${currentUserName}`}
      >
        <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-gray-700 dark:text-gray-300 font-medium">{currentUserName}</span>
        <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg z-50 py-1">
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              Switch User View
            </div>
            
            <button
              onClick={handleUserSwitch}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-2 transition-colors"
            >
              <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {otherUserName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  View as {otherUserName}
                </div>
              </div>
            </button>
            
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              <div className="font-medium">Current: {currentUserName}</div>
              <div>No login required - shared access</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 