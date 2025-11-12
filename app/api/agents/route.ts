import { NextRequest, NextResponse } from 'next/server';
import { agentManager } from '@/lib/services/agentManager';

export async function GET() {
  try {
    const agents = await agentManager.getAllAgents();
    return NextResponse.json({ agents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const agent = await agentManager.createAgent(data);

    return NextResponse.json({
      success: true,
      agent,
      message: 'Agent created successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
