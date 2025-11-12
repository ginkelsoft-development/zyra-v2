'use client';

import { useState, useEffect } from 'react';
import { BackgroundExecution } from '@/lib/services/backgroundExecutionManager';

export default function BackgroundExecutionsPanel() {
  const [executions, setExecutions] = useState<BackgroundExecution[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  // Poll for executions every 2 seconds
  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        const res = await fetch('/api/background-executions');
        const data = await res.json();
        setExecutions(data.executions || []);
      } catch (error) {
        console.error('Failed to fetch background executions:', error);
      }
    };

    fetchExecutions();
    const interval = setInterval(fetchExecutions, 2000);

    return () => clearInterval(interval);
  }, []);

  const runningExecutions = executions.filter(e => e.status === 'running');
  const hasRunning = runningExecutions.length > 0;

  const handleCancel = async (id: string) => {
    try {
      await fetch(`/api/background-executions?id=${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to cancel execution:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
    }
  };

  if (executions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed view */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-white font-medium transition-all ${
            hasRunning ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : 'bg-gray-700 hover:bg-gray-800'
          }`}
        >
          {hasRunning ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
          <span>{runningExecutions.length} Running</span>
          <span className="px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
            {executions.length} Total
          </span>
        </button>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-semibold">Background Workflows</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Executions list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedExecution === execution.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => setSelectedExecution(selectedExecution === execution.id ? null : execution.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{execution.workflowName}</div>
                    <div className="text-xs text-gray-500 truncate">{execution.projectPath}</div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-white text-xs font-medium flex items-center gap-1 ${getStatusColor(execution.status)}`}>
                    {getStatusIcon(execution.status)}
                    {execution.status}
                  </div>
                </div>

                {/* Progress bar */}
                {execution.status === 'running' && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>{execution.completedNodes} / {execution.totalNodes} nodes</span>
                      <span>{execution.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${execution.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Current node */}
                {execution.currentNode && execution.status === 'running' && (
                  <div className="text-xs text-gray-600 mb-2">
                    Current: <span className="font-medium">{execution.currentNode}</span>
                  </div>
                )}

                {/* Error */}
                {execution.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
                    {execution.error}
                  </div>
                )}

                {/* Expanded details */}
                {selectedExecution === execution.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span className="font-medium">{new Date(execution.startTime).toLocaleTimeString()}</span>
                      </div>
                      {execution.endTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Ended:</span>
                          <span className="font-medium">{new Date(execution.endTime).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Logs */}
                    {execution.logs.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Logs:</div>
                        <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
                          {execution.logs.map((log, i) => (
                            <div key={i} className="whitespace-nowrap">{log}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {execution.status === 'running' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(execution.id);
                        }}
                        className="mt-3 w-full px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Execution
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
