/**
 * Service Categories - Define shared configuration for groups of related services
 *
 * This system allows services of the same category (e.g., all GitHub services)
 * to share common configuration like repository URLs, authentication tokens, etc.
 */

export interface ServiceCategoryVariable {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'password' | 'number' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: string[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  emoji: string;
  configVariables: ServiceCategoryVariable[];
}

// ============================================================================
// GITHUB SERVICE CATEGORY
// ============================================================================
export const GitHubServiceCategory: ServiceCategory = {
  id: 'github',
  name: 'GitHub',
  description: 'Shared configuration for all GitHub-related services (Issues, PRs, Commits, Branches)',
  emoji: '🐙',
  configVariables: [
    {
      key: 'owner',
      label: 'Repository Owner',
      description: 'GitHub username or organization that owns the repository (e.g., "ginkelsoft-development")',
      type: 'text',
      required: true,
      placeholder: 'ginkelsoft-development',
    },
    {
      key: 'repo',
      label: 'Repository Name',
      description: 'Name of the GitHub repository (e.g., "insurance-orchestrator")',
      type: 'text',
      required: true,
      placeholder: 'insurance-orchestrator',
    },
    {
      key: 'defaultBranch',
      label: 'Default Branch',
      description: 'The main branch of the repository (usually "main" or "master")',
      type: 'text',
      required: false,
      defaultValue: 'main',
      placeholder: 'main',
    },
    {
      key: 'githubToken',
      label: 'GitHub Token (Optional)',
      description: 'Personal Access Token for GitHub API (if not using gh CLI authentication)',
      type: 'password',
      required: false,
      placeholder: 'ghp_xxxxxxxxxxxx',
    },
  ],
};

// ============================================================================
// SLACK SERVICE CATEGORY
// ============================================================================
export const SlackServiceCategory: ServiceCategory = {
  id: 'slack',
  name: 'Slack',
  description: 'Shared configuration for all Slack-related services (Messages, Notifications)',
  emoji: '💬',
  configVariables: [
    {
      key: 'webhookUrl',
      label: 'Webhook URL',
      description: 'Slack webhook URL for sending messages to a channel',
      type: 'password',
      required: true,
      placeholder: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    },
    {
      key: 'defaultChannel',
      label: 'Default Channel',
      description: 'Default Slack channel to send messages to (e.g., "#general")',
      type: 'text',
      required: false,
      defaultValue: '#general',
      placeholder: '#general',
    },
    {
      key: 'botName',
      label: 'Bot Name',
      description: 'Display name for the bot when sending messages',
      type: 'text',
      required: false,
      defaultValue: 'Workflow Bot',
      placeholder: 'Workflow Bot',
    },
  ],
};

// ============================================================================
// EMAIL SERVICE CATEGORY
// ============================================================================
export const EmailServiceCategory: ServiceCategory = {
  id: 'email',
  name: 'Email',
  description: 'Shared configuration for all Email-related services (Send Email, Notifications)',
  emoji: '📧',
  configVariables: [
    {
      key: 'smtpHost',
      label: 'SMTP Host',
      description: 'SMTP server hostname (e.g., "smtp.gmail.com")',
      type: 'text',
      required: true,
      placeholder: 'smtp.gmail.com',
    },
    {
      key: 'smtpPort',
      label: 'SMTP Port',
      description: 'SMTP server port (usually 587 for TLS or 465 for SSL)',
      type: 'number',
      required: true,
      defaultValue: '587',
      placeholder: '587',
    },
    {
      key: 'smtpUser',
      label: 'SMTP Username',
      description: 'Username for SMTP authentication (usually your email address)',
      type: 'text',
      required: true,
      placeholder: 'your-email@example.com',
    },
    {
      key: 'smtpPassword',
      label: 'SMTP Password',
      description: 'Password or app-specific password for SMTP authentication',
      type: 'password',
      required: true,
      placeholder: '••••••••',
    },
    {
      key: 'fromEmail',
      label: 'From Email',
      description: 'Email address to send from (must be authorized by SMTP server)',
      type: 'text',
      required: true,
      placeholder: 'noreply@example.com',
    },
    {
      key: 'fromName',
      label: 'From Name',
      description: 'Display name for the sender',
      type: 'text',
      required: false,
      defaultValue: 'Workflow System',
      placeholder: 'Workflow System',
    },
  ],
};

// ============================================================================
// JIRA SERVICE CATEGORY
// ============================================================================
export const JiraServiceCategory: ServiceCategory = {
  id: 'jira',
  name: 'Jira',
  description: 'Shared configuration for all Jira-related services (Issues, Updates, Transitions)',
  emoji: '📋',
  configVariables: [
    {
      key: 'jiraUrl',
      label: 'Jira URL',
      description: 'Your Jira instance URL (e.g., "https://yourcompany.atlassian.net")',
      type: 'text',
      required: true,
      placeholder: 'https://yourcompany.atlassian.net',
    },
    {
      key: 'jiraEmail',
      label: 'Jira Email',
      description: 'Email address associated with your Jira account',
      type: 'text',
      required: true,
      placeholder: 'user@company.com',
    },
    {
      key: 'jiraApiToken',
      label: 'Jira API Token',
      description: 'API token for Jira authentication (create at https://id.atlassian.com/manage-profile/security/api-tokens)',
      type: 'password',
      required: true,
      placeholder: 'your-api-token',
    },
    {
      key: 'defaultProject',
      label: 'Default Project Key',
      description: 'Default Jira project key to use (e.g., "PROJ" or "DEV")',
      type: 'text',
      required: false,
      placeholder: 'PROJ',
    },
  ],
};

// ============================================================================
// REGISTRY OF ALL CATEGORIES
// ============================================================================
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  GitHubServiceCategory,
  SlackServiceCategory,
  EmailServiceCategory,
  JiraServiceCategory,
];

/**
 * Get a service category by ID
 */
export function getServiceCategory(categoryId: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * Get all service categories
 */
export function getAllServiceCategories(): ServiceCategory[] {
  return SERVICE_CATEGORIES;
}
