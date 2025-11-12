'use client';

import { ValidationResult } from '@/lib/validation/workflowValidator';

interface ValidationResultModalProps {
  result: ValidationResult;
  onClose: () => void;
  onContinue?: () => void;
}

export default function ValidationResultModal({ result, onClose, onContinue }: ValidationResultModalProps) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-700 flex items-center justify-between ${
          hasErrors
            ? 'bg-gradient-to-r from-red-900/30 to-gray-800'
            : hasWarnings
            ? 'bg-gradient-to-r from-yellow-900/30 to-gray-800'
            : 'bg-gradient-to-r from-green-900/30 to-gray-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              hasErrors
                ? 'bg-red-500'
                : hasWarnings
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}>
              {hasErrors ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : hasWarnings ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {hasErrors ? 'Workflow Validation Failed' : hasWarnings ? 'Workflow Warnings' : 'Workflow Valid'}
              </h2>
              <p className="text-sm text-gray-400">
                {hasErrors
                  ? `${result.errors.length} error(s) found`
                  : hasWarnings
                  ? `${result.warnings.length} warning(s) found`
                  : 'Ready to execute'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-12rem)]">
          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Errors ({result.errors.length})
              </h3>
              <div className="space-y-2">
                {result.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg"
                  >
                    <p className="text-sm text-red-300">{error.message}</p>
                    {error.nodeId && (
                      <p className="text-xs text-red-400/60 mt-1">Node: {error.nodeId}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Warnings ({result.warnings.length})
              </h3>
              <div className="space-y-2">
                {result.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg"
                  >
                    <p className="text-sm text-yellow-300">{warning.message}</p>
                    {warning.nodeId && (
                      <p className="text-xs text-yellow-400/60 mt-1">Node: {warning.nodeId}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success message */}
          {!hasErrors && !hasWarnings && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Workflow is Valid</h3>
              <p className="text-gray-400">Your workflow is ready to execute</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
          >
            Close
          </button>

          {!hasErrors && onContinue && (
            <button
              onClick={onContinue}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              {hasWarnings ? 'Continue Anyway' : 'Execute Workflow'}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}

          {hasErrors && (
            <div className="text-sm text-red-400">
              Fix errors before executing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
