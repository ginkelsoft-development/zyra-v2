import { NextRequest, NextResponse } from 'next/server';
import { projectAnalyzer } from '@/lib/services/projectAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const { name, type, description } = await request.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const project = await projectAnalyzer.createProject(name, type, description);

    return NextResponse.json({
      success: true,
      project,
      message: `Project ${name} created successfully`
    });
  } catch (error: any) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}
