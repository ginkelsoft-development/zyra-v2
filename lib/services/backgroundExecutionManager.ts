// Background Execution Manager
// Tracks background workflow executions and their status

export interface BackgroundExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  projectPath: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  currentNode?: string;
  progress: number; // 0-100
  totalNodes: number;
  completedNodes: number;
  logs: string[];
  error?: string;
}

class BackgroundExecutionManager {
  private executions: Map<string, BackgroundExecution> = new Map();
  private listeners: Map<string, Set<(execution: BackgroundExecution) => void>> = new Map();

  // Create a new background execution
  createExecution(workflowId: string, workflowName: string, projectPath: string, totalNodes: number): string {
    const id = `bg_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: BackgroundExecution = {
      id,
      workflowId,
      workflowName,
      projectPath,
      status: 'running',
      startTime: new Date().toISOString(),
      progress: 0,
      totalNodes,
      completedNodes: 0,
      logs: [],
    };

    this.executions.set(id, execution);
    this.notifyListeners(id);

    return id;
  }

  // Update execution status
  updateExecution(id: string, updates: Partial<BackgroundExecution>) {
    const execution = this.executions.get(id);
    if (!execution) return;

    Object.assign(execution, updates);

    // Calculate progress
    if (updates.completedNodes !== undefined && execution.totalNodes > 0) {
      execution.progress = Math.round((execution.completedNodes / execution.totalNodes) * 100);
    }

    this.notifyListeners(id);
  }

  // Add log to execution
  addLog(id: string, log: string) {
    const execution = this.executions.get(id);
    if (!execution) return;

    execution.logs.push(`[${new Date().toLocaleTimeString()}] ${log}`);
    this.notifyListeners(id);
  }

  // Mark node as completed
  completeNode(id: string, nodeName: string) {
    const execution = this.executions.get(id);
    if (!execution) return;

    execution.completedNodes++;
    execution.currentNode = nodeName;
    execution.progress = Math.round((execution.completedNodes / execution.totalNodes) * 100);

    this.addLog(id, `✅ Completed: ${nodeName}`);
    this.notifyListeners(id);
  }

  // Complete execution
  completeExecution(id: string) {
    const execution = this.executions.get(id);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = new Date().toISOString();
    execution.progress = 100;

    this.addLog(id, '✅ Workflow completed successfully');
    this.notifyListeners(id);
  }

  // Fail execution
  failExecution(id: string, error: string) {
    const execution = this.executions.get(id);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date().toISOString();
    execution.error = error;

    this.addLog(id, `❌ Workflow failed: ${error}`);
    this.notifyListeners(id);
  }

  // Cancel execution
  cancelExecution(id: string) {
    const execution = this.executions.get(id);
    if (!execution) return;

    execution.status = 'cancelled';
    execution.endTime = new Date().toISOString();

    this.addLog(id, '🛑 Workflow cancelled');
    this.notifyListeners(id);
  }

  // Get execution by ID
  getExecution(id: string): BackgroundExecution | undefined {
    return this.executions.get(id);
  }

  // Get all executions
  getAllExecutions(): BackgroundExecution[] {
    return Array.from(this.executions.values());
  }

  // Get running executions
  getRunningExecutions(): BackgroundExecution[] {
    return Array.from(this.executions.values()).filter(e => e.status === 'running');
  }

  // Subscribe to execution updates
  subscribe(id: string, callback: (execution: BackgroundExecution) => void) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(id);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Notify listeners of execution update
  private notifyListeners(id: string) {
    const execution = this.executions.get(id);
    const listeners = this.listeners.get(id);

    if (execution && listeners) {
      listeners.forEach(callback => callback(execution));
    }
  }

  // Clean up old executions (keep last 50)
  cleanup() {
    const executions = Array.from(this.executions.entries());
    if (executions.length > 50) {
      executions
        .sort((a, b) => new Date(b[1].startTime).getTime() - new Date(a[1].startTime).getTime())
        .slice(50)
        .forEach(([id]) => {
          this.executions.delete(id);
          this.listeners.delete(id);
        });
    }
  }
}

// Singleton instance
export const backgroundExecutionManager = new BackgroundExecutionManager();
