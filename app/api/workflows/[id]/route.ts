import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/services/workflowManager';

// Get single workflow
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflow = await workflowManager.loadWorkflow(params.id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load workflow' },
      { status: 500 }
    );
  }
}

// Update workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const workflow = await workflowManager.loadWorkflow(params.id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Update workflow with new data
    const updatedWorkflow = {
      ...workflow,
      nodes: updates.nodes || workflow.nodes,
      edges: updates.edges || workflow.edges,
      customPrompts: updates.customPrompts || workflow.customPrompts,
      updatedAt: new Date().toISOString(),
    };

    await workflowManager.saveWorkflow(updatedWorkflow);

    return NextResponse.json({
      success: true,
      message: 'Workflow updated successfully',
      workflow: updatedWorkflow,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// Delete workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await workflowManager.deleteWorkflow(params.id);

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
