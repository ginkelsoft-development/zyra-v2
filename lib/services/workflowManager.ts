/**
 * Workflow Management Service (Database Version)
 * Save, load, and execute project workflows using MySQL database
 */

import * as path from 'path';
import { prisma } from '../db/prisma';

export interface WorkflowNode {
  id: string;
  agentId: string;
  agentRole: string;
  agentName?: string;
  position: { x: number; y: number };
  serviceId?: string;
  serviceName?: string;
  nodeType?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: {
    type: string;
    label?: string;
    variableName?: string;
    operator?: string;
    value?: string;
  };
}

export interface WorkflowTrigger {
  type: 'manual' | 'git-commit' | 'git-push' | 'scheduled' | 'file-change';
  config?: {
    schedule?: string;
    filePattern?: string;
    branch?: string;
  };
}

export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  projectPath: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggers: WorkflowTrigger[];
  customPrompts?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  enabled: boolean;
  isDefault?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  projectPath: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: 'manual' | 'automatic';
  triggerType?: string;
  results: Array<{
    agent: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
    error?: string;
  }>;
}

export interface WorkflowTemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'multiselect';
  description: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'github' | 'ci-cd' | 'monitoring' | 'notifications' | 'custom';
  icon: string;
  color: string;
  agents: Array<{
    agentId: string;
    role: string;
    position: { x: number; y: number };
    configRequired?: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
  variables: WorkflowTemplateVariable[];
  triggers?: WorkflowTrigger[];
}

export class WorkflowManager {
  /**
   * Normalize path to ensure consistency
   */
  private normalizePath(projectPath: string): string {
    if (projectPath.startsWith('~/')) {
      const homeDir = process.env.HOME || '';
      return path.join(homeDir, projectPath.slice(2));
    }
    return projectPath;
  }

