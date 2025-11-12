'use client';

import { useState, useEffect } from 'react';
import { ServiceConfig, ServiceConfigVariable } from '@/lib/services/serviceManager';

interface ServiceConfigFormProps {
  service: ServiceConfig;
  projectPath: string;
  onClose: () => void;
  onSave: (configValues: Record<string, string>) => void;
  onTest?: () => void;
}

export default function ServiceConfigForm({
  service,
  projectPath,
  onClose,
  onSave,
  onTest,
}: ServiceConfigFormProps) {
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [service.id, projectPath]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${encodeURIComponent(projectPath)}/services/${service.id}/config`);
      if (res.ok) {
        const data = await res.json();
        setConfigValues(data.configValues || {});
      } else {
        // Initialize with default values
        const defaults: Record<string, string> = {};
        service.configVariables.forEach(v => {
          if (v.defaultValue) {
            defaults[v.key] = v.defaultValue;
          }
        });
        setConfigValues(defaults);
      }
    } catch (error) {
      console.error('Failed to load service config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/projects/${encodeURIComponent(projectPath)}/services/${service.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configValues }),
      });

      if (!res.ok) throw new Error('Failed to save config');

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
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={variable.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(variable.key, e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-sm text-slate-300">Enable</span>
          </label>
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(variable.key, e.target.value)}
            placeholder={variable.placeholder}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required={variable.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-slate-700">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: `${service.color}20` }}>
                {service.emoji}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{service.name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{service.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {service.configVariables.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No configuration required for this service</p>
            </div>
          ) : (
            service.configVariables.map((variable) => (
              <div key={variable.key}>
                <label className="block mb-2">
                  <span className="text-sm font-medium text-white">
                    {variable.label}
                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                  </span>
                  {variable.description && (
                    <span className="block text-xs text-slate-400 mt-0.5">{variable.description}</span>
                  )}
                </label>
                {renderInput(variable)}
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleTest}
              disabled={testing || service.configVariables.length === 0}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Service
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      </div>
    </div>
  );
}
