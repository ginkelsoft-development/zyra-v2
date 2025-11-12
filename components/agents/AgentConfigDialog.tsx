'use client';

import { useState, useEffect } from 'react';
import { AgentConfig, AgentConfigVariable } from '@/lib/services/agentManager';

interface AgentConfigDialogProps {
  agent: AgentConfig;
  projectPath: string; // Required: which project is this config for
  onSave: (configValues: Record<string, string>) => void;
  onClose: () => void;
}

export default function AgentConfigDialog({ agent, projectPath, onSave, onClose }: AgentConfigDialogProps) {
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    agent.configValues || {}
  );
  const [loading, setLoading] = useState(true);

  // Load project-specific config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectPath)}/agents/${agent.id}/config`
        );

        if (!res.ok) {
          console.warn('No saved config found, using defaults');
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.config && Object.keys(data.config).length > 0) {
          setConfigValues(data.config);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [projectPath, agent.id]);

  const handleSave = () => {
    // Validate required fields
    const missingRequired = agent.configVariables?.filter(
      v => v.required && !configValues[v.key]
    );

    if (missingRequired && missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map(v => v.label).join(', ')}`);
      return;
    }

    onSave(configValues);
  };

  const renderConfigField = (variable: AgentConfigVariable) => {
    const value = configValues[variable.key] || variable.defaultValue || '';

    switch (variable.type) {
      case 'text':
      case 'password':
        return (
          <input
            type={variable.type}
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            placeholder={variable.placeholder}
            className="w-full px-4 py-2 border rounded-lg"
            required={variable.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            placeholder={variable.placeholder}
            className="w-full px-4 py-2 border rounded-lg"
            required={variable.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            required={variable.required}
          >
            <option value="">-- Select --</option>
            {variable.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.checked ? 'true' : 'false' })}
              className="w-5 h-5"
            />
            <span className="text-sm text-gray-600">Enable</span>
          </div>
        );

      default:
        return null;
    }
  };

  if (!agent.configVariables || agent.configVariables.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-bold mb-4">No Configuration Required</h3>
          <p className="text-gray-600 mb-4">This agent doesn't require any configuration.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{agent.emoji}</span>
            <div>
              <h2 className="text-xl font-bold">{agent.name} Configuration</h2>
              <p className="text-sm text-gray-600">{agent.role}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700 mb-4">
            Configure this agent with your specific settings. These values will be used when the agent executes tasks.
          </p>

          {agent.configVariables.map((variable) => (
            <div key={variable.key}>
              <label className="block font-semibold mb-2">
                {variable.label}
                {variable.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <p className="text-sm text-gray-600 mb-2">{variable.description}</p>
              {renderConfigField(variable)}
            </div>
          ))}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> These configuration values are specific to this project.
              The same agent can have different configurations in different projects.
            </p>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
          >
            💾 Save Configuration
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
