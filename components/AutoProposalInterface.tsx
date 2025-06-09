'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Check, X, TrendingUp, Users, Clock, AlertTriangle, Undo2 } from 'lucide-react';
import { AutoRebalanceService, type RebalanceResult } from '@/lib/services/autoRebalanceService';
import { StorageManager } from '@/lib/storage/storageManager';
import ScheduleResetButton from './ScheduleResetButton';
import type { ScheduleEntry, AppConfig, ChangeHistoryEntry } from '@/types';

interface AutoProposalInterfaceProps {
  currentUser: 'personA' | 'personB';
  currentSchedule: Record<string, ScheduleEntry>;
  config: AppConfig;
}

interface AutoProposal {
  id: string;
  triggeredBy: {
    date: string;
    person: 'personA' | 'personB';
  };
  result: RebalanceResult;
  createdAt: string;
  status: 'pending' | 'applied' | 'dismissed';
}

export default function AutoProposalInterface({ 
  currentUser, 
  currentSchedule, 
  config 
}: AutoProposalInterfaceProps) {
  const [proposals, setProposals] = useState<AutoProposal[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoRebalanceService] = useState(new AutoRebalanceService());
  const [storageManager] = useState(new StorageManager());
  const [latestUndoableChange, setLatestUndoableChange] = useState<ChangeHistoryEntry | null>(null);

  // Monitor for unavailable days and auto-generate proposals
  useEffect(() => {
    const checkForUnavailableDays = async () => {
      const unavailableDays = Object.entries(currentSchedule)
        .filter(([_, entry]) => entry.isUnavailable && !entry.processedForRebalance)
        .map(([date, entry]) => ({
          date,
          unavailablePerson: entry.unavailableBy || entry.assignedTo
        }));

      for (const { date, unavailablePerson } of unavailableDays) {
        await generateAutoProposal(date, unavailablePerson as 'personA' | 'personB');
      }
    };

    checkForUnavailableDays();
  }, [currentSchedule]);

  // Load latest undoable change
  useEffect(() => {
    const loadUndoableChange = async () => {
      const change = await storageManager.getLatestUndoableChange();
      setLatestUndoableChange(change);
    };

    loadUndoableChange();
  }, [currentSchedule, storageManager]);

  const generateAutoProposal = async (
    unavailableDate: string, 
    unavailablePerson: 'personA' | 'personB'
  ) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await autoRebalanceService.rebalanceSchedule(
        currentSchedule,
        unavailableDate,
        unavailablePerson
      );

      if (result.success && result.summary && result.summary.changesCount > 0) {
        const newProposal: AutoProposal = {
          id: `auto-${Date.now()}`,
          triggeredBy: {
            date: unavailableDate,
            person: unavailablePerson
          },
          result,
          createdAt: new Date().toISOString(),
          status: 'pending'
        };

        setProposals(prev => [newProposal, ...prev.filter(p => p.status !== 'pending')]);
      }
    } catch (error) {
      console.error('Error generating auto proposal:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyProposal = async (proposal: AutoProposal) => {
    if (!proposal.result.rebalancedSchedule) return;

    setIsProcessing(true);
    try {
      // Apply the rebalanced schedule with history tracking for undo capability
      await storageManager.bulkUpdateScheduleWithHistory(
        proposal.result.rebalancedSchedule,
        'auto_rebalance',
        `Auto-rebalanced schedule (${proposal.result.summary?.changesCount} changes)`,
        currentUser
      );
      
      // Mark the triggering date as processed
      await storageManager.markDateProcessedForRebalance(proposal.triggeredBy.date);
      
      // Update proposal status
      setProposals(prev => 
        prev.map(p => 
          p.id === proposal.id 
            ? { ...p, status: 'applied' } 
            : p
        )
      );
    } catch (error) {
      console.error('Error applying proposal:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async () => {
    setIsProcessing(true);
    try {
      const result = await storageManager.undoLastChange();
      if (result.success) {
        // Refresh the undoable change state
        const change = await storageManager.getLatestUndoableChange();
        setLatestUndoableChange(change);
      } else {
        console.error('Undo failed:', result.error);
      }
    } catch (error) {
      console.error('Error during undo:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const dismissProposal = async (proposal: AutoProposal) => {
    // Mark the triggering date as processed to prevent re-generation
    await storageManager.markDateProcessedForRebalance(proposal.triggeredBy.date);
    
    setProposals(prev => 
      prev.map(p => 
        p.id === proposal.id 
          ? { ...p, status: 'dismissed' } 
          : p
      )
    );
  };

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const recentProposals = proposals.filter(p => p.status !== 'pending').slice(0, 3);

  if (pendingProposals.length === 0 && recentProposals.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Auto Schedule Balancing
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Undo Button */}
            {latestUndoableChange && (
              <button
                onClick={handleUndo}
                disabled={isProcessing}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 rounded-md transition-colors"
                title={`Undo: ${latestUndoableChange.description}`}
              >
                <Undo2 className="h-3 w-3 mr-1" />
                Undo Last Change
              </button>
            )}
            
            {/* Reset Button */}
            <ScheduleResetButton 
              config={config} 
              onReset={() => window.location.reload()} 
            />
          </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p>Schedule is balanced. Mark days unavailable to see automatic rebalancing suggestions.</p>
          <div className="mt-3 text-xs space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Target: 3 nights per person</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>Maximum: 4 nights when necessary</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Minimize custody handoffs</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span>Prefer even number of nights per person</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Schedule Rebalancing
          </h2>
          {isProcessing && <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Undo Button */}
          {latestUndoableChange && (
            <button
              onClick={handleUndo}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 rounded-md transition-colors"
              title={`Undo: ${latestUndoableChange.description}`}
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Undo Last Change
            </button>
          )}
          
          {/* Reset Button */}
          <ScheduleResetButton 
            config={config} 
            onReset={() => window.location.reload()} 
          />
        </div>
      </div>

      {/* Pending Proposals */}
      {pendingProposals.map(proposal => (
        <div key={proposal.id} className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  Schedule Adjustment Needed
                </span>
              </div>
              
              <div className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                <p>
                  <strong>{config[proposal.triggeredBy.person].name}</strong> marked{' '}
                  <strong>{new Date(proposal.triggeredBy.date).toLocaleDateString()}</strong> as unavailable.
                </p>
                {proposal.result.summary && (
                  <div className="mt-2 space-y-1">
                    <p>• {proposal.result.summary.improvementReason}</p>
                    <p>• {proposal.result.summary.changesCount} day(s) will be reassigned</p>
                    <p>• Final distribution: {config.personA.name} ({proposal.result.summary.personADays}), {config.personB.name} ({proposal.result.summary.personBDays})</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => applyProposal(proposal)}
                  disabled={isProcessing}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md transition-colors"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Apply Changes
                </button>
                <button
                  onClick={() => dismissProposal(proposal)}
                  disabled={isProcessing}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-md transition-colors"
                >
                  <X className="h-3 w-3 mr-1" />
                  Keep Manual
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Recent Activity */}
      {recentProposals.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentProposals.map(proposal => (
              <div key={proposal.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                <div className="flex items-center space-x-2">
                  {proposal.status === 'applied' ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="text-gray-600 dark:text-gray-300">
                    {new Date(proposal.triggeredBy.date).toLocaleDateString()} - 
                    {proposal.status === 'applied' ? ' Applied' : ' Kept manual'}
                  </span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(proposal.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 