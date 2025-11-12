'use client';

import { useState, useEffect } from 'react';
import { ServiceCategory } from '@/lib/services/serviceCategories';
import ServiceCategoryConfigDialog from './ServiceCategoryConfigDialog';

interface ServiceCategoryManagerProps {
  projectPath: string;
}

export default function ServiceCategoryManager({ projectPath }: ServiceCategoryManagerProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [projectPath]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/service-categories?projectPath=${encodeURIComponent(projectPath)}`);
      const data = await res.json();

      setCategories(data.categories || []);

      // Build a map of configured categories
      const configMap: Record<string, any> = {};
      if (data.configs) {
        data.configs.forEach((config: any) => {
          configMap[config.categoryId] = config.configValues;
        });
      }
      setConfigs(configMap);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureCategory = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setShowConfigDialog(true);
  };

  const handleSaveConfig = async (configValues: Record<string, string>) => {
    if (!selectedCategory) return;

    try {
      const res = await fetch('/api/service-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          projectPath,
          configValues,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      // Refresh categories
      await fetchCategories();
      setShowConfigDialog(false);
      setSelectedCategory(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const isCategoryConfigured = (categoryId: string): boolean => {
    return !!configs[categoryId] && Object.keys(configs[categoryId]).length > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold dark:text-white">Service Categories</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure shared settings for related services
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const isConfigured = isCategoryConfigured(category.id);

          return (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{category.emoji}</span>
                  <div>
                    <h4 className="font-semibold dark:text-white">{category.name}</h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        isConfigured
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {isConfigured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {category.description}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mb-3">
                <span>{category.configVariables.length} settings</span>
              </div>

              <button
                onClick={() => handleConfigureCategory(category)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                {isConfigured ? 'Edit Configuration' : 'Configure'}
              </button>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">No service categories available</p>
        </div>
      )}

      {showConfigDialog && selectedCategory && (
        <ServiceCategoryConfigDialog
          category={selectedCategory}
          projectPath={projectPath}
          onSave={handleSaveConfig}
          onClose={() => {
            setShowConfigDialog(false);
            setSelectedCategory(null);
          }}
        />
      )}
    </div>
  );
}
