import { NextRequest, NextResponse } from 'next/server';
import { getServiceCategoryManager } from '@/lib/services/serviceCategoryManager';

/**
 * Map category config keys to service config keys
 * Category uses camelCase (webhookUrl), services use snake_case (webhook_url)
 */
function mapCategoryToServiceConfig(
  categoryId: string,
  categoryConfig: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};

  // Mapping rules for different categories
  const keyMappings: Record<string, Record<string, string>> = {
    slack: {
      webhookUrl: 'webhook_url',
      defaultChannel: 'default_channel',
      botName: 'bot_name',
    },
    github: {
      owner: 'owner',
      repo: 'repo',
      defaultBranch: 'default_branch',
      githubToken: 'github_token',
    },
    email: {
      smtpHost: 'smtp_host',
      smtpPort: 'smtp_port',
      smtpUser: 'smtp_user',
      smtpPassword: 'smtp_password',
      fromEmail: 'from_email',
      fromName: 'from_name',
    },
  };

  const mapping = keyMappings[categoryId];
  if (!mapping) {
    // No mapping defined, return as-is
    return categoryConfig;
  }

  // Map keys from category format to service format
  for (const [categoryKey, serviceKey] of Object.entries(mapping)) {
    if (categoryConfig[categoryKey]) {
      mapped[serviceKey] = categoryConfig[categoryKey];
    }
  }

  return mapped;
}

/**
 * Determine which category a service belongs to based on its ID
 */
function getServiceCategoryId(serviceId: string): string | null {
  // Map service IDs to their categories
  const serviceToCategoryMap: Record<string, string> = {
    'service-slack': 'slack',
    'service-email': 'email',
    'service-teams': 'slack', // Teams might use similar config
    'service-discord': 'slack', // Discord might use similar config
    'service-github-issues': 'github',
    'service-github-branch': 'github',
    'service-github-commit': 'github',
    'service-github-pr': 'github',
    'service-github-issue-updater': 'github',
  };

  return serviceToCategoryMap[serviceId] || null;
}

// GET /api/service-categories/[serviceId]/config
// Get category configuration for a service
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath query parameter is required' },
        { status: 400 }
      );
    }

    const serviceId = params.serviceId;

    // Determine which category this service belongs to
    const categoryId = getServiceCategoryId(serviceId);

    if (!categoryId) {
      // Service doesn't belong to a category, return empty config
      return NextResponse.json({ configValues: {} });
    }

    // Get category configuration
    const categoryManager = getServiceCategoryManager();
    const categoryConfig = await categoryManager.getCategoryConfigAsync(projectPath, categoryId);

    if (!categoryConfig) {
      // No category config found
      return NextResponse.json({ configValues: {} });
    }

    // Map category keys to service keys
    const mappedConfig = mapCategoryToServiceConfig(categoryId, categoryConfig.configValues);

    return NextResponse.json({
      categoryId,
      configValues: mappedConfig,
    });
  } catch (error: any) {
    console.error('Error loading service category config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load category config' },
      { status: 500 }
    );
  }
}
