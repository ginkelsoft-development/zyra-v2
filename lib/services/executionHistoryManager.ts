/**
 * Execution History Management
 * Track workflow execution history with timestamps, results, and errors
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExecutionHistoryEntry {
  id: string;
  workflowId: string;
  workflowName: string;
  projectPath: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number; // in milliseconds
  nodeResults: Array<{
    nodeId: string;
    nodeName: string;
    nodeType: 'agent' | 'service';
    status: 'success' | 'failure';
    output: string;
    timestamp: string;
  }>;
  error?: string;
  metadata?: {
    triggeredBy?: string;
    executionCount?: number;
  };
}

export class ExecutionHistoryManager {
  private historyDir: string;
  private historyFile: string;

  constructor() {
    this.historyDir = path.join(process.env.HOME || '', '.claude', 'execution-history');
    this.historyFile = path.join(this.historyDir, 'history.json');
  }

  /**
   * Load execution history from file
   */
  async loadHistory(): Promise<ExecutionHistoryEntry[]> {
    try {
      await fs.mkdir(this.historyDir, { recursive: true });
      const data = await fs.readFile(this.historyFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * Save execution history to file
   */
  private async saveHistory(history: ExecutionHistoryEntry[]): Promise<void> {
    await fs.mkdir(this.historyDir, { recursive: true });
    await fs.writeFile(
      this.historyFile,
      JSON.stringify(history, null, 2),
      'utf-8'
    );
  }

  /**
   * Add a new execution entry
   */
  async addExecution(entry: ExecutionHistoryEntry): Promise<void> {
    const history = await this.loadHistory();
    history.unshift(entry); // Add to beginning (most recent first)

    // Keep only last 100 executions
    if (history.length > 100) {
      history.splice(100);
    }

    await this.saveHistory(history);
  }

  /**
   * Update an existing execution entry
   */
  async updateExecution(id: string, updates: Partial<ExecutionHistoryEntry>): Promise<void> {
    const history = await this.loadHistory();
    const index = history.findIndex(e => e.id === id);

    if (index !== -1) {
      history[index] = { ...history[index], ...updates };
      await this.saveHistory(history);
    }
  }

  /**
   * Get execution history for a specific workflow
   */
  async getWorkflowHistory(workflowId: string): Promise<ExecutionHistoryEntry[]> {
    const history = await this.loadHistory();
    return history.filter(e => e.workflowId === workflowId);
  }

  /**
   * Get execution history for a specific project
   */
  async getProjectHistory(projectPath: string): Promise<ExecutionHistoryEntry[]> {
    const history = await this.loadHistory();
    return history.filter(e => e.projectPath === projectPath);
  }

  /**
   * Get recent execution history (last N entries)
   */
  async getRecentHistory(limit: number = 10): Promise<ExecutionHistoryEntry[]> {
    const history = await this.loadHistory();
    return history.slice(0, limit);
  }

  /**
   * Clear execution history
   */
  async clearHistory(): Promise<void> {
    await this.saveHistory([]);
  }

  /**
   * Delete a specific execution entry
   */
  async deleteExecution(id: string): Promise<void> {
    const history = await this.loadHistory();
    const filtered = history.filter(e => e.id !== id);
    await this.saveHistory(filtered);
  }

  /**
   * Get execution statistics
   */
  async getStatistics(): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    mostUsedWorkflow?: string;
  }> {
    const history = await this.loadHistory();

    const totalExecutions = history.length;
    const successfulExecutions = history.filter(e => e.status === 'completed').length;
    const failedExecutions = history.filter(e => e.status === 'failed').length;

    const durations = history
      .filter(e => e.duration)
      .map(e => e.duration!);
    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Find most used workflow
    const workflowCounts: Record<string, number> = {};
    history.forEach(e => {
      workflowCounts[e.workflowName] = (workflowCounts[e.workflowName] || 0) + 1;
    });

    const mostUsedWorkflow = Object.keys(workflowCounts).length > 0
      ? Object.entries(workflowCounts).sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration,
      mostUsedWorkflow,
    };
  }
}

export const executionHistoryManager = new ExecutionHistoryManager();
