'use client';

import { useRef, useEffect } from 'react';

interface WorkflowExecution {
  id: string;
  workflowName: string;
  projectPath: string;
  startTime: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  logs: string[];
  abortController: AbortController;
}

interface ExecutionLogPanelProps {
  executions: WorkflowExecution[];
  activeExecutionId: string | null;
  onSelectExecution: (executionId: string) => void;
  onCancelExecution: (executionId: string) => void;
  logPanelHeight: number;
}

export default function ExecutionLogPanel({
  executions,
  activeExecutionId,
  onSelectExecution,
  onCancelExecution,
  logPanelHeight,
}: ExecutionLogPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executions]);

  const activeExecution = executions.find(exec => exec.id === activeExecutionId);
  const runningCount = executions.filter(exec => exec.status === 'running').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-yellow-400';
      default: return 'text-gray-400';
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
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-green-400 border-t border-gray-700 flex flex-col"
      style={{ height: `${logPanelHeight}px` }}
    >
      {/* Header with tabs */}
      <div className="flex-shrink-0 border-b border-gray-700">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-cyan-400 font-bold">Execution Logs</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Drag to resize
            </span>
            {runningCount > 0 && (
              <span className="flex items-center gap-1 text-blue-400">
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {runningCount} running
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        {executions.length > 0 && (
          <div className="px-2 flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
            {executions.map((execution) => (
              <button
                key={execution.id}
                onClick={() => onSelectExecution(execution.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-t transition-all text-xs whitespace-nowrap ${
                  activeExecutionId === execution.id
                    ? 'bg-gray-800 text-cyan-400 font-semibold'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <span className={getStatusColor(execution.status)}>
                  {getStatusIcon(execution.status)}
                </span>
                <span className="truncate max-w-[150px]">{execution.workflowName}</span>
                <span className="text-gray-600">
                  {new Date(execution.startTime).toLocaleTimeString('nl-NL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {execution.status === 'running' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelExecution(execution.id);
                    }}
                    className="ml-1 p-0.5 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
                    title="Cancel execution"
                  >
                    <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto p-4">
        {executions.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No workflow executions yet</p>
            <p className="text-xs mt-1">Run a workflow to see execution logs</p>
          </div>
        ) : activeExecution ? (
          <div className="space-y-1">
            {activeExecution.logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5 hover:bg-gray-800/50 px-2 -mx-2 rounded transition-colors">
                <span className="text-gray-600 select-none text-xs mt-0.5">{String(i + 1).padStart(3, '0')}</span>
                <span className="flex-1 whitespace-pre-wrap break-words">{log}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600">
            <p>Select an execution tab to view logs</p>
          </div>
        )}
      </div>
    </div>
  );
}
