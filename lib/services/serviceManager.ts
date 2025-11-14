/**
 * Service Management
 * Manage executable services that can be used in workflows (notifications, deployments, etc.)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ServiceConfigVariable {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'boolean';
  description: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

export type ServiceCategory =
  | 'notifications'
  | 'deployment'
  | 'database'
  | 'external-api'
  | 'monitoring';

export interface ServiceConfig {
  id: string;
  name: string;
  type: string; // e.g., 'slack-notifier', 'email-notifier', 'envoyer-deployer'
  emoji: string;
  color: string;
  description: string;
  capabilities: string[];
  category: ServiceCategory;
  configVariables: ServiceConfigVariable[];
  configValues?: Record<string, string>;
  isCustom: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export class ServiceManager {
  private servicesDir: string;
  private customServicesFile: string;

  constructor() {
    this.servicesDir = path.join(process.env.HOME || '', '.claude', 'services');
    this.customServicesFile = path.join(this.servicesDir, 'custom-services.json');
  }

  /**
   * Get all default services (built-in)
   */
  getDefaultServices(): ServiceConfig[] {
    return [
      {
        id: 'service-slack',
        name: 'Slack Notifier',
        type: 'slack-notifier',
        emoji: '💬',
        color: '#4A154B',
        description: 'Send notifications to Slack channels via webhook',
        capabilities: ['Slack Messages', 'Rich Formatting', 'Channel Notifications'],
        category: 'notifications',
        configVariables: [
          {
            key: 'webhook_url',
            label: 'Slack Webhook URL',
            type: 'text',
            description: 'Incoming webhook URL for Slack',
            required: true,
            placeholder: 'https://hooks.slack.com/services/...',
          },
          {
            key: 'default_channel',
            label: 'Default Channel',
            type: 'text',
            description: 'Default channel for notifications',
            required: false,
            defaultValue: '#general',
            placeholder: '#general',
          },
          {
            key: 'mention_users',
            label: 'Mention Users',
            type: 'boolean',
            description: 'Enable @mentions in notifications',
            required: false,
            defaultValue: 'true',
          },
          {
            key: 'custom_message',
            label: 'Custom Message Template',
            type: 'text',
            description: 'Custom message template with variable substitution. Available variables: {workflow_name}, {status}, {issue_count}, {issue_number}, {issue_title}, {branch_name}, {pr_url}, {agent_outputs}. Leave empty for auto-generated message.',
            required: false,
            placeholder: 'Issue #{issue_number}: {issue_title}\nBranch: {branch_name}\nPR: {pr_url}\n\n{agent_outputs}',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-email',
        name: 'Email Notifier',
        type: 'email-notifier',
        emoji: '📧',
        color: '#EA4335',
        description: 'Send email notifications via SMTP',
        capabilities: ['Email Delivery', 'SMTP', 'HTML Templates'],
        category: 'notifications',
        configVariables: [
          {
            key: 'smtp_server',
            label: 'SMTP Server',
            type: 'text',
            description: 'SMTP server hostname',
            required: true,
            placeholder: 'smtp.gmail.com',
          },
          {
            key: 'smtp_port',
            label: 'SMTP Port',
            type: 'number',
            description: 'SMTP server port',
            required: true,
            defaultValue: '587',
            placeholder: '587',
          },
          {
            key: 'from_email',
            label: 'From Email Address',
            type: 'text',
            description: 'Sender email address',
            required: true,
            placeholder: 'notifications@example.com',
          },
          {
            key: 'to_emails',
            label: 'Recipient Emails',
            type: 'text',
            description: 'Comma-separated recipient emails',
            required: true,
            placeholder: 'team@example.com,admin@example.com',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-envoyer',
        name: 'Envoyer Deployer',
        type: 'envoyer-deployer',
        emoji: '🚀',
        color: '#FF6B35',
        description: 'Zero-downtime deployments via Envoyer API',
        capabilities: ['Zero-Downtime', 'Laravel Deployment', 'Rollback Support'],
        category: 'deployment',
        configVariables: [
          {
            key: 'envoyer_api_token',
            label: 'Envoyer API Token',
            type: 'password',
            description: 'Bearer token for Envoyer API',
            required: true,
            placeholder: 'your-envoyer-api-token',
          },
          {
            key: 'envoyer_project_id',
            label: 'Project ID',
            type: 'text',
            description: 'Envoyer project ID',
            required: true,
            placeholder: '12345',
          },
          {
            key: 'deploy_from',
            label: 'Deploy From',
            type: 'select',
            description: 'Deploy from branch or tag',
            required: true,
            defaultValue: 'branch',
            options: ['branch', 'tag'],
          },
          {
            key: 'deploy_branch',
            label: 'Deploy Branch',
            type: 'text',
            description: 'Branch name for deployment',
            required: false,
            defaultValue: 'main',
            placeholder: 'main',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-github-issues',
        name: 'GitHub Issues',
        type: 'github-issues',
        emoji: '📋',
        color: '#238636',
        description: 'Fetch and manage GitHub issues - retrieve issues based on filters and pass data to agents',
        capabilities: ['List Issues', 'View Issue Details', 'Filter by State/Labels', 'Search Issues'],
        category: 'external-api',
        configVariables: [
          {
            key: 'repository',
            label: 'Repository (Optional)',
            type: 'text',
            description: 'GitHub repository in format: owner/repo (e.g., "facebook/react"). Leave empty to use repository from GitHub Service Category configuration.',
            required: false,
            placeholder: 'Uses category config if empty',
          },
          {
            key: 'issue_state',
            label: 'Issue State',
            type: 'select',
            description: 'Filter issues by state',
            required: true,
            defaultValue: 'open',
            options: ['open', 'closed', 'all'],
          },
          {
            key: 'labels',
            label: 'Filter by Labels',
            type: 'text',
            description: 'Comma-separated list of labels to filter. Use "!" prefix to exclude labels (e.g., "bug,enhancement" or "!in-review,!blocked")',
            required: false,
            placeholder: 'bug,enhancement or !in-review',
          },
          {
            key: 'assignee',
            label: 'Filter by Assignee',
            type: 'text',
            description: 'Filter issues assigned to specific user (use @me for yourself)',
            required: false,
            placeholder: '@me or username',
          },
          {
            key: 'author',
            label: 'Filter by Author',
            type: 'text',
            description: 'Filter issues created by specific user',
            required: false,
            placeholder: 'username',
          },
          {
            key: 'milestone',
            label: 'Filter by Milestone',
            type: 'text',
            description: 'Filter issues by milestone name',
            required: false,
            placeholder: 'v1.0',
          },
          {
            key: 'limit',
            label: 'Result Limit',
            type: 'number',
            description: 'Maximum number of issues to fetch',
            required: false,
            defaultValue: '30',
            placeholder: '30',
          },
          {
            key: 'search_query',
            label: 'Search Query',
            type: 'text',
            description: 'Search in issue title and body',
            required: false,
            placeholder: 'search terms',
          },
          {
            key: 'include_body',
            label: 'Include Issue Body',
            type: 'boolean',
            description: 'Include full issue description in results',
            required: false,
            defaultValue: 'true',
          },
          {
            key: 'include_comments',
            label: 'Include Comments',
            type: 'boolean',
            description: 'Include issue comments in results (slower)',
            required: false,
            defaultValue: 'false',
          },
          {
            key: 'sort_by',
            label: 'Sort By',
            type: 'select',
            description: 'Sort issues by field',
            required: false,
            defaultValue: 'created',
            options: ['created', 'updated', 'comments'],
          },
          {
            key: 'sort_direction',
            label: 'Sort Direction',
            type: 'select',
            description: 'Sort order',
            required: false,
            defaultValue: 'desc',
            options: ['asc', 'desc'],
          },
          {
            key: 'fail_on_no_issues',
            label: 'Stop Workflow if No Issues',
            type: 'boolean',
            description: 'Stop the workflow execution if no issues are found matching the filters',
            required: false,
            defaultValue: 'true',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-github-branch',
        name: 'GitHub Branch Manager',
        type: 'github-branch',
        emoji: '🌿',
        color: '#2EA44F',
        description: 'Create and checkout git branches based on issue information',
        capabilities: ['Create Branch', 'Checkout Branch', 'Branch from Issue'],
        category: 'deployment',
        configVariables: [
          {
            key: 'base_branch',
            label: 'Base Branch',
            type: 'text',
            description: 'Base branch to create from',
            required: false,
            defaultValue: 'main',
            placeholder: 'main',
          },
          {
            key: 'branch_type',
            label: 'Branch Type',
            type: 'select',
            description: 'Type of branch (prefix)',
            required: true,
            defaultValue: 'feature',
            options: ['feature', 'fix', 'hotfix', 'chore'],
          },
          {
            key: 'use_issue_data',
            label: 'Use Issue Data',
            type: 'boolean',
            description: 'Automatically generate branch name from issue number and title',
            required: false,
            defaultValue: 'true',
          },
          {
            key: 'custom_branch_name',
            label: 'Custom Branch Name',
            type: 'text',
            description: 'Custom branch name (only if not using issue data)',
            required: false,
            placeholder: 'my-feature-branch',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-github-commit',
        name: 'GitHub Committer',
        type: 'github-commit',
        emoji: '💾',
        color: '#0969DA',
        description: 'Stage, commit and push changes to GitHub',
        capabilities: ['Git Add', 'Git Commit', 'Git Push'],
        category: 'deployment',
        configVariables: [
          {
            key: 'commit_message',
            label: 'Commit Message',
            type: 'text',
            description: 'Commit message (can use {issue_number} and {issue_title} placeholders)',
            required: false,
            placeholder: 'fix: resolve issue #{issue_number}',
          },
          {
            key: 'commit_files',
            label: 'Files to Commit',
            type: 'text',
            description: 'Files to stage (comma-separated, or "." for all changes)',
            required: false,
            defaultValue: '.',
            placeholder: '. or src/file1.ts,src/file2.ts',
          },
          {
            key: 'auto_push',
            label: 'Auto Push',
            type: 'boolean',
            description: 'Automatically push after committing',
            required: false,
            defaultValue: 'true',
          },
          {
            key: 'remote_name',
            label: 'Remote Name',
            type: 'text',
            description: 'Git remote to push to',
            required: false,
            defaultValue: 'origin',
            placeholder: 'origin',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-github-pr',
        name: 'GitHub PR Creator',
        type: 'github-pr',
        emoji: '🔀',
        color: '#8250DF',
        description: 'Create pull requests on GitHub with issue linking',
        capabilities: ['Create PR', 'Link Issues', 'Auto-assign'],
        category: 'deployment',
        configVariables: [
          {
            key: 'base_branch',
            label: 'Base Branch',
            type: 'text',
            description: 'Branch to merge into',
            required: false,
            defaultValue: 'main',
            placeholder: 'main',
          },
          {
            key: 'pr_title',
            label: 'PR Title',
            type: 'text',
            description: 'Pull request title (can use {issue_number} and {issue_title} placeholders)',
            required: false,
            placeholder: 'Fix #{issue_number}: {issue_title}',
          },
          {
            key: 'pr_body_template',
            label: 'PR Body Template',
            type: 'text',
            description: 'PR description template',
            required: false,
            placeholder: 'Closes #{issue_number}\n\n## Changes\n{agent_summary}',
          },
          {
            key: 'auto_link_issue',
            label: 'Auto Link Issue',
            type: 'boolean',
            description: 'Automatically add "Closes #issue" to PR body',
            required: false,
            defaultValue: 'true',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-github-issue-updater',
        name: 'GitHub Issue Updater',
        type: 'github-issue-updater',
        emoji: '📝',
        color: '#BF40BF',
        description: 'Update GitHub issues with comments, labels and status',
        capabilities: ['Add Comments', 'Update Labels', 'Close Issues'],
        category: 'external-api',
        configVariables: [
          {
            key: 'add_comment',
            label: 'Add Comment',
            type: 'boolean',
            description: 'Add a comment to the issue with execution details',
            required: false,
            defaultValue: 'true',
          },
          {
            key: 'comment_template',
            label: 'Comment Template',
            type: 'text',
            description: 'Comment text (can use placeholders)',
            required: false,
            placeholder: '✅ Issue resolved by {agent_name}\n\nBranch: {branch_name}\nPR: {pr_url}',
          },
          {
            key: 'add_label',
            label: 'Add Label',
            type: 'text',
            description: 'Label to add to the issue',
            required: false,
            defaultValue: 'in-review',
            placeholder: 'in-review',
          },
          {
            key: 'remove_labels',
            label: 'Remove Labels',
            type: 'text',
            description: 'Comma-separated labels to remove',
            required: false,
            placeholder: 'pending,needs-triage',
          },
          {
            key: 'close_issue',
            label: 'Close Issue',
            type: 'boolean',
            description: 'Close the issue after updating',
            required: false,
            defaultValue: 'false',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-jira-issues',
        name: 'Jira Issues',
        type: 'jira-issues',
        emoji: '📋',
        color: '#0052CC',
        description: 'Fetch and manage Jira issues - retrieve issues based on JQL filters and pass data to agents',
        capabilities: ['List Issues', 'JQL Queries', 'Filter by Status/Labels', 'View Issue Details'],
        category: 'external-api',
        configVariables: [
          {
            key: 'jql_query',
            label: 'JQL Query',
            type: 'text',
            description: 'JQL query to filter issues (e.g., "status = Open AND assignee = currentUser()")',
            required: false,
            placeholder: 'status = "To Do" AND assignee = currentUser()',
          },
          {
            key: 'max_results',
            label: 'Max Results',
            type: 'number',
            description: 'Maximum number of issues to retrieve',
            required: false,
            defaultValue: '50',
            placeholder: '50',
          },
          {
            key: 'status_filter',
            label: 'Status Filter',
            type: 'text',
            description: 'Comma-separated list of statuses to filter (e.g., "To Do,In Progress")',
            required: false,
            placeholder: 'To Do,In Progress',
          },
          {
            key: 'labels_filter',
            label: 'Labels Filter',
            type: 'text',
            description: 'Comma-separated list of labels to filter',
            required: false,
            placeholder: 'bug,urgent',
          },
          {
            key: 'assignee_filter',
            label: 'Assignee Filter',
            type: 'text',
            description: 'Filter by assignee (use "currentUser()" for yourself)',
            required: false,
            placeholder: 'currentUser()',
          },
        ],
        isCustom: false,
      },
      {
        id: 'service-jira-updater',
        name: 'Jira Issue Updater',
        type: 'jira-updater',
        emoji: '✏️',
        color: '#0052CC',
        description: 'Update Jira issues - add comments, change status, update fields',
        capabilities: ['Add Comments', 'Update Status', 'Transition Issues', 'Update Fields'],
        category: 'external-api',
        configVariables: [
          {
            key: 'add_comment',
            label: 'Add Comment',
            type: 'boolean',
            description: 'Add a comment to the issue',
            required: false,
            defaultValue: 'true',
          },
          {
            key: 'comment_template',
            label: 'Comment Template',
            type: 'text',
            description: 'Comment text (can use placeholders like {agent_name}, {branch_name}, {pr_url})',
            required: false,
            placeholder: '✅ Issue resolved by {agent_name}\n\nBranch: {branch_name}\nPR: {pr_url}',
          },
          {
            key: 'transition_status',
            label: 'Transition to Status',
            type: 'text',
            description: 'Status to transition the issue to (e.g., "In Progress", "Done", "In Review")',
            required: false,
            placeholder: 'In Progress',
          },
          {
            key: 'assign_to',
            label: 'Assign To',
            type: 'text',
            description: 'Username to assign the issue to (use "currentUser()" for yourself)',
            required: false,
            placeholder: 'currentUser()',
          },
          {
            key: 'add_labels',
            label: 'Add Labels',
            type: 'text',
            description: 'Comma-separated list of labels to add',
            required: false,
            placeholder: 'in-progress,automated',
          },
          {
            key: 'remove_labels',
            label: 'Remove Labels',
            type: 'text',
            description: 'Comma-separated list of labels to remove',
            required: false,
            placeholder: 'to-do,blocked',
          },
        ],
        isCustom: false,
      },
    ];
  }

  /**
   * Load custom services from file
   */
  async loadCustomServices(): Promise<ServiceConfig[]> {
    try {
      await fs.mkdir(this.servicesDir, { recursive: true });
      const data = await fs.readFile(this.customServicesFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all services (default + custom)
   */
  async getAllServices(): Promise<ServiceConfig[]> {
    const defaultServices = this.getDefaultServices();
    const customServices = await this.loadCustomServices();
    return [...defaultServices, ...customServices];
  }

  /**
   * Create a new custom service
   */
  async createService(service: Omit<ServiceConfig, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>): Promise<ServiceConfig> {
    const customServices = await this.loadCustomServices();

    const newService: ServiceConfig = {
      ...service,
      id: `service-custom-${Date.now()}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    customServices.push(newService);
    await this.saveCustomServices(customServices);

    return newService;
  }

  /**
   * Update an existing service
   */
  async updateService(id: string, updates: Partial<ServiceConfig>): Promise<ServiceConfig> {
    const customServices = await this.loadCustomServices();
    const index = customServices.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error(`Service ${id} not found or cannot be edited`);
    }

    const updatedService = {
      ...customServices[index],
      ...updates,
      id,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    customServices[index] = updatedService;
    await this.saveCustomServices(customServices);

    return updatedService;
  }

  /**
   * Delete a custom service
   */
  async deleteService(id: string): Promise<void> {
    const customServices = await this.loadCustomServices();
    const filtered = customServices.filter(s => s.id !== id);

    if (filtered.length === customServices.length) {
      throw new Error(`Service ${id} not found or cannot be deleted`);
    }

    await this.saveCustomServices(filtered);
  }

  /**
   * Save custom services to file
   */
  private async saveCustomServices(services: ServiceConfig[]): Promise<void> {
    await fs.mkdir(this.servicesDir, { recursive: true });
    await fs.writeFile(
      this.customServicesFile,
      JSON.stringify(services, null, 2),
      'utf-8'
    );
  }
}

export const serviceManager = new ServiceManager();
