/**
 * Project Analyzer Types and Utilities
 * Defines types for project management
 */

export interface ProjectAgentConfig {
  nodeId: string;
  agentId: string;
  configValues: Record<string, string>;
}

export interface Project {
  name: string;
  path: string;
  agents?: ProjectAgentConfig[];
}

export interface ProjectAnalyzer {
  addProject(sourcePath: string): Promise<Project>;
  analyzeProject(sourcePath: string): Promise<Project>;
  getProject(projectPath: string): Promise<Project | null>;
  listProjects(): Promise<Project[]>;
}

// Simple implementation that uses the database
import { prisma } from '../db/prisma';
import * as path from 'path';
import * as fs from 'fs';

class ProjectAnalyzerImpl implements ProjectAnalyzer {
  private normalizePath(projectPath: string): string {
    if (projectPath.startsWith('~/')) {
      const homeDir = process.env.HOME || '';
      return path.join(homeDir, projectPath.slice(2));
    }
    return path.resolve(projectPath);
  }

  async addProject(sourcePath: string): Promise<Project> {
    const normalizedPath = this.normalizePath(sourcePath);

    // Check if path exists
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Path does not exist: ${normalizedPath}`);
    }

    // Get project name from path
    const projectName = path.basename(normalizedPath);

    // Check if project already exists
    const existing = await prisma.project.findUnique({
      where: { path: normalizedPath },
      include: { agentConfigs: true },
    });

    if (existing) {
      return {
        name: existing.name,
        path: existing.path,
        agents: existing.agentConfigs.map(ac => ({
          nodeId: ac.nodeId,
          agentId: ac.agentId,
          configValues: ac.configValues as Record<string, string>,
        })),
      };
    }

    // Create new project
    const project = await prisma.project.create({
      data: {
        name: projectName,
        path: normalizedPath,
      },
      include: { agentConfigs: true },
    });

    return {
      name: project.name,
      path: project.path,
      agents: [],
    };
  }

  async analyzeProject(sourcePath: string): Promise<Project> {
    return this.addProject(sourcePath);
  }

  async getProject(projectPath: string): Promise<Project | null> {
    const normalizedPath = this.normalizePath(projectPath);

    const project = await prisma.project.findUnique({
      where: { path: normalizedPath },
      include: { agentConfigs: true },
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

  async listProjects(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      include: { agentConfigs: true },
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
}

// Export singleton instance
export const projectAnalyzer = new ProjectAnalyzerImpl();
