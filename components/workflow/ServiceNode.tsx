'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ServiceNodeData {
  serviceId: string;
  serviceName: string;
  emoji: string;
  color: string;
  description: string;
  type: string;
  category: string;
  hasConfig?: boolean;
  isConfigured?: boolean;
  onConfigure?: () => void;
}

function ServiceNode({ data, selected }: NodeProps<ServiceNodeData>) {
  return (
    <div className="relative">
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 border-2 border-white"
        style={{
          background: data.color,
          boxShadow: `0 0 8px ${data.color}80`
        }}
      />

      {/* Service Card - Improved visibility */}
      <div
        className="relative bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-sm border-2 border-gray-700 hover:border-gray-600 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-200 min-w-[220px] cursor-pointer"
        onClick={() => data.onConfigure?.()}
      >
        {/* Service Icon */}
        <div className="flex justify-center mb-2 text-4xl">
          {data.emoji}
        </div>

        {/* Service Name */}
        <h4 className="font-semibold text-white text-center text-sm truncate mb-1">
          {data.serviceName}
        </h4>

        {/* Service Category */}
        <p className="text-xs text-gray-400 text-center truncate mb-2 capitalize">
          {data.category.replace('-', ' ')}
        </p>

        {/* Configuration Status */}
        {data.hasConfig && (
          <div className="flex justify-center mb-2">
            {data.isConfigured ? (
              <span
                className="px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: `${data.color}15`,
                  color: data.color,
                  border: `1px solid ${data.color}30`
                }}
              >
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Configured
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-medium text-orange-400 bg-orange-500/10 rounded-full border border-orange-500/30 flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Setup Required
              </span>
            )}
          </div>
        )}

        {/* Click hint */}
        <div className="text-[9px] text-center text-gray-500 mt-1">
          Click to configure
        </div>
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 border-2 border-white"
        style={{
          background: data.color,
          boxShadow: `0 0 8px ${data.color}80`
        }}
      />
    </div>
  );
}

export default memo(ServiceNode);
