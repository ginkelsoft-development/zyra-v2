import { NextRequest, NextResponse } from 'next/server';
import { agentManager } from '@/lib/services/agentManager';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();

    // Handle both with and without "builtin-" prefix for backward compatibility
    let agentId = params.id;

    // Check if agent exists with current ID
    let agent = await prisma.customAgent.findUnique({
      where: { id: agentId },
    });

    // If not found and ID doesn't start with "builtin-", try with prefix
    if (!agent && !agentId.startsWith('builtin-')) {
      agentId = `builtin-${params.id}`;
      agent = await prisma.customAgent.findUnique({
        where: { id: agentId },
      });
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const updatedAgent = await agentManager.updateAgent(agentId, updates);

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
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
    // Handle both with and without "builtin-" prefix for backward compatibility
    let agentId = params.id;

    // First try with the ID as-is
    let agent = await prisma.customAgent.findUnique({
      where: { id: agentId },
    });

    // If not found and ID doesn't start with "builtin-", try with prefix
    if (!agent && !agentId.startsWith('builtin-')) {
      agentId = `builtin-${params.id}`;
      agent = await prisma.customAgent.findUnique({
        where: { id: agentId },
      });
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent is used in any workflows
    const workflowNodes = await prisma.workflowNode.findMany({
      where: {
        agentId: agentId,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            projectPath: true,
          },
        },
      },
    });

    if (workflowNodes.length > 0) {
      // Agent is in use, cannot delete
      const workflowNames = workflowNodes
        .map(node => node.workflow.name)
        .filter((name, index, self) => self.indexOf(name) === index) // unique names
        .join(', ');

      return NextResponse.json(
        {
          error: `Cannot delete agent. It is currently used in ${workflowNodes.length} workflow node(s) across the following workflow(s): ${workflowNames}`,
          workflowsUsing: workflowNodes.map(node => ({
            workflowId: node.workflow.id,
            workflowName: node.workflow.name,
            projectPath: node.workflow.projectPath,
          })),
        },
        { status: 409 } // Conflict
      );
    }

    // Agent is not in use, safe to delete
    await agentManager.deleteAgent(agentId);

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
      wasBuiltIn: agent.isBuiltIn
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
