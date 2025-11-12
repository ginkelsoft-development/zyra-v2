/**
 * Service Category Manager (Database Version)
 *
 * Manages project-specific configuration for service categories using MySQL database.
 * Each project can have its own configuration for GitHub, Slack, Email, etc.
 */

import * as path from 'path';
import { prisma } from '../db/prisma';
import { ServiceCategory, getServiceCategory } from './serviceCategories';

export interface CategoryConfiguration {
  categoryId: string;
  projectPath: string;
  configValues: Record<string, string>;
  updatedAt: string;
}

class ServiceCategoryManager {
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
   * Get category configuration for a specific project
   */
  getCategoryConfig(projectPath: string, categoryId: string): CategoryConfiguration | null {
    try {
      const normalizedPath = this.normalizePath(projectPath);

      // Use synchronous Prisma call (wrap in async and use top-level await in Next.js)
      // For now, return null and use the async version
      return null;
    } catch (error) {
      console.error(`Error reading category config for ${categoryId} in ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Get category configuration for a specific project (async version)
   */
  async getCategoryConfigAsync(projectPath: string, categoryId: string): Promise<CategoryConfiguration | null> {
    try {
      const normalizedPath = this.normalizePath(projectPath);

      const config = await prisma.serviceCategoryConfig.findUnique({
        where: {
          projectPath_categoryId: {
            projectPath: normalizedPath,
            categoryId,
          },
        },
      });

      if (!config) return null;

      return {
        categoryId: config.categoryId,
        projectPath: config.projectPath,
        configValues: config.configValues as Record<string, string>,
        updatedAt: config.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error(`Error reading category config for ${categoryId} in ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Save category configuration for a specific project
   */
  saveCategoryConfig(projectPath: string, categoryId: string, configValues: Record<string, string>): CategoryConfiguration {
    // This needs to be async, but keeping signature for backward compatibility
    // Use saveCategoryConfigAsync instead
    throw new Error('Use saveCategoryConfigAsync instead');
  }

  /**
   * Save category configuration for a specific project (async version)
   */
  async saveCategoryConfigAsync(
    projectPath: string,
    categoryId: string,
    configValues: Record<string, string>
  ): Promise<CategoryConfiguration> {
    try {
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

      // Upsert category config
      const config = await prisma.serviceCategoryConfig.upsert({
        where: {
          projectPath_categoryId: {
            projectPath: normalizedPath,
            categoryId,
          },
        },
        update: {
          configValues,
        },
        create: {
          projectPath: normalizedPath,
          categoryId,
          configValues,
        },
      });

      return {
        categoryId: config.categoryId,
        projectPath: config.projectPath,
        configValues: config.configValues as Record<string, string>,
        updatedAt: config.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error(`Error saving category config for ${categoryId} in ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Get all category configurations for a specific project
   */
  getAllCategoryConfigs(projectPath: string): CategoryConfiguration[] {
    // This needs to be async, use getAllCategoryConfigsAsync instead
    return [];
  }

  /**
   * Get all category configurations for a specific project (async version)
   */
  async getAllCategoryConfigsAsync(projectPath: string): Promise<CategoryConfiguration[]> {
    try {
      const normalizedPath = this.normalizePath(projectPath);

      const configs = await prisma.serviceCategoryConfig.findMany({
        where: { projectPath: normalizedPath },
      });

      return configs.map(c => ({
        categoryId: c.categoryId,
        projectPath: c.projectPath,
        configValues: c.configValues as Record<string, string>,
        updatedAt: c.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error(`Error getting all category configs for ${projectPath}:`, error);
      return [];
    }
  }

  /**
   * Delete category configuration for a specific project
   */
  async deleteCategoryConfig(projectPath: string, categoryId: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(projectPath);

      await prisma.serviceCategoryConfig.delete({
        where: {
          projectPath_categoryId: {
            projectPath: normalizedPath,
            categoryId,
          },
        },
      });
    } catch (error) {
      console.error(`Error deleting category config for ${categoryId} in ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific configuration value from a category
   */
  getConfigValue(projectPath: string, categoryId: string, key: string): string | null {
    const config = this.getCategoryConfig(projectPath, categoryId);
    return config?.configValues[key] || null;
  }

  /**
   * Get a specific configuration value from a category (async version)
   */
  async getConfigValueAsync(projectPath: string, categoryId: string, key: string): Promise<string | null> {
    const config = await this.getCategoryConfigAsync(projectPath, categoryId);
    return config?.configValues[key] || null;
  }

  /**
   * Check if a project has configuration for a specific category
   */
  async hasCategoryConfig(projectPath: string, categoryId: string): Promise<boolean> {
    const config = await this.getCategoryConfigAsync(projectPath, categoryId);
    return config !== null;
  }
}

// Export singleton instance
const serviceCategoryManager = new ServiceCategoryManager();
export function getServiceCategoryManager(): ServiceCategoryManager {
  return serviceCategoryManager;
}

export default serviceCategoryManager;
