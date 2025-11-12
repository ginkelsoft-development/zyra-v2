import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/services/workflowManager';

// Get workflows for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    const workflows = await workflowManager.loadWorkflowsForProject(projectPath);

    return NextResponse.json({ workflows });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load workflows' },
      { status: 500 }
    );
  }
}

// Create/Save workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, projectPath, nodes, edges, triggers, enabled, customPrompts } = body;

    if (!name || !projectPath || !nodes) {
      return NextResponse.json(
        { error: 'Name, project path, and nodes are required' },
        { status: 400 }
      );
    }

    const workflow = await workflowManager.saveWorkflow({
      name,
      description,
      projectPath,
      nodes,
      edges: edges || [],
      triggers: triggers || [],
      enabled: enabled !== undefined ? enabled : true,
      customPrompts: customPrompts || {},
    });

    return NextResponse.json({
      success: true,
      workflow,
      message: 'Workflow saved successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save workflow' },
      { status: 500 }
    );
  }
}
