'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';

export type AgentNodeData = {
  label: React.ReactNode;
  agent?: any;
};

// Simple wrapper - handles are in AgentNodeWithConfig
function AgentNode({ data }: NodeProps<AgentNodeData>) {
  return <>{data.label}</>;
}

export default memo(AgentNode);
