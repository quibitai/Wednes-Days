import type { ScheduleProposal } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing schedule proposals and approval workflow
 */
export class ProposalService {
  private storageKey = 'custody-proposals';
  private serverProposals: ScheduleProposal[] = []; // Server-side fallback storage

  /**
   * Check if we're in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * Create a new proposal
   */
  async createProposal(proposal: Omit<ScheduleProposal, 'id' | 'createdAt' | 'expiresAt'>): Promise<ScheduleProposal> {
    const fullProposal: ScheduleProposal = {
      ...proposal,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    };

    await this.saveProposal(fullProposal);
    return fullProposal;
  }

  /**
   * Get all proposals for a user
   */
  async getProposals(userId?: 'personA' | 'personB'): Promise<ScheduleProposal[]> {
    const proposals = await this.loadProposals();
    
    if (userId) {
      return proposals.filter(p => p.createdBy === userId || this.isReviewer(p, userId));
    }
    
    return proposals;
  }

  /**
   * Get pending proposals that need review by a specific user
   */
  async getPendingProposals(userId: 'personA' | 'personB'): Promise<ScheduleProposal[]> {
    const proposals = await this.loadProposals();
    return proposals.filter(p => 
      p.status === 'pending' && 
      p.createdBy !== userId && // Not created by this user
      !p.reviewedBy // Not yet reviewed
    );
  }

  /**
   * Get a specific proposal by ID
   */
  async getProposal(proposalId: string): Promise<ScheduleProposal | null> {
    const proposals = await this.loadProposals();
    return proposals.find(p => p.id === proposalId) || null;
  }

  /**
   * Accept a proposal
   */
  async acceptProposal(
    proposalId: string, 
    reviewerId: 'personA' | 'personB'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const proposals = await this.loadProposals();
      const proposalIndex = proposals.findIndex(p => p.id === proposalId);
      
      if (proposalIndex === -1) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposal = proposals[proposalIndex];
      
      // Validate the reviewer can accept this proposal
      if (proposal.createdBy === reviewerId) {
        return { success: false, error: 'Cannot accept your own proposal' };
      }

      if (proposal.status !== 'pending') {
        return { success: false, error: 'Proposal is no longer pending' };
      }

      if (this.isExpired(proposal)) {
        proposal.status = 'expired';
        proposals[proposalIndex] = proposal;
        await this.saveProposals(proposals);
        return { success: false, error: 'Proposal has expired' };
      }

      // Accept the proposal
      proposals[proposalIndex] = {
        ...proposal,
        status: 'accepted',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewerId
      };

      await this.saveProposals(proposals);
      return { success: true };

    } catch (error) {
      console.error('Error accepting proposal:', error);
      return { success: false, error: 'Failed to accept proposal' };
    }
  }

  /**
   * Reject a proposal
   */
  async rejectProposal(
    proposalId: string, 
    reviewerId: 'personA' | 'personB',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const proposals = await this.loadProposals();
      const proposalIndex = proposals.findIndex(p => p.id === proposalId);
      
      if (proposalIndex === -1) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposal = proposals[proposalIndex];
      
      // Validate the reviewer can reject this proposal
      if (proposal.createdBy === reviewerId) {
        return { success: false, error: 'Cannot reject your own proposal' };
      }

      if (proposal.status !== 'pending') {
        return { success: false, error: 'Proposal is no longer pending' };
      }

      // Reject the proposal
      proposals[proposalIndex] = {
        ...proposal,
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewerId,
        rejectionReason: reason
      };

      await this.saveProposals(proposals);
      return { success: true };

    } catch (error) {
      console.error('Error rejecting proposal:', error);
      return { success: false, error: 'Failed to reject proposal' };
    }
  }

  /**
   * Withdraw a proposal (by the creator)
   */
  async withdrawProposal(
    proposalId: string, 
    creatorId: 'personA' | 'personB'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const proposals = await this.loadProposals();
      const proposalIndex = proposals.findIndex(p => p.id === proposalId);
      
      if (proposalIndex === -1) {
        return { success: false, error: 'Proposal not found' };
      }

      const proposal = proposals[proposalIndex];
      
      if (proposal.createdBy !== creatorId) {
        return { success: false, error: 'Can only withdraw your own proposals' };
      }

      if (proposal.status !== 'pending') {
        return { success: false, error: 'Can only withdraw pending proposals' };
      }

      // Withdraw the proposal
      proposals[proposalIndex] = {
        ...proposal,
        status: 'withdrawn',
        reviewedAt: new Date().toISOString(),
        reviewedBy: creatorId
      };

      await this.saveProposals(proposals);
      return { success: true };

    } catch (error) {
      console.error('Error withdrawing proposal:', error);
      return { success: false, error: 'Failed to withdraw proposal' };
    }
  }

  /**
   * Clean up expired proposals
   */
  async cleanupExpiredProposals(): Promise<number> {
    try {
      const proposals = await this.loadProposals();
      let expiredCount = 0;

      const updatedProposals = proposals.map(proposal => {
        if (proposal.status === 'pending' && this.isExpired(proposal)) {
          expiredCount++;
          return { ...proposal, status: 'expired' as const };
        }
        return proposal;
      });

      if (expiredCount > 0) {
        await this.saveProposals(updatedProposals);
      }

      return expiredCount;
    } catch (error) {
      console.error('Error cleaning up expired proposals:', error);
      return 0;
    }
  }

  /**
   * Get proposal statistics
   */
  async getProposalStats(): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
    withdrawn: number;
  }> {
    const proposals = await this.loadProposals();
    
    return {
      total: proposals.length,
      pending: proposals.filter(p => p.status === 'pending').length,
      accepted: proposals.filter(p => p.status === 'accepted').length,
      rejected: proposals.filter(p => p.status === 'rejected').length,
      expired: proposals.filter(p => p.status === 'expired').length,
      withdrawn: proposals.filter(p => p.status === 'withdrawn').length,
    };
  }

  /**
   * Private helper methods
   */
  private async loadProposals(): Promise<ScheduleProposal[]> {
    try {
      if (this.isBrowser()) {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
      } else {
        // Server-side fallback - return empty array or server storage
        return this.serverProposals;
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      return [];
    }
  }

  private async saveProposals(proposals: ScheduleProposal[]): Promise<void> {
    try {
      if (this.isBrowser()) {
        localStorage.setItem(this.storageKey, JSON.stringify(proposals));
      } else {
        // Server-side fallback
        this.serverProposals = proposals;
      }
    } catch (error) {
      console.error('Error saving proposals:', error);
      throw error;
    }
  }

  private async saveProposal(proposal: ScheduleProposal): Promise<void> {
    const proposals = await this.loadProposals();
    proposals.push(proposal);
    await this.saveProposals(proposals);
  }

  private isReviewer(proposal: ScheduleProposal, userId: 'personA' | 'personB'): boolean {
    // User is a reviewer if they didn't create the proposal
    return proposal.createdBy !== userId;
  }

  private isExpired(proposal: ScheduleProposal): boolean {
    return new Date(proposal.expiresAt) < new Date();
  }
} 