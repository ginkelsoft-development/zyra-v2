import { NextRequest, NextResponse } from 'next/server';
import { getServiceCategoryManager } from '@/lib/services/serviceCategoryManager';
import { prisma } from '@/lib/db/prisma';
import * as path from 'path';

const serviceCategoryManager = getServiceCategoryManager();

// GET /api/projects/[path]/services/[serviceId]/config
// Supports both legacy (serviceId only) and new (nodeId) modes
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string; serviceId: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const serviceId = params.serviceId;

    // Check if nodeId is provided in query parameters (new mode)
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');

    // Normalize path
    const normalizedPath = projectPath.startsWith('~/')
      ? path.join(process.env.HOME || '', projectPath.slice(2))
      : projectPath;

    if (nodeId) {
      // Node-specific config - load from ServiceConfig table
      const config = await prisma.serviceConfig.findUnique({
        where: {
          projectPath_nodeId: {
            projectPath: normalizedPath,
            nodeId,
          },
        },
      });

      if (config) {
        return NextResponse.json({ configValues: config.configValues });
      } else {
        return NextResponse.json({ configValues: {} });
      }
    } else {
      // Legacy: service-level config stored as category config
      const config = await serviceCategoryManager.getCategoryConfigAsync(projectPath, serviceId);

      if (config) {
        return NextResponse.json({ configValues: config.configValues });
      } else {
        return NextResponse.json({ configValues: {} });
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load service config' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[path]/services/[serviceId]/config
// Supports both legacy (serviceId only) and new (nodeId) modes
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string; serviceId: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const serviceId = params.serviceId;
    const { configValues, nodeId } = await request.json();

    // Debug logging
    console.log('[API ServiceConfig POST] Request:', {
      projectPath,
      serviceId,
      nodeId: nodeId || 'NOT PROVIDED',
      hasNodeId: !!nodeId,
      configKeys: Object.keys(configValues || {})
    });

    // Normalize path
    const normalizedPath = projectPath.startsWith('~/')
      ? path.join(process.env.HOME || '', projectPath.slice(2))
      : projectPath;

    if (nodeId) {
      // Node-specific config - save to ServiceConfig table
      // Ensure project exists
      await prisma.project.upsert({
        where: { path: normalizedPath },
        update: {},
        create: {
          name: path.basename(normalizedPath),
          path: normalizedPath,
        },
      });

      // Upsert service config
      await prisma.serviceConfig.upsert({
        where: {
          projectPath_nodeId: {
            projectPath: normalizedPath,
            nodeId,
          },
        },
        update: {
          configValues,
        },
        create: {
          projectPath: normalizedPath,
          nodeId,
          serviceId,
          configValues,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Node-specific service configuration saved successfully',
      });
    } else {
      // Legacy: service-level config stored as category config
      await serviceCategoryManager.saveCategoryConfigAsync(
        projectPath,
        serviceId,
        configValues
      );

      return NextResponse.json({
        success: true,
        message: 'Service configuration saved successfully',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save service config' },
      { status: 500 }
    );
  }
}
