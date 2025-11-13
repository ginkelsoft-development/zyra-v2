import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/services/workflowManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    const workflow = await workflowManager.loadWorkflow(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Create export data
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workflow: {
        ...workflow,
        // Remove project-specific paths if needed
        projectPath: undefined,
      },
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="workflow-${workflowId}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to export workflow' },
      { status: 500 }
    );
  }
}
