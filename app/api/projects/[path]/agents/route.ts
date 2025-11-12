import { NextRequest, NextResponse } from 'next/server';
import { projectManager } from '@/lib/services/projectManager';

// Get all agents for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const agents = await projectManager.getProjectAgents(projectPath);

    return NextResponse.json({ agents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load project agents' },
      { status: 500 }
    );
  }
}

// Add agent to project
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    await projectManager.addAgentToProject(projectPath, agentId);

    return NextResponse.json({
      success: true,
      message: 'Agent added to project',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add agent to project' },
      { status: 500 }
    );
  }
}

// Remove agent from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    await projectManager.removeAgentFromProject(projectPath, agentId);

    return NextResponse.json({
      success: true,
      message: 'Agent removed from project',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to remove agent from project' },
      { status: 500 }
    );
  }
}
