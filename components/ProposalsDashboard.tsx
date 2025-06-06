'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, FileText, AlertCircle, User, Calendar, TrendingUp } from 'lucide-react';

interface Proposal {
  id: string;
  title: string;
  createdBy: 'personA' | 'personB';
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  createdAt: string;
  expiresAt: string;
  reviewedAt?: string;
  reviewedBy?: 'personA' | 'personB';
  rejectionReason?: string;
  affectedDateRange: {
    start: string;
    end: string;
  };
  handoffReduction: {
    before: number;
    after: number;
  };
  aiConfidence: number;
  reason: string;
}

interface ProposalsDashboardProps {
  currentUser: 'personA' | 'personB';
  config: {
    personA: { name: string };
    personB: { name: string };
  };
}

export default function ProposalsDashboard({ currentUser, config }: ProposalsDashboardProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    loadProposals();
  }, [currentUser]);

  const loadProposals = async () => {
    setIsLoading(true);
    try {
      // Load all proposals
      const allResponse = await fetch(`/api/ai/proposals?userId=${currentUser}`);
      const allData = await allResponse.json();
      setProposals(allData.proposals || []);

      // Load pending proposals for current user
      const pendingResponse = await fetch(`/api/ai/proposals?userId=${currentUser}&status=pending`);
      const pendingData = await pendingResponse.json();
      setPendingProposals(pendingData.proposals || []);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          proposalId,
          reviewerId: currentUser
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadProposals();
        setSelectedProposal(null);
      } else {
        alert(`Failed to accept proposal: ${result.error}`);
      }
    } catch (error) {
      console.error('Error accepting proposal:', error);
      alert('Error accepting proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectProposal = async (proposalId: string, reason?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          proposalId,
          reviewerId: currentUser,
          reason
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadProposals();
        setSelectedProposal(null);
      } else {
        alert(`Failed to reject proposal: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      alert('Error rejecting proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawProposal = async (proposalId: string) => {
    if (!confirm('Are you sure you want to withdraw this proposal?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          proposalId,
          creatorId: currentUser
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadProposals();
        setSelectedProposal(null);
      } else {
        alert(`Failed to withdraw proposal: ${result.error}`);
      }
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
      alert('Error withdrawing proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <AlertCircle className="h-4 w-4 text-gray-500" />;
      case 'withdrawn': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      case 'withdrawn': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiration = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiration <= 24 && hoursUntilExpiration > 0;
  };

  const canReview = (proposal: Proposal) => {
    return proposal.status === 'pending' && proposal.createdBy !== currentUser;
  };

  const canWithdraw = (proposal: Proposal) => {
    return proposal.status === 'pending' && proposal.createdBy === currentUser;
  };

  const getUserName = (userId: 'personA' | 'personB') => {
    return userId === 'personA' ? config.personA.name : config.personB.name;
  };

  const currentProposals = selectedTab === 'pending' ? pendingProposals : proposals;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Schedule Proposals
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Viewing as: {getUserName(currentUser)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              selectedTab === 'pending'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Pending Review ({pendingProposals.length})
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              selectedTab === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            All Proposals ({proposals.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : currentProposals.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {selectedTab === 'pending' ? 'No pending proposals' : 'No proposals yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {selectedTab === 'pending' 
                ? 'When someone creates a schedule proposal, it will appear here for review.'
                : 'Schedule proposals will appear here once created.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => setSelectedProposal(proposal)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(proposal.status)}
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {proposal.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(proposal.status)}`}>
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                      {isExpiringSoon(proposal.expiresAt) && proposal.status === 'pending' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                          Expires Soon
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>By: {getUserName(proposal.createdBy)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{proposal.affectedDateRange.start} to {proposal.affectedDateRange.end}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>AI: {Math.round(proposal.aiConfidence * 100)}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Created: {formatDate(proposal.createdAt)}</span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      {proposal.reason}
                    </p>
                  </div>

                  <div className="ml-4 flex flex-col space-y-2">
                    {canReview(proposal) && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptProposal(proposal.id);
                          }}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt('Reason for rejection (optional):');
                            if (reason !== null) {
                              handleRejectProposal(proposal.id, reason);
                            }
                          }}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {canWithdraw(proposal) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWithdrawProposal(proposal.id);
                        }}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {selectedProposal.title}
                  </h2>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedProposal.status)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedProposal.status)}`}>
                      {selectedProposal.status.charAt(0).toUpperCase() + selectedProposal.status.slice(1)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Details</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created by:</span>
                      <span className="font-medium">{getUserName(selectedProposal.createdBy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Affected dates:</span>
                      <span>{selectedProposal.affectedDateRange.start} to {selectedProposal.affectedDateRange.end}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Handoff changes:</span>
                      <span>{selectedProposal.handoffReduction.before} → {selectedProposal.handoffReduction.after}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">AI Confidence:</span>
                      <span>{Math.round(selectedProposal.aiConfidence * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span>{formatDate(selectedProposal.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                      <span>{formatDate(selectedProposal.expiresAt)}</span>
                    </div>
                    {selectedProposal.reviewedAt && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Reviewed by:</span>
                          <span>{selectedProposal.reviewedBy ? getUserName(selectedProposal.reviewedBy) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Reviewed at:</span>
                          <span>{formatDate(selectedProposal.reviewedAt)}</span>
                        </div>
                      </>
                    )}
                    {selectedProposal.rejectionReason && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Rejection reason:</span>
                        <p className="mt-1 text-sm">{selectedProposal.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Reason</h3>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    {selectedProposal.reason}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {canReview(selectedProposal) && (
                    <>
                      <button
                        onClick={() => handleAcceptProposal(selectedProposal.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Accept Proposal
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for rejection (optional):');
                          if (reason !== null) {
                            handleRejectProposal(selectedProposal.id, reason);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject Proposal
                      </button>
                    </>
                  )}
                  {canWithdraw(selectedProposal) && (
                    <button
                      onClick={() => handleWithdrawProposal(selectedProposal.id)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Withdraw Proposal
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedProposal(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 