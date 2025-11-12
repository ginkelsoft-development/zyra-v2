import { NextRequest, NextResponse } from 'next/server';
import { agentManager } from '@/lib/services/agentManager';

export async function GET() {
  try {
    const templates = agentManager.getAgentTemplates();
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { templateName, name, variables } = await request.json();

    if (!templateName || !name) {
      return NextResponse.json(
        { error: 'Template name and agent name are required' },
        { status: 400 }
      );
    }

    const agent = await agentManager.createFromTemplate(templateName, {
      name,
      variables,
    });

    return NextResponse.json({
      success: true,
      agent,
      message: 'Agent created from template successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create agent from template' },
      { status: 500 }
    );
  }
}
