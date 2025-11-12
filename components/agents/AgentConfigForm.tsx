'use client';

import { useState, useEffect } from 'react';
import { AgentConfig, AgentConfigVariable, ToolOption } from '@/lib/services/agentManager';

interface AgentConfigFormProps {
  agent: AgentConfig;
  projectPath: string;
  nodeId?: string; // Optional nodeId for workflow nodes (allows multiple instances of same agent)
  onSave: (configValues: Record<string, string>) => void;
}

export default function AgentConfigForm({ agent, projectPath, nodeId, onSave }: AgentConfigFormProps) {
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    agent.configValues || {}
  );
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [envoyerProjects, setEnvoyerProjects] = useState<Array<{ id: string; name: string; repository: string }>>([]);
  const [loadingEnvoyerProjects, setLoadingEnvoyerProjects] = useState(false);

  // Load project-specific config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Include nodeId in query if provided (for workflow nodes)
        const url = nodeId
          ? `/api/projects/${encodeURIComponent(projectPath)}/agents/${agent.id}/config?nodeId=${encodeURIComponent(nodeId)}`
          : `/api/projects/${encodeURIComponent(projectPath)}/agents/${agent.id}/config`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.config && Object.keys(data.config).length > 0) {
          setConfigValues(data.config);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [projectPath, agent.id, nodeId]);

  // Load Envoyer projects when API token changes (for Envoyer Deployer agent)
  useEffect(() => {
    const loadEnvoyerProjects = async () => {
      const apiToken = configValues['envoyer_api_token'];

      // Only load for Envoyer Deployer agent when token is present
      if (agent.id !== '12' || !apiToken || apiToken.trim() === '') {
        setEnvoyerProjects([]);
        return;
      }

      setLoadingEnvoyerProjects(true);
      try {
        console.log('Fetching Envoyer projects with token:', apiToken.substring(0, 10) + '...');
        const res = await fetch(`/api/envoyer/projects?apiToken=${encodeURIComponent(apiToken)}`);
        const data = await res.json();

        if (res.ok && data.projects) {
          console.log('Envoyer projects loaded:', data.projects.length);
          setEnvoyerProjects(data.projects);
        } else {
          console.error('Failed to load Envoyer projects:', data.error);
          setEnvoyerProjects([]);
        }
      } catch (error) {
        console.error('Error loading Envoyer projects:', error);
        setEnvoyerProjects([]);
      } finally {
        setLoadingEnvoyerProjects(false);
      }
    };

    loadEnvoyerProjects();
  }, [configValues, agent.id]);

  // Get extended help text for a configuration field
  const getHelpContent = (variable: AgentConfigVariable): string => {
    const helpTexts: Record<string, string> = {
      // Team Manager
      'task_tracker': 'Select which task management system your team uses. This determines where the agent will create, update, and track tasks. GitHub uses issues and projects, Jira uses tickets, Linear uses issues, etc.',
      'notification_channel': 'Choose where team notifications should be sent. The agent will post updates about task assignments, completions, and blockers to this channel.',
      'daily_standup_time': 'Set the time for automated daily standup reports (24-hour format, e.g., 09:00). The agent will generate a summary of team progress at this time each day.',
      'team_size': 'Number of developers on the team. This helps the agent optimize task distribution and workload balancing.',

      // Bug Fixer
      'error_tracking': 'Select your error monitoring service. The agent will fetch error reports from this service to prioritize bug fixes.',
      'log_level': 'Set the minimum severity level for bugs to investigate. "Error" focuses on serious issues, "Warning" includes potential problems.',
      'auto_create_issues': 'When enabled, the agent automatically creates GitHub issues for new bugs it discovers from error logs.',
      'priority_labels': 'Comma-separated priority levels used in your project (e.g., P0,P1,P2,P3). The agent uses these to categorize bug severity.',

      // Feature Developer
      'coding_style': 'Select the coding standard to follow. PSR-12 is for PHP, Airbnb/Google for JavaScript. The agent will write code matching this style.',
      'framework': 'Your primary development framework. This affects how the agent structures new features and which patterns it uses.',
      'test_coverage_min': 'Minimum required code coverage percentage. The agent ensures new features meet this threshold before completion.',
      'feature_branch_prefix': 'Prefix for feature branches (e.g., "feature/", "feat/"). The agent uses this when creating new git branches.',

      // GitHub Specialist
      'github_tool': 'Choose how to interact with GitHub. CLI is faster if installed, API works everywhere but needs a token, Hybrid combines both.',
      'github_token': 'Your GitHub Personal Access Token with repo access. Required for API mode. Create one at github.com/settings/tokens',
      'repo_owner': 'GitHub username or organization name that owns the repository (e.g., "microsoft", "your-username").',
      'repo_name': 'Name of the repository without the owner (e.g., for github.com/microsoft/vscode, use "vscode").',
      'base_branch': 'Default branch to create pull requests against, usually "main" or "master".',
      'auto_assign': 'Automatically assign new issues to team members based on expertise and workload.',

      // Security Developer
      'security_scanner': 'Tool for scanning code vulnerabilities. Snyk is good for dependencies, SonarQube for code quality, OWASP ZAP for web apps.',
      'min_severity': 'Only report vulnerabilities at or above this level. "Critical" focuses on urgent fixes, "Low" catches everything.',
      'auto_fix_vulnerabilities': 'Automatically apply patches for known vulnerabilities when safe fixes are available.',
      'compliance_standards': 'Regulatory standards to check against (OWASP, PCI-DSS, GDPR, etc.). Agent ensures code meets these requirements.',

      // Test Runner
      'test_framework': 'Testing framework to use. PHPUnit for PHP, Jest for JavaScript, Pytest for Python, Cypress for E2E.',
      'coverage_threshold': 'Minimum code coverage percentage required for tests to pass. Typical values: 70-90%.',
      'test_types': 'Types of tests to run: "unit" for isolated tests, "integration" for component interaction, "e2e" for full user flows.',
      'parallel_execution': 'Run tests in parallel to speed up execution. Disable if tests share state or resources.',

      // Laravel Expert
      'laravel_version': 'Target Laravel framework version. Affects which features and syntax the agent uses.',
      'php_version': 'Target PHP version. Determines available language features (e.g., 8.0+ has named arguments, enums).',
      'database': 'Primary database system. Affects query syntax and available features (MySQL, PostgreSQL, etc.).',
      'use_livewire': 'Enable Laravel Livewire for reactive components without JavaScript. Useful for dynamic UIs.',

      // Code Reviewer
      'review_strictness': 'How strict code reviews should be. Lenient for quick iterations, Strict for production code, Very Strict for critical systems.',
      'focus_areas': 'Areas to emphasize during review (e.g., "security,performance,maintainability"). Agent prioritizes these aspects.',
      'auto_approve_minor': 'Auto-approve trivial changes like formatting or typo fixes. Saves time on obvious improvements.',
      'require_tests': 'Reject code changes that don\'t include tests. Ensures code quality and prevents regressions.',

      // Deployment Manager
      'ci_cd_platform': 'Your CI/CD system. Agent creates appropriate pipeline configs and deployment scripts for this platform.',
      'deployment_env': 'Target environment for deployments. "Production" for live systems, "Staging" for testing, "All" for multi-env.',
      'auto_deploy': 'Automatically trigger deployment when code is merged to main branch. Enables continuous deployment.',
      'deployment_strategy': 'Deployment method. Rolling updates gradually, Blue-Green swaps environments, Canary tests with subset of users.',

      // Insurance Expert
      'insurance_types': 'Insurance products your system handles (WA=liability, Casco=vehicle damage, All-risk=comprehensive, Inboedel=contents).',
      'regulatory_framework': 'Regulatory standards to comply with. WFT=Dutch financial supervision, EAA=European standards, GDPR=data protection.',
      'calculation_engine': 'System used for premium calculations (e.g., Exactonline, custom engine). Agent adapts to its API/format.',
      'compliance_level': 'Required compliance verification. Basic=minimal checks, Audit-ready=full documentation and traceability.',

      // Performance Developer
      'cache_system': 'Caching backend for performance. Redis is fast and popular, Memcached is simple, File-based works without setup.',
      'performance_target': 'Target response time in milliseconds. Typical values: API=200ms, Web pages=1000ms, Calculations=100ms.',
      'profiling_tool': 'Tool for identifying performance bottlenecks. Xdebug is free but slow, Blackfire is fast and detailed.',
      'optimize_queries': 'Automatically optimize slow database queries by adding indexes, rewriting queries, or caching results.',

      // Envoyer Deployer
      'envoyer_api_token': 'Your Envoyer API token for authentication. Create one in Envoyer dashboard under API Tokens. Requires create/delete scopes for full deployment control.',
      'envoyer_project_id': 'Unique identifier for your Envoyer project. Find this in the project URL: envoyer.io/projects/{PROJECT_ID}',
      'deploy_from': 'Source for deployments. "Branch" deploys latest commit from specified branch (good for staging/production). "Tag" deploys specific release tags (good for versioned releases).',
      'deploy_branch': 'Git branch to deploy from (e.g., "main", "production", "staging"). Agent will deploy the latest commit on this branch when triggered.',
      'deploy_tag': 'Git tag to deploy (e.g., "v1.0.0", "release-2024-01"). Agent will deploy this specific tagged release. Useful for versioned releases and rollbacks.',
      'deployment_timeout': 'Maximum time to wait for deployment completion before marking as failed. Laravel apps typically deploy in 2-5 minutes. Increase for large apps.',
      'notification_channels': 'Where to send deployment status notifications (started, completed, failed). Email uses Envoyer settings, Slack/Discord/Teams need webhook configuration.',
    };

    return helpTexts[variable.key] || variable.description;
  };

  const handleSave = async () => {
    // Build final config values with defaults for missing required fields
    const finalConfigValues = { ...configValues };

    // Add default values for required fields that are empty
    agent.configVariables?.forEach(v => {
      if (v.required && !finalConfigValues[v.key] && v.defaultValue) {
        finalConfigValues[v.key] = v.defaultValue;
      }
    });

    // Validate required fields (now checking final values)
    const missingRequired = agent.configVariables?.filter(
      v => v.required && !finalConfigValues[v.key]
    );

    if (missingRequired && missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map(v => v.label).join(', ')}`);
      return;
    }

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectPath)}/agents/${agent.id}/config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          // Include nodeId in request body if provided
          body: JSON.stringify({
            configValues: finalConfigValues,
            ...(nodeId && { nodeId })
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        onSave(finalConfigValues);
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const renderConfigField = (variable: AgentConfigVariable) => {
    const value = configValues[variable.key] || variable.defaultValue || '';

    // Special handling for envoyer_project_id - show dynamic dropdown if projects are loaded
    if (variable.key === 'envoyer_project_id' && envoyerProjects.length > 0) {
      return (
        <div className="space-y-2">
          <select
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            required={variable.required}
          >
            <option value="">— Select Envoyer Project —</option>
            {envoyerProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.repository})
              </option>
            ))}
          </select>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {envoyerProjects.length} project{envoyerProjects.length !== 1 ? 's' : ''} found
          </p>
        </div>
      );
    }

    // Show loading state for envoyer_project_id while fetching
    if (variable.key === 'envoyer_project_id' && loadingEnvoyerProjects) {
      return (
        <div className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-gray-50">
          <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent" />
          <span className="text-gray-500">Loading projects...</span>
        </div>
      );
    }

    switch (variable.type) {
      case 'text':
      case 'password':
        return (
          <input
            type={variable.type}
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            placeholder={variable.placeholder}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required={variable.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            placeholder={variable.placeholder}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required={variable.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            required={variable.required}
          >
            <option value="">— Select —</option>
            {variable.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={value === 'true'}
                onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.checked ? 'true' : 'false' })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
            </div>
            <span className="text-sm text-gray-700 group-hover:text-gray-900">{value === 'true' ? 'Enabled' : 'Disabled'}</span>
          </label>
        );

      case 'tool-choice':
        return (
          <div className="space-y-2">
            {variable.toolOptions?.map((tool) => (
              <div
                key={tool.value}
                className={`p-2.5 border rounded-lg cursor-pointer transition-all ${
                  value === tool.value
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => setConfigValues({ ...configValues, [variable.key]: tool.value })}
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="radio"
                      checked={value === tool.value}
                      onChange={() => setConfigValues({ ...configValues, [variable.key]: tool.value })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{tool.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{tool.description}</div>
                    {tool.requiresInstall && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
                        <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        <span>Install: <code className="bg-orange-100 px-1 py-0.5 rounded text-orange-800 font-mono">{tool.installCommand}</code></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (!agent.configVariables || agent.configVariables.length === 0) {
    return (
      <div className="text-center py-6">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-500">No configuration needed</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-6 w-6 border-3 border-blue-500 rounded-full border-t-transparent mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact info banner */}
      <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md border border-blue-200/50">
        <p className="text-xs text-blue-700 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Project-specific settings</span>
        </p>
      </div>

      {agent.configVariables.map((variable) => (
        <div key={variable.key} className="group">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              {variable.label}
              {variable.required && (
                <span className="text-red-500 text-xs">●</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => setShowHelp(showHelp === variable.key ? null : variable.key)}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-all ${
                showHelp === variable.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {showHelp === variable.key ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Close</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Help</span>
                </>
              )}
            </button>
          </div>

          {/* Compact Help Panel with slide animation */}
          {showHelp === variable.key && (
            <div className="mb-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-3 border-blue-500 rounded-r-md animate-slide-down">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-blue-900 leading-relaxed">
                  {getHelpContent(variable)}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mb-1.5">{variable.description}</p>
          {renderConfigField(variable)}
        </div>
      ))}

      <button
        onClick={handleSave}
        className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-medium text-sm mt-4 flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Save Configuration</span>
      </button>
    </div>
  );
}
