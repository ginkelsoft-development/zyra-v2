import fs from 'fs';
import path from 'path';

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  workflowName: string;
  projectPath: string;
  enabled: boolean;
  schedule: {
    type: 'interval' | 'cron' | 'once';
    // For interval: run every X minutes/hours/days
    interval?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days';
    };
    // For cron: cron expression (e.g., "0 9 * * *" for daily at 9 AM)
    cron?: string;
    // For once: specific date/time
    once?: string; // ISO date string
  };
  lastRun?: string; // ISO date string
  nextRun?: string; // ISO date string
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

class WorkflowSchedulerManager {
  private schedulesFile: string;
  private schedules: Map<string, WorkflowSchedule>;
  private timers: Map<string, NodeJS.Timeout>;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.schedulesFile = path.join(dataDir, 'workflow-schedules.json');
    this.schedules = new Map();
    this.timers = new Map();
    this.loadSchedules();
  }

  private loadSchedules() {
    try {
      if (fs.existsSync(this.schedulesFile)) {
        const data = fs.readFileSync(this.schedulesFile, 'utf-8');
        const schedules: WorkflowSchedule[] = JSON.parse(data);
        schedules.forEach(schedule => {
          this.schedules.set(schedule.id, schedule);
        });
      }
    } catch (error) {
      console.error('Failed to load workflow schedules:', error);
    }
  }

  private saveSchedules() {
    try {
      const schedules = Array.from(this.schedules.values());
      fs.writeFileSync(this.schedulesFile, JSON.stringify(schedules, null, 2));
    } catch (error) {
      console.error('Failed to save workflow schedules:', error);
    }
  }

  private calculateNextRun(schedule: WorkflowSchedule): Date | null {
    const now = new Date();

    switch (schedule.schedule.type) {
      case 'interval':
        if (!schedule.schedule.interval) return null;

        const { value, unit } = schedule.schedule.interval;
        const lastRun = schedule.lastRun ? new Date(schedule.lastRun) : now;
        const nextRun = new Date(lastRun);

        switch (unit) {
          case 'minutes':
            nextRun.setMinutes(nextRun.getMinutes() + value);
            break;
          case 'hours':
            nextRun.setHours(nextRun.getHours() + value);
            break;
          case 'days':
            nextRun.setDate(nextRun.getDate() + value);
            break;
        }

        return nextRun;

      case 'once':
        if (!schedule.schedule.once) return null;
        const onceDate = new Date(schedule.schedule.once);
        return onceDate > now ? onceDate : null;

      case 'cron':
        // For cron, we'll use a simple parser
        // Format: "minute hour day month dayOfWeek"
        if (!schedule.schedule.cron) return null;
        return this.calculateNextCronRun(schedule.schedule.cron, now);

      default:
        return null;
    }
  }

  private calculateNextCronRun(cronExpression: string, from: Date): Date | null {
    // Simple cron parser - supports basic expressions
    // Format: "minute hour day month dayOfWeek"
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return null;

    const [minute, hour, day, month, dayOfWeek] = parts;
    const next = new Date(from);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Set minute
    if (minute !== '*') {
      next.setMinutes(parseInt(minute));
    }

    // Set hour
    if (hour !== '*') {
      next.setHours(parseInt(hour));
    }

    // If the calculated time is in the past, move to next day
    if (next <= from) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  createSchedule(
    workflowId: string,
    workflowName: string,
    projectPath: string,
    scheduleConfig: WorkflowSchedule['schedule']
  ): WorkflowSchedule {
    const id = `schedule-${Date.now()}`;
    const now = new Date().toISOString();

    const schedule: WorkflowSchedule = {
      id,
      workflowId,
      workflowName,
      projectPath,
      enabled: true,
      schedule: scheduleConfig,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Calculate next run
    const nextRun = this.calculateNextRun(schedule);
    if (nextRun) {
      schedule.nextRun = nextRun.toISOString();
    }

    this.schedules.set(id, schedule);
    this.saveSchedules();
    this.scheduleWorkflow(schedule);

    return schedule;
  }

  updateSchedule(id: string, updates: Partial<WorkflowSchedule>): WorkflowSchedule | null {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;

    // Clear existing timer
    this.clearSchedule(id);

    // Update schedule
    const updated = {
      ...schedule,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate next run if schedule config changed
    if (updates.schedule) {
      const nextRun = this.calculateNextRun(updated);
      updated.nextRun = nextRun ? nextRun.toISOString() : undefined;
    }

    this.schedules.set(id, updated);
    this.saveSchedules();

    // Reschedule if enabled
    if (updated.enabled) {
      this.scheduleWorkflow(updated);
    }

    return updated;
  }

  deleteSchedule(id: string): boolean {
    this.clearSchedule(id);
    const deleted = this.schedules.delete(id);
    if (deleted) {
      this.saveSchedules();
    }
    return deleted;
  }

  getSchedule(id: string): WorkflowSchedule | undefined {
    return this.schedules.get(id);
  }

  getAllSchedules(): WorkflowSchedule[] {
    return Array.from(this.schedules.values());
  }

  getSchedulesForWorkflow(workflowId: string, projectPath: string): WorkflowSchedule[] {
    return Array.from(this.schedules.values()).filter(
      s => s.workflowId === workflowId && s.projectPath === projectPath
    );
  }

  private scheduleWorkflow(schedule: WorkflowSchedule) {
    if (!schedule.enabled || !schedule.nextRun) return;

    const nextRun = new Date(schedule.nextRun);
    const now = new Date();
    const delay = nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // Should run now
      this.executeScheduledWorkflow(schedule.id);
      return;
    }

    // Schedule for future
    const timer = setTimeout(() => {
      this.executeScheduledWorkflow(schedule.id);
    }, delay);

    this.timers.set(schedule.id, timer);
  }

  private async executeScheduledWorkflow(scheduleId: string) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return;

    console.log(`[WorkflowScheduler] Executing scheduled workflow: ${schedule.workflowName}`);

    try {
      // Update last run and run count
      schedule.lastRun = new Date().toISOString();
      schedule.runCount++;

      // Calculate next run
      const nextRun = this.calculateNextRun(schedule);
      schedule.nextRun = nextRun ? nextRun.toISOString() : undefined;

      // If it's a "once" schedule and it has run, disable it
      if (schedule.schedule.type === 'once') {
        schedule.enabled = false;
      }

      this.schedules.set(scheduleId, schedule);
      this.saveSchedules();

      // Trigger workflow execution via background execution manager
      const response = await fetch('http://localhost:3000/api/background-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: schedule.projectPath,
          workflowId: schedule.workflowId,
          workflowName: schedule.workflowName,
          triggeredBy: 'scheduler',
        }),
      });

      if (!response.ok) {
        console.error(`[WorkflowScheduler] Failed to execute workflow: ${response.statusText}`);
      }

      // Schedule next run if enabled
      if (schedule.enabled && schedule.nextRun) {
        this.scheduleWorkflow(schedule);
      }
    } catch (error) {
      console.error(`[WorkflowScheduler] Error executing scheduled workflow:`, error);
    }
  }

  private clearSchedule(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  // Initialize all enabled schedules on startup
  initializeSchedules() {
    console.log('[WorkflowScheduler] Initializing schedules...');
    this.schedules.forEach(schedule => {
      if (schedule.enabled) {
        // Recalculate next run in case server was down
        const nextRun = this.calculateNextRun(schedule);
        if (nextRun) {
          schedule.nextRun = nextRun.toISOString();
          this.schedules.set(schedule.id, schedule);
          this.scheduleWorkflow(schedule);
        }
      }
    });
    this.saveSchedules();
    console.log(`[WorkflowScheduler] Initialized ${this.schedules.size} schedules`);
  }

  // Cleanup on shutdown
  shutdown() {
    console.log('[WorkflowScheduler] Shutting down...');
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// Singleton instance
let schedulerInstance: WorkflowSchedulerManager | null = null;

export function getWorkflowScheduler(): WorkflowSchedulerManager {
  if (!schedulerInstance) {
    schedulerInstance = new WorkflowSchedulerManager();
    // Initialize schedules on first access
    schedulerInstance.initializeSchedules();
  }
  return schedulerInstance;
}

export default WorkflowSchedulerManager;
