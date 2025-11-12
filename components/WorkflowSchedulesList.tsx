'use client';

import { useState, useEffect } from 'react';
import { WorkflowSchedule } from '@/lib/services/workflowScheduler';

interface WorkflowSchedulesListProps {
  workflowId: string;
  projectPath: string;
  onRefresh?: () => void;
}

export default function WorkflowSchedulesList({
  workflowId,
  projectPath,
  onRefresh,
}: WorkflowSchedulesListProps) {
  const [schedules, setSchedules] = useState<WorkflowSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/workflow-schedules?workflowId=${encodeURIComponent(workflowId)}&projectPath=${encodeURIComponent(projectPath)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();

    // Auto-refresh every 30 seconds to update schedule status
    const refreshInterval = setInterval(() => {
      fetchSchedules();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [workflowId, projectPath]);

  // Update current time every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleToggleEnabled = async (scheduleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/workflow-schedules?id=${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }

      fetchSchedules();
      onRefresh?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/workflow-schedules?id=${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      fetchSchedules();
      onRefresh?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatSchedule = (schedule: WorkflowSchedule['schedule']) => {
    switch (schedule.type) {
      case 'interval':
        return `Every ${schedule.interval?.value} ${schedule.interval?.unit}`;
      case 'cron':
        return `Cron: ${schedule.cron}`;
      case 'once':
        return `Once: ${new Date(schedule.once!).toLocaleString()}`;
      default:
        return 'Unknown';
    }
  };

  const formatNextRun = (nextRun?: string) => {
    if (!nextRun) return 'Not scheduled';
    const date = new Date(nextRun);
    const diff = date.getTime() - currentTime.getTime();

    if (diff < 0) return 'Overdue - Running...';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `in ${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `in ${minutes}m ${seconds}s`;
    }
    return `in ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">No schedules configured for this workflow</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  schedule.enabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {schedule.enabled ? 'Active' : 'Disabled'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                  {schedule.schedule.type}
                </span>
              </div>

              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {formatSchedule(schedule.schedule)}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>Next run: {formatNextRun(schedule.nextRun)}</span>
                <span>•</span>
                <span>Runs: {schedule.runCount}</span>
                {schedule.lastRun && (
                  <>
                    <span>•</span>
                    <span>Last: {new Date(schedule.lastRun).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleToggleEnabled(schedule.id, schedule.enabled)}
                className={`p-2 rounded-lg transition-colors ${
                  schedule.enabled
                    ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                    : 'hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}
                title={schedule.enabled ? 'Disable schedule' : 'Enable schedule'}
              >
                {schedule.enabled ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => handleDelete(schedule.id)}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                title="Delete schedule"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
