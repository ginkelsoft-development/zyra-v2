#!/usr/bin/env ts-node
/**
 * Migration Script: JSON Files → MySQL Database
 *
 * This script migrates all existing JSON-based data to the MySQL database.
 * It reads from ~/.claude/ directory structure and imports into the database.
 */

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/db/prisma';
import { ProjectManager } from '../lib/services/projectManager';
import { WorkflowManager } from '../lib/services/workflowManager';
import { getServiceCategoryManager } from '../lib/services/serviceCategoryManager';

const HOME_DIR = process.env.HOME || '';
const CLAUDE_DIR = path.join(HOME_DIR, '.claude');
const PROJECTS_FILE = path.join(CLAUDE_DIR, 'projects.json');
const WORKFLOWS_DIR = path.join(CLAUDE_DIR, 'workflows');
const CUSTOM_AGENTS_FILE = path.join(CLAUDE_DIR, 'agents', 'custom-agents.json');
const EXECUTIONS_DIR = path.join(CLAUDE_DIR, 'workflow-executions');
const SERVICE_CONFIGS_DIR = path.join(CLAUDE_DIR, 'services-config');

const projectManager = new ProjectManager();
const workflowManager = new WorkflowManager();
const serviceCategoryManager = getServiceCategoryManager();

interface MigrationStats {
  projects: number;
  workflows: number;
  customAgents: number;
  serviceCategoryConfigs: number;
  serviceConfigs: number;
  executionHistory: number;
  errors: string[];
}

const stats: MigrationStats = {
  projects: 0,
  workflows: 0,
  customAgents: 0,
  serviceCategoryConfigs: 0,
  serviceConfigs: 0,
  executionHistory: 0,
  errors: [],
};

/**
 * Normalize path to expand tilde
 */
function normalizePath(projectPath: string): string {
  if (projectPath.startsWith('~/')) {
    return path.join(HOME_DIR, projectPath.slice(2));
  }
  return projectPath;
}

/**
 * Create backup of all JSON files before migration
 */
async function createBackup(): Promise<void> {
  console.log('\n📦 Creating backup of existing JSON files...');

  const backupDir = path.join(CLAUDE_DIR, 'backup-before-db-migration');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const timestampedBackupDir = path.join(backupDir, timestamp);

  if (!fs.existsSync(timestampedBackupDir)) {
    fs.mkdirSync(timestampedBackupDir, { recursive: true });
  }

  // Copy all JSON files
  const filesToBackup = [
    PROJECTS_FILE,
    CUSTOM_AGENTS_FILE,
  ];

  for (const file of filesToBackup) {
    if (fs.existsSync(file)) {
      const fileName = path.basename(file);
      fs.copyFileSync(file, path.join(timestampedBackupDir, fileName));
      console.log(`  ✓ Backed up ${fileName}`);
    }
  }

  // Copy workflows directory
  if (fs.existsSync(WORKFLOWS_DIR)) {
    const workflowBackupDir = path.join(timestampedBackupDir, 'workflows');
    fs.mkdirSync(workflowBackupDir, { recursive: true });
    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR);
    for (const file of workflowFiles) {
      if (file.endsWith('.json')) {
        fs.copyFileSync(
          path.join(WORKFLOWS_DIR, file),
          path.join(workflowBackupDir, file)
        );
      }
    }
    console.log(`  ✓ Backed up ${workflowFiles.length} workflow files`);
  }

  // Copy services-config directory
  if (fs.existsSync(SERVICE_CONFIGS_DIR)) {
    const serviceConfigBackupDir = path.join(timestampedBackupDir, 'services-config');
    fs.mkdirSync(serviceConfigBackupDir, { recursive: true });
    const configFiles = fs.readdirSync(SERVICE_CONFIGS_DIR);
    for (const file of configFiles) {
      if (file.endsWith('.json')) {
        fs.copyFileSync(
          path.join(SERVICE_CONFIGS_DIR, file),
          path.join(serviceConfigBackupDir, file)
        );
      }
    }
    console.log(`  ✓ Backed up ${configFiles.length} service config files`);
  }

  console.log(`\n✅ Backup created at: ${timestampedBackupDir}\n`);
}

/**
 * Migrate projects from projects.json
 */
