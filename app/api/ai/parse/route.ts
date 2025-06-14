import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai/services/aiService';

const aiService = new AIService();

export async function POST(request: NextRequest) {
  console.log('AI Parse endpoint hit.'); // New log
  try {
    const { input, userId } = await request.json();
    console.log('Received NLP request:', { input, userId }); // New log

    // Validate input
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Input text is required' },
        { status: 400 }
      );
    }

    if (!userId || !['personA', 'personB'].includes(userId)) {
      return NextResponse.json(
        { error: 'Valid userId is required (personA or personB)' },
        { status: 400 }
      );
    }

    // Parse the natural language input
    const result = await aiService.parseNaturalLanguage(input, userId);
    console.log('Result from aiService.parseNaturalLanguage:', result); // New log

    // Return the result
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      interaction: {
        id: result.interaction.id,
        responseTimeMs: result.interaction.responseTimeMs,
        success: result.interaction.success
      }
    });

  } catch (error) {
    console.error('Error in AI parse endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error in AI parse endpoint.' }, // More specific error
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return service status
  try {
    const stats = aiService.getServiceStats();
    return NextResponse.json({
      service: 'AI Parse Endpoint',
      status: stats.available ? 'ready' : 'unavailable',
      features: stats.available ? stats.features : null,
      reason: stats.available ? undefined : stats.reason
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
} 