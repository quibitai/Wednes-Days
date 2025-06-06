import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai/services/aiService';
import { ProposalService } from '@/lib/ai/services/proposalService';

const aiService = new AIService();
const proposalService = new ProposalService();

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'create':
        return await handleCreateProposal(data);
      case 'accept':
        return await handleAcceptProposal(data);
      case 'reject':
        return await handleRejectProposal(data);
      case 'withdraw':
        return await handleWithdrawProposal(data);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in proposals endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') as 'personA' | 'personB' | null;
    const status = searchParams.get('status');

    if (status === 'pending' && userId) {
      const proposals = await proposalService.getPendingProposals(userId);
      return NextResponse.json({ proposals });
    }

    if (status === 'stats') {
      const stats = await proposalService.getProposalStats();
      return NextResponse.json({ stats });
    }

    const proposals = await proposalService.getProposals(userId || undefined);
    return NextResponse.json({ proposals });

  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCreateProposal(data: any) {
  const { unavailableDates, currentSchedule, userId, reason, preferences } = data;

  // Validate required fields
  if (!unavailableDates || !Array.isArray(unavailableDates)) {
    return NextResponse.json(
      { error: 'unavailableDates array is required' },
      { status: 400 }
    );
  }

  if (!currentSchedule || typeof currentSchedule !== 'object') {
    return NextResponse.json(
      { error: 'currentSchedule object is required' },
      { status: 400 }
    );
  }

  if (!userId || !['personA', 'personB'].includes(userId)) {
    return NextResponse.json(
      { error: 'Valid userId is required' },
      { status: 400 }
    );
  }

  try {
    // Generate the proposal using AI service
    const result = await aiService.generateScheduleProposal(
      unavailableDates,
      currentSchedule,
      userId,
      reason || '',
      preferences || {}
    );

    if (!result.success || !result.proposal) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate proposal' },
        { status: 400 }
      );
    }

    // Save the proposal using the proposal service
    const savedProposal = await proposalService.createProposal({
      createdBy: result.proposal.createdBy,
      status: result.proposal.status,
      title: result.proposal.title,
      message: reason || result.proposal.message,
      unavailableDates: result.proposal.unavailableDates,
      originalSchedule: result.proposal.originalSchedule,
      proposedSchedule: result.proposal.proposedSchedule,
      affectedDateRange: result.proposal.affectedDateRange,
      handoffReduction: result.proposal.handoffReduction,
      fairnessImpact: result.proposal.fairnessImpact,
      aiConfidence: result.proposal.aiConfidence
    });

    return NextResponse.json({
      success: true,
      proposal: savedProposal
    });

  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}

async function handleAcceptProposal(data: any) {
  const { proposalId, reviewerId } = data;

  if (!proposalId || !reviewerId) {
    return NextResponse.json(
      { error: 'proposalId and reviewerId are required' },
      { status: 400 }
    );
  }

  const result = await proposalService.acceptProposal(proposalId, reviewerId);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

async function handleRejectProposal(data: any) {
  const { proposalId, reviewerId, reason } = data;

  if (!proposalId || !reviewerId) {
    return NextResponse.json(
      { error: 'proposalId and reviewerId are required' },
      { status: 400 }
    );
  }

  const result = await proposalService.rejectProposal(proposalId, reviewerId, reason);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

async function handleWithdrawProposal(data: any) {
  const { proposalId, creatorId } = data;

  if (!proposalId || !creatorId) {
    return NextResponse.json(
      { error: 'proposalId and creatorId are required' },
      { status: 400 }
    );
  }

  const result = await proposalService.withdrawProposal(proposalId, creatorId);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
} 