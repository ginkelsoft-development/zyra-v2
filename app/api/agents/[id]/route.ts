import { NextRequest, NextResponse } from 'next/server';
import { agentManager } from '@/lib/services/agentManager';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const agent = await agentManager.updateAgent(params.id, updates);

    return NextResponse.json({
      success: true,
      agent,
      message: 'Agent updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await agentManager.deleteAgent(params.id);

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
