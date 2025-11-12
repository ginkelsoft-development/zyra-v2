import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/services/workflowManager';

// GET /api/workflows/default?projectPath=xxx - Get default workflow for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    const defaultWorkflow = await workflowManager.getDefaultWorkflow(projectPath);

    return NextResponse.json({
      workflow: defaultWorkflow,
    });
  } catch (error: any) {
    console.error('Get default workflow error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get default workflow' },
      { status: 500 }
    );
  }
}

// POST /api/workflows/default - Set a workflow as default
export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }

    await workflowManager.setDefaultWorkflow(workflowId);

    return NextResponse.json({
      success: true,
      message: 'Default workflow set successfully',
    });
  } catch (error: any) {
    console.error('Set default workflow error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set default workflow' },
      { status: 500 }
    );
  }
}
