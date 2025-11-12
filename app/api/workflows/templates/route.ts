import { NextResponse } from 'next/server';
import { workflowManager } from '@/lib/services/workflowManager';

export async function GET() {
  try {
    const templates = workflowManager.getWorkflowTemplates();

    return NextResponse.json({
      templates,
      count: templates.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load workflow templates' },
      { status: 500 }
    );
  }
}
