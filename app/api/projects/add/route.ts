import { NextRequest, NextResponse } from 'next/server';
import { projectAnalyzer } from '@/lib/services/projectAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const { sourcePath } = await request.json();

    if (!sourcePath) {
      return NextResponse.json(
        { error: 'Source path is required' },
        { status: 400 }
      );
    }

    const project = await projectAnalyzer.addProject(sourcePath);

    return NextResponse.json({
      success: true,
      project,
      message: `Project ${project.name} added successfully`
    });
  } catch (error: any) {
    console.error('Add project error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add project' },
      { status: 500 }
    );
  }
}
