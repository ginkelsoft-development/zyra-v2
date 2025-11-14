import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { name, path: projectPath } = await request.json();

    if (!name || !projectPath) {
      return NextResponse.json(
        { error: 'Name and path are required' },
        { status: 400 }
      );
    }

    // Normalize the path
    const normalizedPath = projectPath.startsWith('~/')
      ? path.join(process.env.HOME || '', projectPath.slice(2))
      : projectPath;

    // Check if project already exists in database
    const existingProject = await prisma.project.findUnique({
      where: { path: normalizedPath },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'A project already exists at this path' },
        { status: 409 }
      );
    }

    // Create the project in database
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        path: normalizedPath,
      },
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        path: project.path,
      },
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