  /**
   * Get workflow templates (these are hardcoded for now)
   */
  getWorkflowTemplates(): WorkflowTemplate[] {
    // Return the same templates as before
    // These can be moved to database later if needed
    return [];
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(workflow: Omit<SavedWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedWorkflow> {
    const normalizedPath = this.normalizePath(workflow.projectPath);

    // Ensure project exists
    await prisma.project.upsert({
      where: { path: normalizedPath },
      update: {},
      create: {
        name: path.basename(normalizedPath),
        path: normalizedPath,
      },
    });

    // Check if workflow with this name already exists for this project
    const existing = await prisma.workflow.findFirst({
      where: {
        name: workflow.name,
        projectPath: normalizedPath,
      },
    });

    let savedWorkflow;

    if (existing) {
      // Update existing workflow
      savedWorkflow = await prisma.workflow.update({
        where: { id: existing.id },
        data: {
          description: workflow.description,
          enabled: workflow.enabled,
          isDefault: workflow.isDefault,
          lastRun: workflow.lastRun ? new Date(workflow.lastRun) : undefined,
        },
        include: {
          nodes: true,
          edges: {
            include: {
              edgeConditions: true,
            },
          },
          triggers: true,
        },
      });

      // Delete old nodes, edges, and triggers
      await prisma.workflowNode.deleteMany({ where: { workflowId: existing.id } });
      await prisma.workflowEdge.deleteMany({ where: { workflowId: existing.id } });
      await prisma.workflowTrigger.deleteMany({ where: { workflowId: existing.id } });
    } else {
      // Create new workflow
      savedWorkflow = await prisma.workflow.create({
        data: {
          name: workflow.name,
          description: workflow.description,
          projectPath: normalizedPath,
          enabled: workflow.enabled ?? true,
          isDefault: workflow.isDefault ?? false,
          lastRun: workflow.lastRun ? new Date(workflow.lastRun) : undefined,
        },
        include: {
          nodes: true,
          edges: {
            include: {
              edgeConditions: true,
            },
          },
          triggers: true,
        },
      });
    }

    // Create nodes
    if (workflow.nodes && workflow.nodes.length > 0) {
      await prisma.workflowNode.createMany({
        data: workflow.nodes.map(node => ({
          workflowId: savedWorkflow.id,
          nodeId: node.id,
          agentId: node.agentId,
          agentRole: node.agentRole,
          agentName: node.agentName,
          serviceId: node.serviceId,
          serviceName: node.serviceName,
          nodeType: node.nodeType || 'agent',
          positionX: node.position.x,
          positionY: node.position.y,
          customPrompt: workflow.customPrompts?.[node.id],
        })),
      });
    }

    // Create edges
    if (workflow.edges && workflow.edges.length > 0) {
      await prisma.workflowEdge.createMany({
        data: workflow.edges.map(edge => ({
          workflowId: savedWorkflow.id,
          edgeId: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
        })),
      });

      // Create edge conditions for edges that have them
      const edgesWithConditions = workflow.edges.filter(edge => edge.condition);
      if (edgesWithConditions.length > 0) {
        for (const edge of edgesWithConditions) {
          await prisma.edgeCondition.create({
            data: {
              workflowId: savedWorkflow.id,
              edgeId: edge.id,
              conditionType: edge.condition!.type,
              variableName: edge.condition!.variableName,
              operator: edge.condition!.operator,
              value: edge.condition!.value,
            },
          });
        }
      }
    }

    // Create triggers
    if (workflow.triggers && workflow.triggers.length > 0) {
      await prisma.workflowTrigger.createMany({
        data: workflow.triggers.map(trigger => ({
          workflowId: savedWorkflow.id,
          triggerType: trigger.type,
          schedule: trigger.config?.schedule,
          filePattern: trigger.config?.filePattern,
          branch: trigger.config?.branch,
        })),
      });
    }

    // Return formatted workflow
    return this.formatWorkflow(savedWorkflow);
  }

  /**
   * Load all workflows for a project
   */
  async loadWorkflowsForProject(projectPath: string): Promise<SavedWorkflow[]> {
    const normalizedPath = this.normalizePath(projectPath);

    const workflows = await prisma.workflow.findMany({
      where: { projectPath: normalizedPath },
      include: {
        nodes: true,
        edges: {
          include: {
            edgeConditions: true,
          },
        },
        triggers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return workflows.map(w => this.formatWorkflow(w));
  }

  /**
   * Load a specific workflow by ID
   */
  async loadWorkflow(workflowId: string): Promise<SavedWorkflow | null> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: true,
        edges: {
          include: {
            edgeConditions: true,
          },
        },
        triggers: true,
      },
    });

    if (!workflow) return null;

    return this.formatWorkflow(workflow);
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await prisma.workflow.delete({
      where: { id: workflowId },
    });
  }

  /**
   * Toggle workflow enabled status
   */
  async setWorkflowEnabled(workflowId: string, enabled: boolean): Promise<void> {
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { enabled },
    });
  }

  /**
   * Record workflow execution
   */
  async recordExecution(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution> {
    const normalizedPath = this.normalizePath(execution.projectPath);

    const saved = await prisma.workflowExecution.create({
      data: {
        workflowId: execution.workflowId,
        projectPath: normalizedPath,
        status: execution.status,
        trigger: execution.trigger,
        triggerType: execution.triggerType,
        startedAt: new Date(execution.startedAt),
        completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
      },
    });

    // Update workflow's lastRun
    await prisma.workflow.update({
      where: { id: execution.workflowId },
      data: { lastRun: new Date(execution.startedAt) },
    });

    return {
      id: saved.id,
      workflowId: saved.workflowId,
      projectPath: saved.projectPath,
      startedAt: saved.startedAt.toISOString(),
      completedAt: saved.completedAt?.toISOString(),
      status: saved.status as any,
      trigger: saved.trigger as any,
      triggerType: saved.triggerType || undefined,
      results: execution.results,
    };
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId: string, limit: number = 50): Promise<WorkflowExecution[]> {
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return executions.map(e => ({
      id: e.id,
      workflowId: e.workflowId,
      projectPath: e.projectPath,
      startedAt: e.startedAt.toISOString(),
      completedAt: e.completedAt?.toISOString(),
      status: e.status as any,
      trigger: e.trigger as any,
      triggerType: e.triggerType || undefined,
      results: [],
    }));
  }

  /**
   * Format database workflow to API format
   */
  private formatWorkflow(workflow: any): SavedWorkflow {
    // Build customPrompts map
    const customPrompts: Record<string, string> = {};
    workflow.nodes.forEach((node: any) => {
      if (node.customPrompt) {
        customPrompts[node.nodeId] = node.customPrompt;
      }
    });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      projectPath: workflow.projectPath,
      nodes: workflow.nodes.map((node: any) => ({
        id: node.nodeId,
        agentId: node.agentId || '',
        agentRole: node.agentRole,
        agentName: node.agentName || undefined,
        position: { x: node.positionX, y: node.positionY },
        serviceId: node.serviceId || undefined,
        serviceName: node.serviceName || undefined,
        nodeType: node.nodeType || 'agent',
      })),
      edges: workflow.edges.map((edge: any) => {
        const edgeData: WorkflowEdge = {
          id: edge.edgeId,
          source: edge.source,
          target: edge.target,
          label: edge.label || undefined,
        };

        // Add condition if edge has conditions
        if (edge.edgeConditions && edge.edgeConditions.length > 0) {
          const condition = edge.edgeConditions[0]; // Take first condition
          edgeData.condition = {
            type: condition.conditionType,
            label: condition.label || undefined,
            variableName: condition.variableName || undefined,
            operator: condition.operator || undefined,
            value: condition.value || undefined,
          };
        }

        return edgeData;
      }),
      triggers: workflow.triggers.map((trigger: any) => ({
        type: trigger.triggerType,
        config: {
          schedule: trigger.schedule || undefined,
          filePattern: trigger.filePattern || undefined,
          branch: trigger.branch || undefined,
        },
      })),
      customPrompts: Object.keys(customPrompts).length > 0 ? customPrompts : undefined,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      lastRun: workflow.lastRun?.toISOString(),
      enabled: workflow.enabled,
      isDefault: workflow.isDefault,
    };
  }
}

// Export singleton instance
export const workflowManager = new WorkflowManager();
