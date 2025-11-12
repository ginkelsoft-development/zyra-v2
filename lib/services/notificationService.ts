/**
 * Notification Service
 * Handles sending notifications via various channels (Slack, Email, Teams, Discord, SMS)
 */

interface NotificationPayload {
  workflowName: string;
  projectPath: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results?: any[];
  error?: string;
  timestamp: string;
  message?: string;
  agentOutputs?: Array<{ nodeId: string; output: string; data: any }>;
}

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  configVariables?: any[];
  configValues?: Record<string, string>;
}

export class NotificationService {
  /**
   * Send notification based on agent type
   */
  async sendNotification(
    agentConfig: AgentConfig,
    payload: NotificationPayload,
    onOutput: (output: string) => void
  ): Promise<void> {
    try {
      onOutput(`📢 Preparing ${agentConfig.role} notification...`);

      // Get agent-specific configuration
      const config = agentConfig.configValues || {};

      // Route to appropriate notification handler based on agent role
      // Support both formats: "Slack Notifier" and "slack-notifier"
      const roleType = agentConfig.role.toLowerCase().replace(/\s+/g, '-');

      switch (roleType) {
        case 'slack-notifier':
          await this.sendSlackNotification(config, payload, onOutput);
          break;
        case 'email-notifier':
          await this.sendEmailNotification(config, payload, onOutput);
          break;
        case 'teams-notifier':
          await this.sendTeamsNotification(config, payload, onOutput);
          break;
        case 'discord-notifier':
          await this.sendDiscordNotification(config, payload, onOutput);
          break;
        case 'sms-notifier':
          await this.sendSMSNotification(config, payload, onOutput);
          break;
        default:
          throw new Error(`Unknown notification agent: ${agentConfig.role}`);
      }

      onOutput(`✅ Notification sent successfully via ${agentConfig.role}`);
    } catch (error: any) {
      onOutput(`❌ Failed to send notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    config: Record<string, string>,
    payload: NotificationPayload,
    onOutput: (output: string) => void
  ): Promise<void> {
    const webhookUrl = config.webhook_url;

    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    onOutput(`📤 Sending to Slack channel: ${config.default_channel || '#general'}`);

    // Format message for Slack
    const statusEmoji = this.getStatusEmoji(payload.status);
    const color = this.getStatusColor(payload.status);

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Workflow ${payload.status.toUpperCase()}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Workflow:*\n${payload.workflowName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${payload.status}`,
          },
          {
            type: 'mrkdwn',
            text: `*Project:*\n${payload.projectPath}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date(payload.timestamp).toLocaleString('nl-NL')}`,
          },
        ],
      },
    ];

    // Add agent outputs if available
    if (payload.message) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Results:*\n\`\`\`${payload.message}\`\`\``,
        },
      });
    }

    const slackMessage = {
      text: `${statusEmoji} Workflow: ${payload.workflowName}`,
      blocks,
      attachments: [
        {
          color: color,
          text: payload.error || `Workflow execution ${payload.status}`,
        },
      ],
    };

    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }

    onOutput(`✓ Message posted to Slack`);
  }

  /**
   * Send Email notification
   */
  private async sendEmailNotification(
    config: Record<string, string>,
    payload: NotificationPayload,
    onOutput: (output: string) => void
  ): Promise<void> {
    const toEmails = config.to_emails;

    if (!toEmails) {
      throw new Error('Email recipients not configured');
    }

    onOutput(`📧 Sending email to: ${toEmails}`);

    // For now, just simulate email sending
    // In production, you would use nodemailer or similar
    onOutput(`⚠️  Email functionality not yet implemented`);
    onOutput(`   Would send to: ${toEmails}`);
    onOutput(`   Subject: Workflow ${payload.status}: ${payload.workflowName}`);
    onOutput(`   Body: Workflow execution ${payload.status} at ${payload.timestamp}`);
  }

  /**
   * Send Teams notification
   */
  private async sendTeamsNotification(
    config: Record<string, string>,
    payload: NotificationPayload,
    onOutput: (output: string) => void
  ): Promise<void> {
    const webhookUrl = config.webhook_url;

    if (!webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    onOutput(`📤 Sending to Microsoft Teams`);

    const statusEmoji = this.getStatusEmoji(payload.status);
    const color = this.getStatusColor(payload.status);

    // Teams Adaptive Card format
    const teamsMessage = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Workflow ${payload.status}: ${payload.workflowName}`,
      themeColor: color.replace('#', ''),
      title: `${statusEmoji} Workflow ${payload.status.toUpperCase()}`,
      sections: [
        {
          facts: [
            {
              name: 'Workflow:',
              value: payload.workflowName,
            },
            {
              name: 'Status:',
              value: payload.status,
            },
            {
              name: 'Project:',
              value: payload.projectPath,
            },
            {
              name: 'Time:',
              value: new Date(payload.timestamp).toLocaleString('nl-NL'),
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teamsMessage),
    });

    if (!response.ok) {
      throw new Error(`Teams API error: ${response.status} ${response.statusText}`);
    }

    onOutput(`✓ Message posted to Teams`);
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(
    config: Record<string, string>,
    payload: NotificationPayload,
    onOutput: (output: string) => void
  ): Promise<void> {
    const webhookUrl = config.webhook_url;

    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    onOutput(`📤 Sending to Discord`);

    const statusEmoji = this.getStatusEmoji(payload.status);
    const color = parseInt(this.getStatusColor(payload.status).replace('#', ''), 16);

    const discordMessage = {
      content: `${statusEmoji} Workflow: ${payload.workflowName}`,
      embeds: [
        {
          title: `Workflow ${payload.status.toUpperCase()}`,
          color: color,
          fields: [
            {
              name: 'Workflow',
              value: payload.workflowName,
              inline: true,
            },
            {
              name: 'Status',
              value: payload.status,
              inline: true,
            },
            {
              name: 'Project',
              value: payload.projectPath,
              inline: false,
            },
          ],
          timestamp: payload.timestamp,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordMessage),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    onOutput(`✓ Message posted to Discord`);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    config: Record<string, string>,
    payload: NotificationPayload,
    onOutput: (output: string) => void
  ): Promise<void> {
    const phoneNumbers = config.phone_numbers;

    if (!phoneNumbers) {
      throw new Error('Phone numbers not configured');
    }

    onOutput(`📱 Sending SMS to: ${phoneNumbers}`);

    // For now, just simulate SMS sending
    // In production, you would use Twilio, MessageBird, or similar
    onOutput(`⚠️  SMS functionality not yet implemented`);
    onOutput(`   Would send to: ${phoneNumbers}`);
    onOutput(`   Message: Workflow ${payload.status}: ${payload.workflowName} at ${new Date(payload.timestamp).toLocaleTimeString('nl-NL')}`);
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '⚠️';
      default:
        return '📋';
    }
  }

  /**
   * Get status color
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'running':
        return '#3B82F6'; // blue
      case 'completed':
        return '#10B981'; // green
      case 'failed':
        return '#EF4444'; // red
      case 'cancelled':
        return '#F59E0B'; // yellow
      default:
        return '#6B7280'; // gray
    }
  }
}

export const notificationService = new NotificationService();
