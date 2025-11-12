import { NextRequest, NextResponse } from 'next/server';
import { executionHistoryManager } from '@/lib/services/executionHistoryManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const projectPath = searchParams.get('projectPath');
    const limit = searchParams.get('limit');

    let history;

    if (workflowId) {
      history = await executionHistoryManager.getWorkflowHistory(workflowId);
    } else if (projectPath) {
      history = await executionHistoryManager.getProjectHistory(projectPath);
    } else if (limit) {
      history = await executionHistoryManager.getRecentHistory(parseInt(limit));
    } else {
      history = await executionHistoryManager.loadHistory();
    }

    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load execution history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('id');

    if (executionId) {
      await executionHistoryManager.deleteExecution(executionId);
      return NextResponse.json({ message: 'Execution deleted successfully' });
    } else {
      // Clear all history
      await executionHistoryManager.clearHistory();
      return NextResponse.json({ message: 'All history cleared successfully' });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete execution history' },
      { status: 500 }
    );
  }
}
