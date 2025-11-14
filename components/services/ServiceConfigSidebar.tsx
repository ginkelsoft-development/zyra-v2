'use client';

import { useState, useEffect } from 'react';
import { ServiceConfig, ServiceConfigVariable } from '@/lib/services/serviceManager';

interface ServiceConfigSidebarProps {
  service: ServiceConfig | null;
  projectPath: string;
  nodeId?: string; // Optional nodeId for workflow nodes (allows multiple instances of same service)
  onClose: () => void;
  onSave: (configValues: Record<string, string>) => void;
}

export default function ServiceConfigSidebar({
  service,
  projectPath,
  nodeId,
  onClose,
  onSave,
}: ServiceConfigSidebarProps) {
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (service) {
      loadConfig();
    }
  }, [service?.id, projectPath, nodeId]);

  const loadConfig = async () => {
    if (!service) return;

    try {
      setLoading(true);

      // Configuration hierarchy:
      // 1. Node-specific config (highest priority)
      // 2. Service category config (fallback)
      // 3. Service defaults (lowest priority)

      const finalConfig: Record<string, string> = {};

      // Step 1: Start with service defaults
      service.configVariables.forEach(v => {
        if (v.defaultValue) {
          finalConfig[v.key] = v.defaultValue;
        }
      });

      // Step 2: Load and merge category config (if service belongs to a category)
      try {
        const categoryRes = await fetch(`/api/service-categories/${service.id}/config?projectPath=${encodeURIComponent(projectPath)}`);
        if (categoryRes.ok) {
          const categoryData = await categoryRes.json();
          if (categoryData.configValues) {
            // Merge category config (overwrites defaults)
            Object.assign(finalConfig, categoryData.configValues);
          }
        }
      } catch (error) {
        console.log('No category config found, using defaults');
      }

      // Step 3: Load and merge node-specific config (highest priority)
      const url = nodeId
        ? `/api/projects/${encodeURIComponent(projectPath)}/services/${service.id}/config?nodeId=${encodeURIComponent(nodeId)}`
        : `/api/projects/${encodeURIComponent(projectPath)}/services/${service.id}/config`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.configValues && Object.keys(data.configValues).length > 0) {
          // Merge node-specific config (overwrites category and defaults)
          Object.assign(finalConfig, data.configValues);
        }
      }

      setConfigValues(finalConfig);
    } catch (error) {
      console.error('Failed to load service config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!service) return;

    try {
      setSaving(true);

      // Debug logging
      console.log('[ServiceConfigSidebar] Saving config:', {
        serviceId: service.id,
        serviceName: service.name,
        nodeId: nodeId,
        hasNodeId: !!nodeId,
        configValues: configValues
      });

      const res = await fetch(`/api/projects/${encodeURIComponent(projectPath)}/services/${service.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Include nodeId in request body if provided
        body: JSON.stringify({
          configValues,
          ...(nodeId && { nodeId })
        }),
      });

      if (!res.ok) throw new Error('Failed to save config');

      const data = await res.json();
      console.log('[ServiceConfigSidebar] Save response:', data);

      onSave(configValues);
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!service) return;

    try {
      setTesting(true);
      const res = await fetch(`/api/projects/${encodeURIComponent(projectPath)}/services/${service.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configValues }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Test successful!\n\n${data.message || 'Service test completed successfully.'}`);
      } else {
        alert(`❌ Test failed!\n\n${data.error || 'Unknown error occurred.'}`);
      }
    } catch (error: any) {
      console.error('Failed to test service:', error);
      alert(`❌ Test failed!\n\n${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
  };

  const renderInput = (variable: ServiceConfigVariable) => {
    const value = configValues[variable.key] || '';

    switch (variable.type) {
      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => handleChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required={variable.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required={variable.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(variable.key, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required={variable.required}
          >
            <option value="">Select...</option>
            {variable.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => handleChange(variable.key, e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Enable</span>
          </label>
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required={variable.required}
          />
        );
    }
  };

  if (!service) return null;

  return (
    <div
      className="fixed bg-white border border-gray-300 rounded-lg shadow-2xl overflow-hidden z-50"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '480px',
        maxHeight: '85vh',
      }}
    >
      {/* Header - Draggable */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {service.emoji}
          </div>
          <div>
            <h3 className="font-bold text-sm">{service.name}</h3>
            <p className="text-xs opacity-90">{service.category.replace('-', ' ')}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Configuration Form */}
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : service.configVariables.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No configuration required for this service</p>
          </div>
        ) : (
          <div className="space-y-4">
            {service.configVariables.map((variable) => (
              <div key={variable.key}>
                <label className="block mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {variable.label}
                    {variable.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  {variable.description && (
                    <span className="block text-xs text-gray-500 mt-0.5">{variable.description}</span>
                  )}
                </label>
                {renderInput(variable)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing || saving || service.configVariables.length === 0}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                Testing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || testing}
            className="flex-1 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
