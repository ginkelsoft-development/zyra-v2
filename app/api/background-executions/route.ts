import { NextRequest, NextResponse } from 'next/server';
import { backgroundExecutionManager } from '@/lib/services/backgroundExecutionManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');

    if (id) {
      // Get specific execution
      const execution = backgroundExecutionManager.getExecution(id);
      if (!execution) {
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
      }
      return NextResponse.json({ execution });
    }

    // Get all or filtered executions
    let executions = backgroundExecutionManager.getAllExecutions();

    if (status === 'running') {
      executions = backgroundExecutionManager.getRunningExecutions();
    }

    return NextResponse.json({ executions });
  } catch (error: any) {
    console.error('Error fetching background executions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    backgroundExecutionManager.cancelExecution(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling execution:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel execution' },
      { status: 500 }
    );
  }
}
