'use client';

import { useState, useEffect } from 'react';
import { ServiceConfig } from '@/lib/services/serviceManager';

interface ServiceManagerProps {
  onSelectService: (service: ServiceConfig) => void;
}

export default function ServiceManager({ onSelectService }: ServiceManagerProps) {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Services', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '📢' },
    { id: 'deployment', label: 'Deployment', icon: '🚀' },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'external-api', label: 'External API', icon: '🔌' },
    { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  ];

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      notifications: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
      deployment: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
      database: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
      'external-api': 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      monitoring: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
    };
    return colors[category] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-bold text-cyan-400">Services</h3>
          <span className="ml-auto text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
            {services.length} total
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Drag services to your workflow canvas
        </p>

        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No services found</p>
            <p className="text-xs mt-1">Try selecting a different category</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', JSON.stringify({
                    type: 'service',
                    service: service,
                  }));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => onSelectService(service)}
                className={`group relative cursor-move bg-gradient-to-br ${getCategoryColor(service.category)} backdrop-blur-sm border rounded-xl p-4 hover:scale-[1.02] transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20`}
                style={{ borderColor: `${service.color}40` }}
              >
                {/* Service Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-lg"
                    style={{ backgroundColor: `${service.color}20`, borderColor: `${service.color}40` }}
                  >
                    {service.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate text-sm">
                      {service.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {service.description}
                    </p>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5">
                  {service.capabilities.slice(0, 3).map((cap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                      style={{
                        backgroundColor: `${service.color}15`,
                        color: service.color,
                        border: `1px solid ${service.color}30`
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                  {service.capabilities.length > 3 && (
                    <span className="px-2 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-800/50 rounded-full border border-gray-700">
                      +{service.capabilities.length - 3} more
                    </span>
                  )}
                </div>

                {/* Drag Indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Services run scripts/APIs, not Claude Code</span>
        </div>
      </div>
    </div>
  );
}
