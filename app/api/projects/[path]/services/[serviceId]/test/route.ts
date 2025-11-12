import { NextRequest, NextResponse } from 'next/server';
import { serviceManager } from '@/lib/services/serviceManager';

// POST /api/projects/[path]/services/[serviceId]/test
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string; serviceId: string } }
) {
  try {
    const projectPath = decodeURIComponent(params.path);
    const serviceId = params.serviceId;
    const { configValues } = await request.json();

    // Get service definition
    const services = await serviceManager.getAllServices();
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Validate required config values
    const missingRequired = service.configVariables
      .filter(v => v.required)
      .filter(v => !configValues[v.key] || configValues[v.key].trim() === '')
      .map(v => v.label);

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required configuration: ${missingRequired.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Route to appropriate test handler based on service type/category
    const testResult = await testService(service, configValues);

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: testResult.message,
      });
    } else {
      return NextResponse.json(
        { error: testResult.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to test service' },
      { status: 500 }
    );
  }
}

// Test service based on its type and configuration
async function testService(
  service: any,
  configValues: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    switch (service.category) {
      case 'notifications':
        return await testNotificationService(service, configValues);

      case 'deployment':
        return await testDeploymentService(service, configValues);

      case 'external-apis':
        return await testExternalApiService(service, configValues);

      case 'version-control':
        return await testVersionControlService(service, configValues);

      default:
        return {
          success: true,
          message: `Service configuration validated successfully. Service type: ${service.type}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Service test failed',
    };
  }
}

// Test notification services (Slack, Email, Teams, Discord, SMS)
async function testNotificationService(
  service: any,
  configValues: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const serviceType = service.type;
  const testMessage = 'Test notification from Zyra v2.0 - AI Workflow Orchestrator';

  try {
    switch (serviceType) {
      case 'slack-notifier':
        const slackWebhook = configValues['webhook_url'];
        const slackChannel = configValues['default_channel'] || '#general';

        console.log('🔔 Testing Slack webhook:', slackWebhook);
        console.log('🔔 Slack channel:', slackChannel);
        console.log('🔔 Test message:', testMessage);

        const slackPayload = {
          channel: slackChannel,
          text: testMessage,
          username: 'Zyra Test',
          icon_emoji: ':robot_face:',
        };

        console.log('🔔 Slack payload:', JSON.stringify(slackPayload, null, 2));

        const slackResponse = await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });

        console.log('🔔 Slack response status:', slackResponse.status);
        const responseText = await slackResponse.text();
        console.log('🔔 Slack response body:', responseText);

        if (!slackResponse.ok) {
          throw new Error(`Slack API returned ${slackResponse.status}: ${responseText}`);
        }

        return {
          success: true,
          message: `Test notification sent successfully to Slack channel ${slackChannel}. Response: ${responseText}`,
        };

      case 'email-notifier':
        const smtpHost = configValues['smtpHost'];
        const smtpPort = configValues['smtpPort'];
        const smtpUser = configValues['smtpUser'];
        const recipientEmail = configValues['recipientEmail'];

        // For email, we just validate the configuration
        if (!smtpHost || !smtpPort || !smtpUser || !recipientEmail) {
          throw new Error('Missing required email configuration');
        }

        return {
          success: true,
          message: `Email configuration validated. Server: ${smtpHost}:${smtpPort}, Recipient: ${recipientEmail}`,
        };

      case 'teams-notifier':
        const teamsWebhook = configValues['teamsWebhookUrl'];

        const teamsResponse = await fetch(teamsWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: 'Test Notification',
            themeColor: '7B68EE',
            title: 'Zyra Test',
            text: testMessage,
          }),
        });

        if (!teamsResponse.ok) {
          throw new Error(`Teams API returned ${teamsResponse.status}`);
        }

        return {
          success: true,
          message: 'Test notification sent successfully to Microsoft Teams',
        };

      case 'discord-notifier':
        const discordWebhook = configValues['discordWebhookUrl'];

        const discordResponse = await fetch(discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: testMessage,
            username: 'Zyra Test',
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
          }),
        });

        if (!discordResponse.ok) {
          throw new Error(`Discord API returned ${discordResponse.status}`);
        }

        return {
          success: true,
          message: 'Test notification sent successfully to Discord',
        };

      case 'sms-notifier':
        const twilioAccountSid = configValues['twilioAccountSid'];
        const twilioAuthToken = configValues['twilioAuthToken'];
        const twilioPhoneNumber = configValues['twilioPhoneNumber'];
        const recipientPhone = configValues['recipientPhoneNumber'];

        // For SMS, we validate configuration without sending actual SMS
        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !recipientPhone) {
          throw new Error('Missing required Twilio configuration');
        }

        return {
          success: true,
          message: `SMS configuration validated. From: ${twilioPhoneNumber}, To: ${recipientPhone}`,
        };

      default:
        return {
          success: true,
          message: 'Notification service configuration validated',
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to test notification service',
    };
  }
}

// Test deployment services (Envoyer, GitHub Actions, etc.)
async function testDeploymentService(
  service: any,
  configValues: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const serviceType = service.type;

  try {
    switch (serviceType) {
      case 'envoyer-deployer':
        const envoyerApiToken = configValues['envoyerApiToken'];
        const envoyerProjectId = configValues['envoyerProjectId'];

        // Test Envoyer API connection
        const envoyerResponse = await fetch(`https://envoyer.io/api/projects/${envoyerProjectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${envoyerApiToken}`,
            'Accept': 'application/json',
          },
        });

        if (!envoyerResponse.ok) {
          throw new Error(`Envoyer API returned ${envoyerResponse.status}: Unable to access project`);
        }

        const projectData = await envoyerResponse.json();

        return {
          success: true,
          message: `Successfully connected to Envoyer project: ${projectData.name || envoyerProjectId}`,
        };

      case 'github-actions':
        const githubToken = configValues['githubToken'];
        const githubRepo = configValues['githubRepo'];

        // Test GitHub API connection
        const githubResponse = await fetch(`https://api.github.com/repos/${githubRepo}`, {
          method: 'GET',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (!githubResponse.ok) {
          throw new Error(`GitHub API returned ${githubResponse.status}: Unable to access repository`);
        }

        const repoData = await githubResponse.json();

        return {
          success: true,
          message: `Successfully connected to GitHub repository: ${repoData.full_name}`,
        };

      default:
        return {
          success: true,
          message: 'Deployment service configuration validated',
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to test deployment service',
    };
  }
}

// Test external API services
async function testExternalApiService(
  service: any,
  configValues: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const apiKey = configValues['apiKey'];
    const apiEndpoint = configValues['apiEndpoint'];

    if (!apiKey || !apiEndpoint) {
      throw new Error('Missing required API configuration');
    }

    return {
      success: true,
      message: `API configuration validated. Endpoint: ${apiEndpoint}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to validate API service',
    };
  }
}

// Test version control services
async function testVersionControlService(
  service: any,
  configValues: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const token = configValues['token'] || configValues['accessToken'];
    const repo = configValues['repository'] || configValues['repo'];

    if (!token || !repo) {
      throw new Error('Missing required version control configuration');
    }

    return {
      success: true,
      message: `Version control configuration validated. Repository: ${repo}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to validate version control service',
    };
  }
}
