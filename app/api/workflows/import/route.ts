import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/services/workflowManager';

export async function POST(request: NextRequest) {
  try {
    const { workflowData, projectPath } = await request.json();

    if (!workflowData || !projectPath) {
      return NextResponse.json(
        { error: 'Workflow data and project path are required' },
        { status: 400 }
      );
    }

    // Validate workflow data structure
    if (!workflowData.workflow || !workflowData.version) {
      return NextResponse.json(
        { error: 'Invalid workflow data format' },
        { status: 400 }
      );
    }

    const workflow = workflowData.workflow;

    // Generate new workflow ID to avoid conflicts
    const newWorkflowId = `workflow-${Date.now()}`;

    // Save imported workflow with new ID
    const savedWorkflow = await workflowManager.saveWorkflow(
      projectPath,
      {
        ...workflow,
        id: newWorkflowId,
        name: workflow.name || 'Imported Workflow',
        lastModified: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      message: 'Workflow imported successfully',
      workflow: savedWorkflow,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to import workflow' },
      { status: 500 }
    );
  }
}
