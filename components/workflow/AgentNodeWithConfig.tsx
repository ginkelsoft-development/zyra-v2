'use client';

import { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface AgentNodeData {
  agent: any;
  customPrompt?: string;
  onConfigure?: () => void;
}

export default function AgentNodeWithConfig({ data }: NodeProps<AgentNodeData>) {
  const { agent, customPrompt, onConfigure } = data;
  const [showHelp, setShowHelp] = useState(false);

  // Safety check - should not happen but prevents crashes
  if (!agent) {
    return (
      <div className="relative bg-red-900 text-white p-2 rounded">
        <div className="text-xs">Agent not found</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="w-2 h-2 border-2 border-white"
        style={{
          background: agent.color,
          boxShadow: `0 0 8px ${agent.color}80`,
          pointerEvents: 'all',
          cursor: 'crosshair'
        }}
      />

      {/* Agent Card - Improved visibility */}
      <div
        className="relative bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-sm border-2 border-gray-700 hover:border-gray-600 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-200 min-w-[220px] cursor-pointer"
        onClick={() => onConfigure?.()}
      >
        {/* Help Button */}
        {agent.helpText && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp(!showHelp);
            }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors z-10"
            title="How this agent works"
          >
            <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Agent Icon - Using emoji for better clarity */}
        <div className="flex justify-center mb-2 text-4xl">
          {agent.emoji || '🤖'}
        </div>

        {/* Agent Name - EXACT same as Service Name */}
        <h4 className="font-semibold text-white text-center text-sm truncate mb-1">
          {agent.name}
        </h4>

        {/* Agent Role - EXACT same as Service Category */}
        <p className="text-xs text-gray-400 text-center truncate mb-2 capitalize">
          {agent.role}
        </p>

        {/* Configuration Status - EXACT same structure as Service */}
        {customPrompt && (
          <div className="flex justify-center mb-2">
            <span
              className="px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-1"
              style={{
                backgroundColor: `${agent.color}15`,
                color: agent.color,
                border: `1px solid ${agent.color}30`
              }}
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Custom Prompt
            </span>
          </div>
        )}

        {/* Click hint - EXACT same as Service */}
        <div className="text-[9px] text-center text-gray-500 mt-1">
          Click to configure
        </div>
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="w-2 h-2 border-2 border-white"
        style={{
          background: agent.color,
          boxShadow: `0 0 8px ${agent.color}80`,
          pointerEvents: 'all',
          cursor: 'crosshair'
        }}
      />

      {/* Help Modal */}
      {showHelp && agent.helpText && (
        <div
          className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-xl">{agent.emoji}</div>
              <div>
                <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                <p className="text-xs text-gray-400">{agent.role}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHelp(false);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Help Content */}
          <div className="text-xs text-gray-300 space-y-2 max-h-64 overflow-y-auto">
            {agent.helpText.split('\n').map((line: string, index: number) => {
              // Parse markdown-style formatting
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <h4 key={index} className="font-semibold text-white mt-3 first:mt-0">
                    {line.replace(/\*\*/g, '')}
                  </h4>
                );
              } else if (line.startsWith('- ')) {
                return (
                  <li key={index} className="ml-4">
                    {line.substring(2)}
                  </li>
                );
              } else if (line.trim()) {
                return (
                  <p key={index} className="leading-relaxed">
                    {line}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
