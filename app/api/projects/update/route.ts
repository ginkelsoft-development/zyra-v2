import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldPath, newPath, newName } = body;

    if (!oldPath) {
      return NextResponse.json(
        { error: 'Old project path is required' },
        { status: 400 }
      );
    }

    // Verify old path exists
    if (!fs.existsSync(oldPath)) {
      return NextResponse.json(
        { error: 'Project not found at old path' },
        { status: 404 }
      );
    }

    // If newPath is provided, move the project
    if (newPath && newPath !== oldPath) {
      // Ensure new path doesn't already exist
      if (fs.existsSync(newPath)) {
        return NextResponse.json(
          { error: 'A project already exists at the new path' },
          { status: 409 }
        );
      }

      // Create parent directory if needed
      const parentDir = path.dirname(newPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Move the project
      fs.renameSync(oldPath, newPath);

      // Update database if project exists
      try {
        await prisma.project.update({
          where: { path: oldPath },
          data: {
            path: newPath,
            name: newName || path.basename(newPath),
          },
        });
      } catch (dbError) {
        console.log('No database entry to update or error:', dbError);
      }

      return NextResponse.json({
        success: true,
        message: 'Project moved successfully',
        project: {
          path: newPath,
          name: newName || path.basename(newPath)
        }
      });
    }

    // If only name changed (rename within same directory)
    if (newName && newName !== path.basename(oldPath)) {
      const parentDir = path.dirname(oldPath);
      const newFullPath = path.join(parentDir, newName);

      if (fs.existsSync(newFullPath)) {
        return NextResponse.json(
          { error: 'A project with this name already exists in the directory' },
          { status: 409 }
        );
      }

      fs.renameSync(oldPath, newFullPath);

      // Update database if project exists
      try {
        await prisma.project.update({
          where: { path: oldPath },
          data: {
            path: newFullPath,
            name: newName,
          },
        });
      } catch (dbError) {
        console.log('No database entry to update or error:', dbError);
      }

      return NextResponse.json({
        success: true,
        message: 'Project renamed successfully',
        project: {
          path: newFullPath,
          name: newName
        }
      });
    }

    // If only the name in database needs updating (path stays the same)
    if (newName) {
      try {
        await prisma.project.update({
          where: { path: oldPath },
          data: { name: newName },
        });
      } catch (dbError) {
        console.log('No database entry to update or error:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      project: {
        path: oldPath,
        name: newName || path.basename(oldPath)
      }
    });

  } catch (error: any) {
    console.error('Project update error:', error);
    return NextResponse.json(
      { error: `Failed to update project: ${error.message}` },
      { status: 500 }
    );
  }
}
