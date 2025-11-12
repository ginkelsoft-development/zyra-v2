'use client';

import { useState, useEffect } from 'react';

interface Statistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  mostUsedWorkflow?: string;
}

interface ExecutionHistoryEntry {
  id: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
}

export default function StatisticsDashboard() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<ExecutionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load statistics
      const statsRes = await fetch('/api/execution-history/statistics');
      const statsData = await statsRes.json();
      setStatistics(statsData.statistics);

      // Load recent executions
      const historyRes = await fetch('/api/execution-history?limit=5');
      const historyData = await historyRes.json();
      setRecentExecutions(historyData.history || []);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900 text-green-200';
      case 'failed':
        return 'bg-red-900 text-red-200';
      case 'running':
        return 'bg-blue-900 text-blue-200';
      case 'cancelled':
        return 'bg-yellow-900 text-yellow-200';
      default:
        return 'bg-gray-800 text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '⟳';
      case 'cancelled':
        return '⚠';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading statistics...</p>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="p-6 text-center text-gray-400">
        No statistics available
      </div>
    );
  }

  const successRate = statistics.totalExecutions > 0
    ? (statistics.successfulExecutions / statistics.totalExecutions) * 100
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Workflow Statistics</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Executions */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Executions</span>
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{statistics.totalExecutions}</p>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-br from-green-900/30 to-gray-800 rounded-xl p-6 border border-green-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Success Rate</span>
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-green-400">{successRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{statistics.successfulExecutions} successful</p>
        </div>

        {/* Failed Executions */}
        <div className="bg-gradient-to-br from-red-900/30 to-gray-800 rounded-xl p-6 border border-red-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Failed</span>
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-red-400">{statistics.failedExecutions}</p>
        </div>

        {/* Average Duration */}
        <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 rounded-xl p-6 border border-purple-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg Duration</span>
            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-purple-400">
            {formatDuration(statistics.averageDuration)}
          </p>
        </div>
      </div>

      {/* Most Used Workflow */}
      {statistics.mostUsedWorkflow && (
        <div className="bg-gradient-to-br from-amber-900/20 to-gray-800 rounded-xl p-6 border border-amber-700/50">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="text-sm text-gray-400">Most Used Workflow</p>
              <p className="text-lg font-semibold text-amber-400">{statistics.mostUsedWorkflow}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Executions */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Executions</h3>
        {recentExecutions.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No recent executions</p>
        ) : (
          <div className="space-y-3">
            {recentExecutions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(execution.status)}`}>
                    {getStatusIcon(execution.status)} {execution.status}
                  </span>
                  <span className="text-white font-medium truncate">{execution.workflowName}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {execution.duration && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {formatDuration(execution.duration)}
                    </span>
                  )}
                  <span>{new Date(execution.startTime).toLocaleString('nl-NL', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
