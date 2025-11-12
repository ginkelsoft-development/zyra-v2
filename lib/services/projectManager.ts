/**
 * Project Manager Service (Database Version)
 * Manages projects and their agent configurations using MySQL database
 */

import * as path from 'path';
import { prisma } from '../db/prisma';
import { Project, ProjectAgentConfig } from './projectAnalyzer';

export class ProjectManager {
  /**
   * Normalize path to ensure consistency (expand tilde)
   */
  private normalizePath(projectPath: string): string {
    if (projectPath.startsWith('~/')) {
      const homeDir = process.env.HOME || '';
      return path.join(homeDir, projectPath.slice(2));
    }
    return projectPath;
  }

  /**
   * Load all projects from database
   */
  async loadProjects(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      include: {
        agentConfigs: true,
      },
    });

    return projects.map(p => ({
      name: p.name,
      path: p.path,
      agents: p.agentConfigs.map(ac => ({
        nodeId: ac.nodeId,
        agentId: ac.agentId,
        configValues: ac.configValues as Record<string, string>,
      })),
    }));
  }

  /**
   * Add or update a project
   */
  async saveProject(project: Project): Promise<void> {
    const normalizedPath = this.normalizePath(project.path);

    await prisma.project.upsert({
      where: { path: normalizedPath },
      update: {
        name: project.name,
      },
      create: {
        name: project.name,
        path: normalizedPath,
      },
    });
  }

  /**
   * Get a specific project by path
   */
  async getProject(projectPath: string): Promise<Project | null> {
    const normalizedPath = this.normalizePath(projectPath);

    const project = await prisma.project.findUnique({
      where: { path: normalizedPath },
      include: {
        agentConfigs: true,
      },
    });

    if (!project) return null;

    return {
      name: project.name,
      path: project.path,
      agents: project.agentConfigs.map(ac => ({
        nodeId: ac.nodeId,
        agentId: ac.agentId,
        configValues: ac.configValues as Record<string, string>,
      })),
    };
  }

  /**
   * Add an agent to a project (without configuration)
   */
  async addAgentToProject(projectPath: string, agentId: string): Promise<void> {
    const normalizedPath = this.normalizePath(projectPath);

    // Ensure project exists
    await prisma.project.upsert({
      where: { path: normalizedPath },
      update: {},
      create: {
        name: path.basename(normalizedPath),
        path: normalizedPath,
      },
    });

    // Check if agent config already exists (for backward compatibility with old nodeId-less configs)
    const existing = await prisma.agentConfig.findFirst({
      where: {
        projectPath: normalizedPath,
        agentId,
        nodeId: agentId, // Old behavior: nodeId === agentId
      },
    });

    if (!existing) {
      await prisma.agentConfig.create({
        data: {
          projectPath: normalizedPath,
          nodeId: agentId,
          agentId,
          configValues: {},
        },
      });
    }
  }

  /**
   * Remove an agent from a project
   */
  async removeAgentFromProject(projectPath: string, agentId: string): Promise<void> {
    const normalizedPath = this.normalizePath(projectPath);

    await prisma.agentConfig.deleteMany({
      where: {
        projectPath: normalizedPath,
        agentId,
      },
    });
  }

  /**
   * Configure a workflow node (agent or service) for a specific project
   * NOTE: Uses nodeId to allow multiple instances of same agent/service with different configs
   */
  async configureNode(
    projectPath: string,
    nodeId: string,
    agentId: string,
    configValues: Record<string, string>
  ): Promise<void> {
    const normalizedPath = this.normalizePath(projectPath);

    // Ensure project exists
    await prisma.project.upsert({
      where: { path: normalizedPath },
      update: {},
      create: {
        name: path.basename(normalizedPath),
        path: normalizedPath,
      },
    });

    // Upsert agent config
    await prisma.agentConfig.upsert({
      where: {
        projectPath_nodeId: {
          projectPath: normalizedPath,
          nodeId,
        },
      },
      update: {
        agentId,
        configValues,
      },
      create: {
        projectPath: normalizedPath,
        nodeId,
        agentId,
        configValues,
      },
    });
  }

  /**
   * Get configuration for a specific node
   */
  async getNodeConfig(
    projectPath: string,
    nodeId: string
  ): Promise<Record<string, string> | null> {
    const normalizedPath = this.normalizePath(projectPath);

    const config = await prisma.agentConfig.findUnique({
      where: {
        projectPath_nodeId: {
          projectPath: normalizedPath,
          nodeId,
        },
      },
    });

    return config ? (config.configValues as Record<string, string>) : null;
  }

  /**
   * Delete a project and all its configurations
   */
  async deleteProject(projectPath: string): Promise<void> {
    const normalizedPath = this.normalizePath(projectPath);

    await prisma.project.delete({
      where: { path: normalizedPath },
    });
  }

  /**
   * Get all agent configs for a project
   */
  async getProjectAgentConfigs(projectPath: string): Promise<ProjectAgentConfig[]> {
    const normalizedPath = this.normalizePath(projectPath);

    const configs = await prisma.agentConfig.findMany({
      where: { projectPath: normalizedPath },
    });

    return configs.map(c => ({
      nodeId: c.nodeId,
      agentId: c.agentId,
      configValues: c.configValues as Record<string, string>,
    }));
  }
}

// Export singleton instance
export const projectManager = new ProjectManager();