async function migrateProjects(): Promise<void> {
  console.log('📁 Migrating projects...');

  if (!fs.existsSync(PROJECTS_FILE)) {
    console.log('  ℹ️  No projects.json found, skipping...');
    return;
  }

  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    const projects = JSON.parse(data);

    for (const project of projects) {
      try {
        const normalizedPath = normalizePath(project.path);

        // Save project
        await projectManager.saveProject({
          name: project.name,
          path: normalizedPath,
          agents: project.agents || [],
        });

        // Save agent configs if any
        if (project.agents && project.agents.length > 0) {
          for (const agent of project.agents) {
            await projectManager.configureNode(
              normalizedPath,
              agent.nodeId || agent.agentId, // Fallback to agentId for old format
              agent.agentId,
              agent.configValues || {}
            );
          }
        }

        stats.projects++;
        console.log(`  ✓ Migrated project: ${project.name}`);
      } catch (error) {
        const errorMsg = `Failed to migrate project ${project.name}: ${error}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to read projects.json: ${error}`;
    console.error(`  ✗ ${errorMsg}`);
    stats.errors.push(errorMsg);
  }
}

/**
 * Migrate workflows from workflows/*.json
 */
async function migrateWorkflows(): Promise<void> {
  console.log('\n🔄 Migrating workflows...');

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.log('  ℹ️  No workflows directory found, skipping...');
    return;
  }

  try {
    const files = fs.readdirSync(WORKFLOWS_DIR);
    const workflowFiles = files.filter(f => f.endsWith('.json'));

    for (const file of workflowFiles) {
      try {
        const filePath = path.join(WORKFLOWS_DIR, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const workflow = JSON.parse(data);

        const normalizedPath = normalizePath(workflow.projectPath);

        // Build node ID set to validate edges
        const nodeIds = new Set((workflow.nodes || []).map((n: any) => n.id));

        // Filter out edges that reference non-existent nodes
        const validEdges = (workflow.edges || []).filter((edge: any) => {
          const isValid = nodeIds.has(edge.source) && nodeIds.has(edge.target);
          if (!isValid) {
            console.log(`  ⚠️  Skipping invalid edge ${edge.id}: references non-existent node(s)`);
          }
          return isValid;
        });

        // Save workflow using WorkflowManager
        await workflowManager.saveWorkflow({
          name: workflow.name,
          description: workflow.description,
          projectPath: normalizedPath,
          nodes: workflow.nodes || [],
          edges: validEdges,
          triggers: workflow.triggers || [],
          customPrompts: workflow.customPrompts,
          enabled: workflow.enabled ?? true,
          isDefault: workflow.isDefault ?? false,
          lastRun: workflow.lastRun,
        });

        stats.workflows++;
        console.log(`  ✓ Migrated workflow: ${workflow.name}`);
      } catch (error) {
        const errorMsg = `Failed to migrate workflow ${file}: ${error}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to read workflows directory: ${error}`;
    console.error(`  ✗ ${errorMsg}`);
    stats.errors.push(errorMsg);
  }
}

/**
 * Migrate custom agents from custom-agents.json
 */
async function migrateCustomAgents(): Promise<void> {
  console.log('\n🤖 Migrating custom agents...');

  if (!fs.existsSync(CUSTOM_AGENTS_FILE)) {
    console.log('  ℹ️  No custom-agents.json found, skipping...');
    return;
  }

  try {
    const data = fs.readFileSync(CUSTOM_AGENTS_FILE, 'utf-8');
    const agents = JSON.parse(data);

    for (const agent of agents) {
      try {
        await prisma.customAgent.create({
          data: {
            name: agent.name,
            role: agent.role,
            emoji: agent.emoji || agent.icon || '🤖',
            color: agent.color || '#6366f1',
            description: agent.description || agent.systemPrompt || '',
            systemPrompt: agent.systemPrompt || agent.description || '',
            capabilities: agent.capabilities || [],
            tools: agent.tools || [],
            model: agent.model || 'sonnet',
            category: agent.category || 'custom',
            configVariables: agent.configVariables || null,
          },
        });

        stats.customAgents++;
        console.log(`  ✓ Migrated custom agent: ${agent.name}`);
      } catch (error) {
        const errorMsg = `Failed to migrate custom agent ${agent.name}: ${error}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to read custom-agents.json: ${error}`;
    console.error(`  ✗ ${errorMsg}`);
    stats.errors.push(errorMsg);
  }
}

/**
 * Migrate service category configs from category-configs directory
 */
async function migrateServiceCategoryConfigs(): Promise<void> {
  console.log('\n⚙️  Migrating service category configs...');

  const categoryConfigsDir = path.join(HOME_DIR, '.insurance-orchestrator', 'category-configs');

  if (!fs.existsSync(categoryConfigsDir)) {
    console.log('  ℹ️  No category configs directory found, skipping...');
    return;
  }

  try {
    const files = fs.readdirSync(categoryConfigsDir);
    const configFiles = files.filter(f => f.endsWith('.json'));

    for (const file of configFiles) {
      try {
        const filePath = path.join(categoryConfigsDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const config = JSON.parse(data);

        const normalizedPath = normalizePath(config.projectPath);

        await serviceCategoryManager.saveCategoryConfigAsync(
          normalizedPath,
          config.categoryId,
          config.configValues
        );

        stats.serviceCategoryConfigs++;
        console.log(`  ✓ Migrated category config: ${config.categoryId} for ${path.basename(normalizedPath)}`);
      } catch (error) {
        const errorMsg = `Failed to migrate category config ${file}: ${error}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to read category configs directory: ${error}`;
    console.error(`  ✗ ${errorMsg}`);
    stats.errors.push(errorMsg);
  }
}

/**
 * Migrate service node configs from services-config directories
 */
async function migrateServiceConfigs(): Promise<void> {
  console.log('\n⚙️  Migrating service node configs...');

  // Find all services-config directories recursively
  const serviceConfigDirs: string[] = [];

  function findServiceConfigDirs(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'services-config') {
            serviceConfigDirs.push(fullPath);
          } else {
            findServiceConfigDirs(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  // Search from home directory and current project
  findServiceConfigDirs(HOME_DIR);
  findServiceConfigDirs(process.cwd());

  if (serviceConfigDirs.length === 0) {
    console.log('  ℹ️  No services-config directories found, skipping...');
    return;
  }

  console.log(`  Found ${serviceConfigDirs.length} services-config directories`);

  for (const configDir of serviceConfigDirs) {
    try {
      const files = fs.readdirSync(configDir);
      const configFiles = files.filter(f => f.endsWith('.json'));

      for (const file of configFiles) {
        try {
          const filePath = path.join(configDir, file);
          const data = fs.readFileSync(filePath, 'utf-8');
          const config = JSON.parse(data);

          // Parse filename to extract nodeId and serviceId
          // Format: service-{serviceId}-{nodeId}.json or {nodeId}.json
          const filename = file.replace('.json', '');
          const parts = filename.split('-');

          // Try to infer project path from directory structure
          let projectPath = '';
          const dirParts = configDir.split(path.sep);
          const claudeIndex = dirParts.lastIndexOf('.claude');

          if (claudeIndex > 0) {
            const beforeClaude = dirParts.slice(0, claudeIndex);

            // Check if path contains '~/' pattern (incorrectly created path)
            const tildeIndex = beforeClaude.indexOf('~');
            if (tildeIndex >= 0) {
              // Reconstruct path from home directory
              projectPath = path.join(HOME_DIR, ...beforeClaude.slice(tildeIndex + 1));
            } else {
              projectPath = path.join('/', ...beforeClaude);
            }
          }

          if (!projectPath) {
            console.log(`  ⚠️  Skipping ${file}: could not determine project path`);
            continue;
          }

          const normalizedPath = normalizePath(projectPath);

          // NodeId is the full filename (service node instance ID)
          const nodeId = filename;

          // ServiceId is extracted from filename (e.g., "github-issues" from "service-github-issues-service-1762941096701")
          let serviceId = parts.length >= 3 ? parts.slice(1, -1).join('-') : parts[0];

          await prisma.serviceConfig.create({
            data: {
              projectPath: normalizedPath,
              nodeId,
              serviceId,
              configValues: config.configValues || config,
            },
          });

          stats.serviceConfigs++;
          console.log(`  ✓ Migrated service config: ${serviceId} for node ${nodeId}`);
        } catch (error) {
          const errorMsg = `Failed to migrate service config ${file}: ${error}`;
          console.error(`  ✗ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to read services-config directory ${configDir}: ${error}`;
      console.error(`  ✗ ${errorMsg}`);
      stats.errors.push(errorMsg);
    }
  }
}

/**
 * Migrate workflow execution history
 */
async function migrateExecutionHistory(): Promise<void> {
  console.log('\n📊 Migrating execution history...');

  if (!fs.existsSync(EXECUTIONS_DIR)) {
    console.log('  ℹ️  No execution history directory found, skipping...');
    return;
  }

  try {
    const files = fs.readdirSync(EXECUTIONS_DIR);
    const executionFiles = files.filter(f => f.endsWith('.json'));

    for (const file of executionFiles) {
      try {
        const filePath = path.join(EXECUTIONS_DIR, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const execution = JSON.parse(data);

        const normalizedPath = normalizePath(execution.projectPath);

        // Record execution using WorkflowManager
        await workflowManager.recordExecution({
          workflowId: execution.workflowId,
          projectPath: normalizedPath,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          status: execution.status,
          trigger: execution.trigger,
          triggerType: execution.triggerType,
          results: execution.results || [],
        });

        stats.executionHistory++;
        console.log(`  ✓ Migrated execution: ${file}`);
      } catch (error) {
        const errorMsg = `Failed to migrate execution ${file}: ${error}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to read execution history directory: ${error}`;
    console.error(`  ✗ ${errorMsg}`);
    stats.errors.push(errorMsg);
  }
}

/**
 * Print migration summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📈 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Projects migrated:              ${stats.projects}`);
  console.log(`✓ Workflows migrated:             ${stats.workflows}`);
  console.log(`✓ Custom agents migrated:         ${stats.customAgents}`);
  console.log(`✓ Service category configs:       ${stats.serviceCategoryConfigs}`);
  console.log(`✓ Service node configs:           ${stats.serviceConfigs}`);
  console.log(`✓ Execution history records:      ${stats.executionHistory}`);
  console.log(`✗ Errors encountered:             ${stats.errors.length}`);
  console.log('='.repeat(60));

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log('\n✅ Migration completed!\n');
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting database migration...\n');
  console.log('This will migrate all JSON data to MySQL database.');
  console.log(`Database: localhost:33080/zyra_orchestrator\n`);

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Create backup
    await createBackup();

    // Run migrations
    await migrateProjects();
    await migrateWorkflows();
    await migrateCustomAgents();
    await migrateServiceCategoryConfigs();
    await migrateServiceConfigs();
    await migrateExecutionHistory();

    // Print summary
    printSummary();

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate();
