import { NextRequest, NextResponse } from 'next/server';
import { AIRebalanceService } from '@/lib/services/aiRebalanceService';
import type { AIRebalanceRequest } from '@/lib/services/aiRebalanceService';

export async function POST(request: NextRequest) {
  try {
    const rebalanceRequest: AIRebalanceRequest = await request.json();
    
    // Validate required fields
    if (!rebalanceRequest.currentSchedule || !rebalanceRequest.unavailableDate || !rebalanceRequest.unavailablePerson) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const aiRebalanceService = new AIRebalanceService();
    const result = await aiRebalanceService.proposeRebalance(rebalanceRequest);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI rebalance API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        explanation: 'AI scheduling service temporarily unavailable.',
        summary: {
          changesCount: 0,
          handoffReduction: 0,
          fairnessScore: 5,
          reasoning: 'Service error'
        },
        fallbackUsed: true
      },
      { status: 500 }
    );
  }
} 