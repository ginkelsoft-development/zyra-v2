import { NextRequest, NextResponse } from 'next/server';
import { getAllServiceCategories, getServiceCategory } from '@/lib/services/serviceCategories';
import { getServiceCategoryManager } from '@/lib/services/serviceCategoryManager';

// GET - Get all service categories or a specific category configuration
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const projectPath = searchParams.get('projectPath');

    // If requesting a specific category configuration for a project
    if (categoryId && projectPath) {
      const manager = getServiceCategoryManager();
      const config = await manager.getCategoryConfigAsync(projectPath, categoryId);
      const category = getServiceCategory(categoryId);

      if (!category) {
        return NextResponse.json(
          { error: 'Service category not found' },
          { status: 404 }
        );
      }

      // Check if all required vars are configured
      const requiredVars = category.configVariables.filter(v => v.required);
      const configValues = config?.configValues || {};
      const missingVars = requiredVars.filter(v => !configValues[v.key]).map(v => v.label);
      const isConfigured = missingVars.length === 0;

      return NextResponse.json({
        category,
        config: configValues,
        isConfigured,
        missingVars,
      });
    }

    // If requesting all configurations for a project
    if (projectPath) {
      const manager = getServiceCategoryManager();
      const configs = await manager.getAllCategoryConfigsAsync(projectPath);

      return NextResponse.json({
        categories: getAllServiceCategories(),
        configs,
      });
    }

    // Default: return all available service categories
    return NextResponse.json({
      categories: getAllServiceCategories(),
    });
  } catch (error: any) {
    console.error('Error fetching service categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service categories', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Save category configuration for a project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, projectPath, configValues } = body;

    if (!categoryId || !projectPath || !configValues) {
      return NextResponse.json(
        { error: 'Missing required fields: categoryId, projectPath, configValues' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = getServiceCategory(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: 'Service category not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const requiredVars = category.configVariables.filter(v => v.required);
    const missingVars = requiredVars.filter(v => !configValues[v.key]);

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required configuration values',
          missingVars: missingVars.map(v => v.label),
        },
        { status: 400 }
      );
    }

    // Save configuration
    const manager = getServiceCategoryManager();
    const savedConfig = await manager.saveCategoryConfigAsync(projectPath, categoryId, configValues);

    return NextResponse.json({
      success: true,
      config: savedConfig,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving service category configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete category configuration for a project
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const projectPath = searchParams.get('projectPath');

    if (!categoryId || !projectPath) {
      return NextResponse.json(
        { error: 'Missing required parameters: categoryId, projectPath' },
        { status: 400 }
      );
    }

    const manager = getServiceCategoryManager();
    const deleted = manager.deleteCategoryConfig(projectPath, categoryId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting service category configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration', details: error.message },
      { status: 500 }
    );
  }
}
