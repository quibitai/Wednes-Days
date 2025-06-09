import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai/services/aiService';
import type { ScheduleChange } from '@/types';
import type { ScheduleProposal } from '@/lib/ai/types';
import { v4 as uuidv4 } from 'uuid';

const aiService = new AIService();

export async function POST(request: NextRequest) {
  try {
    const { changes, userType, currentSchedule } = await request.json();

    // Validate input
    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: 'Changes array is required' },
        { status: 400 }
      );
    }

    if (!userType || !['personA', 'personB'].includes(userType)) {
      return NextResponse.json(
        { error: 'Valid userType is required (personA or personB)' },
        { status: 400 }
      );
    }

    // Create a simplified ScheduleProposal from the changes for explanation
    const unavailableDates = changes
      .filter((change: ScheduleChange) => change.reason === 'unavailable')
      .map((change: ScheduleChange) => change.date);

    const mockProposal: ScheduleProposal = {
      id: uuidv4(),
      createdBy: userType,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      title: `Schedule changes for ${changes.length} day${changes.length > 1 ? 's' : ''}`,
      message: `Auto-generated changes based on unavailability and rebalancing`,
      unavailableDates,
      originalSchedule: currentSchedule || {},
      proposedSchedule: {},
      affectedDateRange: {
        start: changes[0]?.date || new Date().toISOString().split('T')[0],
        end: changes[changes.length - 1]?.date || new Date().toISOString().split('T')[0]
      },
      handoffReduction: { before: 0, after: 0, improvement: 0 },
      fairnessImpact: { personA: 50, personB: 50, acceptable: true },
      aiConfidence: 0.8
    };

    // Generate explanation for the changes
    const result = await aiService.generateExplanation(mockProposal, 'simple');

    // Return the result
    return NextResponse.json({
      success: result.success,
      explanation: result.explanation || `These changes help maintain a fair schedule while respecting unavailable days. ${changes.length} day${changes.length > 1 ? 's' : ''} ${changes.length > 1 ? 'have' : 'has'} been adjusted.`,
      error: result.error
    });

  } catch (error) {
    console.error('Error in AI explain endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return service status
  try {
    const stats = aiService.getServiceStats();
    return NextResponse.json({
      service: 'AI Explain Endpoint',
      status: stats.available ? 'ready' : 'unavailable',
      features: stats.available ? ['change-explanations'] : null,
      reason: stats.available ? undefined : stats.reason
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
} 