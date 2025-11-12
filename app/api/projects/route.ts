import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { projectManager } from '@/lib/services/projectManager';

// Detect project type based on files in the directory
function detectProjectType(projectPath: string): string {
  try {
    if (!fs.existsSync(projectPath)) {
      return 'Unknown';
    }

    const files = fs.readdirSync(projectPath);

    // Check for Laravel
    if (files.includes('artisan') && files.includes('composer.json')) {
      return 'Laravel';
    }

    // Check for Next.js
    if (files.includes('next.config.js') || files.includes('next.config.mjs')) {
      return 'Next.js';
    }

    // Check for React (package.json with react dependency)
    if (files.includes('package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          return 'React';
        }
        // Generic Node.js project
        return 'Node.js';
      } catch {
        // Ignore
      }
    }

    // Check for PHP
    if (files.includes('composer.json')) {
      return 'PHP';
    }

    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export async function GET() {
  try {
    // Load projects from database
    const projectsData = await projectManager.loadProjects();

    const projects = projectsData.map((p) => ({
      name: p.name,
      path: p.path,
      type: detectProjectType(p.path)
    }));

    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list projects' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { projectPath, newName } = await request.json();

    if (!projectPath || !newName) {
      return NextResponse.json(
        { error: 'Project path and new name are required' },
        { status: 400 }
      );
    }

    // Get project from database
    const project = await projectManager.getProject(projectPath);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update project name in database
    await projectManager.saveProject({
      ...project,
      name: newName,
    });

    return NextResponse.json({
      success: true,
      message: 'Project name updated',
      project: { name: newName, path: projectPath }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { projectPath } = await request.json();

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await projectManager.getProject(projectPath);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project from database (cascades to all related data)
    await projectManager.deleteProject(projectPath);

    return NextResponse.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}
