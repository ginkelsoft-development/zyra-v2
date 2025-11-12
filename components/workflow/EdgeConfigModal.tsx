'use client';

import { useState } from 'react';
import { EdgeCondition } from '@/lib/types/workflow';

interface EdgeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (condition: EdgeCondition) => void;
  sourceAgent: string;
  targetAgent: string;
  existingCondition?: EdgeCondition;
}

export default function EdgeConfigModal({
  isOpen,
  onClose,
  onSave,
  sourceAgent,
  targetAgent,
  existingCondition
}: EdgeConfigModalProps) {
  const [conditionType, setConditionType] = useState<'success' | 'failure' | 'variable'>(
    existingCondition?.type || 'success'
  );
  const [variableName, setVariableName] = useState(existingCondition?.variableName || '');
  const [operator, setOperator] = useState<string>(existingCondition?.operator || 'equals');
  const [value, setValue] = useState(existingCondition?.value || '');
  const [label, setLabel] = useState(existingCondition?.label || '');
  const [customArgs, setCustomArgs] = useState<Record<string, string>>(existingCondition?.customArgs || {});
  const [newArgKey, setNewArgKey] = useState('');
  const [newArgValue, setNewArgValue] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const condition: EdgeCondition = {
      type: conditionType,
      label: label || (conditionType === 'success' ? '✓ Success' : conditionType === 'failure' ? '✗ Failure' : 'Custom'),
      customArgs: Object.keys(customArgs).length > 0 ? customArgs : undefined
    };

    if (conditionType === 'variable') {
      condition.variableName = variableName;
      condition.operator = operator as any;
      condition.value = value;
    }

    onSave(condition);
    onClose();
  };

  const handleAddArg = () => {
    if (newArgKey.trim()) {
      setCustomArgs(prev => ({ ...prev, [newArgKey.trim()]: newArgValue }));
      setNewArgKey('');
      setNewArgValue('');
    }
  };

  const handleRemoveArg = (key: string) => {
    setCustomArgs(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Configure Edge Condition</h2>
          <p className="text-sm text-gray-500 mt-1">
            {sourceAgent} → {targetAgent}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Condition Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setConditionType('success')}
                className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                  conditionType === 'success'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-700 hover:border-green-300'
                }`}
              >
                <div className="text-lg mb-1">✓</div>
                Success
              </button>
              <button
                onClick={() => setConditionType('failure')}
                className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                  conditionType === 'failure'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-700 hover:border-red-300'
                }`}
              >
                <div className="text-lg mb-1">✗</div>
                Failure
              </button>
              <button
                onClick={() => setConditionType('variable')}
                className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                  conditionType === 'variable'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="text-lg mb-1">🔀</div>
                Variable
              </button>
            </div>
          </div>

          {/* Variable Configuration */}
          {conditionType === 'variable' && (
            <div className="space-y-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variable Name
                </label>
                <input
                  type="text"
                  value={variableName}
                  onChange={(e) => setVariableName(e.target.value)}
                  placeholder="e.g., hasIssues, issueCount, status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The variable name from the source agent's output
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operator
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="equals">Equals (=)</option>
                  <option value="notEquals">Not Equals (≠)</option>
                  <option value="greaterThan">Greater Than (&gt;)</option>
                  <option value="lessThan">Less Than (&lt;)</option>
                  <option value="contains">Contains</option>
                  <option value="exists">Exists (has value)</option>
                  <option value="notExists">Not Exists (no value)</option>
                </select>
              </div>

              {operator !== 'exists' && operator !== 'notExists' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="e.g., true, 5, 'pending'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The value to compare against
                  </p>
                </div>
              )}

              <div className="bg-white p-3 rounded border border-purple-200">
                <p className="text-xs font-medium text-gray-700 mb-1">Condition Preview:</p>
                <code className="text-xs text-purple-700">
                  {variableName || 'variableName'} {operator === 'equals' ? '=' : operator === 'notEquals' ? '≠' : operator === 'greaterThan' ? '>' : operator === 'lessThan' ? '<' : operator} {operator !== 'exists' && operator !== 'notExists' ? (value || 'value') : ''}
                </code>
              </div>
            </div>
          )}

          {/* Custom Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Edge Label (Optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                conditionType === 'success'
                  ? '✓ Success'
                  : conditionType === 'failure'
                  ? '✗ Failure'
                  : 'Custom label'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Custom Arguments for Service */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Custom Arguments to Service (Optional)
              </label>
              <span className="text-xs text-gray-500">Pass data from agent to service</span>
            </div>

            {/* Existing Arguments */}
            {Object.keys(customArgs).length > 0 && (
              <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                {Object.entries(customArgs).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 bg-white p-2 rounded border border-blue-200">
                    <code className="text-xs font-mono text-blue-700 flex-1">
                      {key}: {value}
                    </code>
                    <button
                      onClick={() => handleRemoveArg(key)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Remove argument"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Argument */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newArgKey}
                onChange={(e) => setNewArgKey(e.target.value)}
                placeholder="Key (e.g., message, priority)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddArg()}
              />
              <input
                type="text"
                value={newArgValue}
                onChange={(e) => setNewArgValue(e.target.value)}
                placeholder="Value (e.g., ${agent.output})"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddArg()}
              />
              <button
                onClick={handleAddArg}
                disabled={!newArgKey.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              💡 Use <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">${'{agent.output}'}</code> to reference the agent's output dynamically
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700"
          >
            Save Condition
          </button>
        </div>
      </div>
    </div>
  );
}
