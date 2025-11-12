'use client';

import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { EdgeCondition } from '@/lib/types/workflow';

interface CustomEdgeData {
  label?: string;
  condition?: EdgeCondition;
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<CustomEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const condition = data?.condition;
  const label = condition?.label || data?.label;

  // Determine edge color based on condition type
  let edgeColor = '#94a3b8'; // default gray
  let labelBgColor = 'bg-gray-700';
  let labelTextColor = 'text-gray-200';
  let labelBorderColor = 'border-gray-600';

  if (condition?.type === 'success') {
    edgeColor = '#10b981'; // green
    labelBgColor = 'bg-green-900';
    labelTextColor = 'text-green-200';
    labelBorderColor = 'border-green-700';
  } else if (condition?.type === 'failure') {
    edgeColor = '#ef4444'; // red
    labelBgColor = 'bg-red-900';
    labelTextColor = 'text-red-200';
    labelBorderColor = 'border-red-700';
  } else if (condition?.type === 'variable') {
    edgeColor = '#f59e0b'; // amber
    labelBgColor = 'bg-amber-900';
    labelTextColor = 'text-amber-200';
    labelBorderColor = 'border-amber-700';
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2.5,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className={`px-2 py-1 text-xs font-medium rounded border ${labelBgColor} ${labelTextColor} ${labelBorderColor} shadow-lg backdrop-blur-sm`}
            >
              {label}
              {condition?.customArgs && Object.keys(condition.customArgs).length > 0 && (
                <span className="ml-1 opacity-60" title={`${Object.keys(condition.customArgs).length} custom arguments`}>
                  ⚙️
                </span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
