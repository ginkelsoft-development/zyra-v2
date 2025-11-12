import { NextRequest, NextResponse } from 'next/server';
import { executionHistoryManager } from '@/lib/services/executionHistoryManager';

export async function GET(request: NextRequest) {
  try {
    const statistics = await executionHistoryManager.getStatistics();
    return NextResponse.json({ statistics });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load execution statistics' },
      { status: 500 }
    );
  }
}
