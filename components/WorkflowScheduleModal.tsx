'use client';

import { useState, useEffect } from 'react';
import { WorkflowSchedule } from '@/lib/services/workflowScheduler';

interface WorkflowScheduleModalProps {
  workflowId: string;
  workflowName: string;
  projectPath: string;
  onClose: () => void;
  onScheduleCreated?: () => void;
}

export default function WorkflowScheduleModal({
  workflowId,
  workflowName,
  projectPath,
  onClose,
  onScheduleCreated,
}: WorkflowScheduleModalProps) {
  const [scheduleType, setScheduleType] = useState<'interval' | 'cron' | 'once'>('interval');
  const [intervalValue, setIntervalValue] = useState('30');
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [onceDateTime, setOnceDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let scheduleConfig: any = { type: scheduleType };

      if (scheduleType === 'interval') {
        scheduleConfig.interval = {
          value: parseInt(intervalValue),
          unit: intervalUnit,
        };
      } else if (scheduleType === 'cron') {
        scheduleConfig.cron = cronExpression;
      } else if (scheduleType === 'once') {
        scheduleConfig.once = onceDateTime;
      }

      const response = await fetch('/api/workflow-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          workflowName,
          projectPath,
          schedule: scheduleConfig,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create schedule');
      }

      onScheduleCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Workflow</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{workflowName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Schedule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Schedule Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleType('interval')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scheduleType === 'interval'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                  }`}
                >
                  <div className="text-center">
                    <svg className="w-6 h-6 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Interval</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('cron')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scheduleType === 'cron'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                  }`}
                >
                  <div className="text-center">
                    <svg className="w-6 h-6 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Cron</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('once')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scheduleType === 'once'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                  }`}
                >
                  <div className="text-center">
                    <svg className="w-6 h-6 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Once</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Interval Configuration */}
            {scheduleType === 'interval' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Run every
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <select
                    value={intervalUnit}
                    onChange={(e) => setIntervalUnit(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Workflow will run every {intervalValue} {intervalUnit}
                </p>
              </div>
            )}

            {/* Cron Configuration */}
            {scheduleType === 'cron' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 9 * * *"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium mb-2">Format: minute hour day month dayOfWeek</p>
                  <p>Examples:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
                    <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">0 9 * * *</code> - Daily at 9:00 AM</li>
                    <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">0 */4 * * *</code> - Every 4 hours</li>
                    <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">0 0 * * 1</code> - Every Monday at midnight</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Once Configuration */}
            {scheduleType === 'once' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={onceDateTime}
                  onChange={(e) => setOnceDateTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Workflow will run once at the specified date and time
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
