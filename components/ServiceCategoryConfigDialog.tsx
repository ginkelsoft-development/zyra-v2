'use client';

import { useState, useEffect } from 'react';
import { ServiceCategory, ServiceCategoryVariable } from '@/lib/services/serviceCategories';

interface ServiceCategoryConfigDialogProps {
  category: ServiceCategory;
  projectPath: string;
  onSave: (configValues: Record<string, string>) => void;
  onClose: () => void;
}

export default function ServiceCategoryConfigDialog({
  category,
  projectPath,
  onSave,
  onClose,
}: ServiceCategoryConfigDialogProps) {
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Load project-specific config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(
          `/api/service-categories?categoryId=${encodeURIComponent(category.id)}&projectPath=${encodeURIComponent(projectPath)}`
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
  }, [projectPath, category.id]);

  const handleSave = () => {
    // Validate required fields
    const missingRequired = category.configVariables?.filter(
      v => v.required && !configValues[v.key]
    );

    if (missingRequired && missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map(v => v.label).join(', ')}`);
      return;
    }

    onSave(configValues);
  };

  const renderConfigField = (variable: ServiceCategoryVariable) => {
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
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            required={variable.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setConfigValues({ ...configValues, [variable.key]: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{category.emoji}</span>
            <div>
              <h2 className="text-xl font-bold dark:text-white">{category.name} Configuration</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Configure shared settings for all {category.name} services in this project. These values will be used automatically by all related services.
          </p>

          {category.configVariables.map((variable) => (
            <div key={variable.key}>
              <label className="block font-semibold mb-2 dark:text-white">
                {variable.label}
                {variable.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{variable.description}</p>
              {renderConfigField(variable)}
            </div>
          ))}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> These configuration values are specific to this project.
              The same service category can have different configurations in different projects.
            </p>
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-800 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
          >
            Save Configuration
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
