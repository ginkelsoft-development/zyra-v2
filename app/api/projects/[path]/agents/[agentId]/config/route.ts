import { NextRequest, NextResponse } from 'next/server';
import { projectManager } from '@/lib/services/projectManager';

// Get agent/node configuration for a project
// Supports both legacy (agentId only) and new (nodeId) modes
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string; agentId: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const agentId = params.agentId;

    // Check if nodeId is provided in query parameters (new mode)
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');

    // Use nodeId if provided, otherwise fall back to agentId (legacy mode)
    const configKey = nodeId || agentId;
    const config = await projectManager.getNodeConfig(projectPath, configKey);

    return NextResponse.json({ config: config || {} });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load agent configuration' },
      { status: 500 }
    );
  }
}

// Configure agent/node for a project
// Supports both legacy (agentId only) and new (nodeId) modes
export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string; agentId: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const agentId = params.agentId;
    const { configValues, nodeId } = await request.json();

    if (!configValues) {
      return NextResponse.json(
        { error: 'Configuration values are required' },
        { status: 400 }
      );
    }

    // Use nodeId if provided, otherwise use agentId for both (legacy mode)
    const configNodeId = nodeId || agentId;
    await projectManager.configureNode(projectPath, configNodeId, agentId, configValues);

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to configure agent' },
      { status: 500 }
    );
  }
}
