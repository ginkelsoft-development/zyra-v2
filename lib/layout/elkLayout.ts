import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';

const elk = new ELK();

// ELK layout options for hierarchical top-to-bottom flow with multiple handles
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.direction': 'DOWN',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.portConstraints': 'FIXED_ORDER', // Keep port order to minimize crossings
};

/**
 * Convert React Flow nodes and edges to ELK graph format with proper port handling
 */
function convertToElkGraph(nodes: Node[], edges: Edge[]): ElkNode {
  // Build maps to track which edges connect to which nodes
  const sourceEdgeMap = new Map<string, Edge[]>();
  const targetEdgeMap = new Map<string, Edge[]>();

  edges.forEach((edge) => {
    // Track outgoing edges from source
    if (!sourceEdgeMap.has(edge.source)) {
      sourceEdgeMap.set(edge.source, []);
    }
    sourceEdgeMap.get(edge.source)!.push(edge);

    // Track incoming edges to target
    if (!targetEdgeMap.has(edge.target)) {
      targetEdgeMap.set(edge.target, []);
    }
    targetEdgeMap.get(edge.target)!.push(edge);
  });

  const elkNodes: ElkNode[] = nodes.map((node) => {
    const outgoingEdges = sourceEdgeMap.get(node.id) || [];
    const incomingEdges = targetEdgeMap.get(node.id) || [];

    // Create ports for each edge connection
    const ports = [];

    // Target ports (incoming - top of node)
    incomingEdges.forEach((edge, index) => {
      const portId = edge.targetHandle || `${node.id}-target-${index}`;
      ports.push({
        id: portId,
        properties: {
          side: 'NORTH', // Top side for incoming
          'port.index': index,
          'port.borderOffset': -10, // Position slightly outside node
        },
      });
    });

    // Source ports (outgoing - bottom of node)
    outgoingEdges.forEach((edge, index) => {
      const portId = edge.sourceHandle || `${node.id}-source-${index}`;
      ports.push({
        id: portId,
        properties: {
          side: 'SOUTH', // Bottom side for outgoing
          'port.index': index,
          'port.borderOffset': -10,
        },
      });
    });

    return {
      id: node.id,
      width: 200,
      height: 100,
      ports: ports.length > 0 ? ports : undefined,
      layoutOptions: {
        'org.eclipse.elk.portConstraints': 'FIXED_ORDER', // Keep ports in order
      },
    };
  });

  const elkEdges: ElkExtendedEdge[] = edges.map((edge, index) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    const outgoingEdges = sourceEdgeMap.get(edge.source) || [];
    const incomingEdges = targetEdgeMap.get(edge.target) || [];

    const sourceIndex = outgoingEdges.indexOf(edge);
    const targetIndex = incomingEdges.indexOf(edge);

    const sourcePortId = edge.sourceHandle || `${edge.source}-source-${sourceIndex}`;
    const targetPortId = edge.targetHandle || `${edge.target}-target-${targetIndex}`;

    return {
      id: edge.id,
      sources: [sourcePortId],
      targets: [targetPortId],
    };
  });

  return {
    id: 'root',
    layoutOptions: elkOptions,
    children: elkNodes,
    edges: elkEdges,
  };
}

/**
 * Apply ELK layout to React Flow nodes with handle information
 */
export async function getLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const elkGraph = convertToElkGraph(nodes, edges);

  try {
    const layoutedGraph = await elk.layout(elkGraph);

    // Build edge maps to determine handle counts
    const sourceEdgeMap = new Map<string, Edge[]>();
    const targetEdgeMap = new Map<string, Edge[]>();

    edges.forEach((edge) => {
      if (!sourceEdgeMap.has(edge.source)) {
        sourceEdgeMap.set(edge.source, []);
      }
      sourceEdgeMap.get(edge.source)!.push(edge);

      if (!targetEdgeMap.has(edge.target)) {
        targetEdgeMap.set(edge.target, []);
      }
      targetEdgeMap.get(edge.target)!.push(edge);
    });

    // Convert back to React Flow format with handle data
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      const outgoingEdges = sourceEdgeMap.get(node.id) || [];
      const incomingEdges = targetEdgeMap.get(node.id) || [];

      // Generate handle data
      const sourceHandles = outgoingEdges.map((edge, index) => ({
        id: edge.sourceHandle || `${node.id}-source-${index}`,
      }));

      const targetHandles = incomingEdges.map((edge, index) => ({
        id: edge.targetHandle || `${node.id}-target-${index}`,
      }));

      if (elkNode) {
        return {
          ...node,
          position: {
            x: elkNode.x || 0,
            y: elkNode.y || 0,
          },
          data: {
            ...node.data,
            sourceHandles: sourceHandles.length > 0 ? sourceHandles : undefined,
            targetHandles: targetHandles.length > 0 ? targetHandles : undefined,
          },
        };
      }

      return node;
    });

    // Update edges with proper handle references
    const layoutedEdges = edges.map((edge) => {
      const outgoingEdges = sourceEdgeMap.get(edge.source) || [];
      const incomingEdges = targetEdgeMap.get(edge.target) || [];

      const sourceIndex = outgoingEdges.indexOf(edge);
      const targetIndex = incomingEdges.indexOf(edge);

      return {
        ...edge,
        sourceHandle: edge.sourceHandle || `${edge.source}-source-${sourceIndex}`,
        targetHandle: edge.targetHandle || `${edge.target}-target-${targetIndex}`,
      };
    });

    return {
      nodes: layoutedNodes,
      edges: layoutedEdges,
    };
  } catch (error) {
    console.error('ELK layout error:', error);
    return { nodes, edges };
  }
}

/**
 * Simple auto-layout without ELK - fallback for single direction flow
 */
export function getSimpleLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  // Build adjacency list to find hierarchy
  const adjacencyList = new Map<string, string[]>();
  const incomingEdgesCount = new Map<string, number>();

  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
    incomingEdgesCount.set(node.id, 0);
  });

  edges.forEach(edge => {
    const targets = adjacencyList.get(edge.source) || [];
    targets.push(edge.target);
    adjacencyList.set(edge.source, targets);
    incomingEdgesCount.set(edge.target, (incomingEdgesCount.get(edge.target) || 0) + 1);
  });

  // Build edge maps for handle generation
  const sourceEdgeMap = new Map<string, Edge[]>();
  const targetEdgeMap = new Map<string, Edge[]>();

  edges.forEach((edge) => {
    if (!sourceEdgeMap.has(edge.source)) {
      sourceEdgeMap.set(edge.source, []);
    }
    sourceEdgeMap.get(edge.source)!.push(edge);

    if (!targetEdgeMap.has(edge.target)) {
      targetEdgeMap.set(edge.target, []);
    }
    targetEdgeMap.get(edge.target)!.push(edge);
  });

  // Find root nodes (no incoming edges)
  const rootNodes = nodes.filter(node => (incomingEdgesCount.get(node.id) || 0) === 0);

  // BFS to assign levels
  const levels = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = rootNodes.map(node => ({ id: node.id, level: 0 }));

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    levels.set(id, level);

    const children = adjacencyList.get(id) || [];
    children.forEach(childId => {
      if (!levels.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Position nodes with handle data
  const layoutedNodes = nodes.map(node => {
    const level = levels.get(node.id) || 0;
    const nodesInLevel = nodesByLevel.get(level) || [];
    const indexInLevel = nodesInLevel.indexOf(node);

    const outgoingEdges = sourceEdgeMap.get(node.id) || [];
    const incomingEdges = targetEdgeMap.get(node.id) || [];

    // Generate handle data
    const sourceHandles = outgoingEdges.map((edge, index) => ({
      id: edge.sourceHandle || `${node.id}-source-${index}`,
    }));

    const targetHandles = incomingEdges.map((edge, index) => ({
      id: edge.targetHandle || `${node.id}-target-${index}`,
    }));

    return {
      ...node,
      position: {
        x: 400 + indexInLevel * 300,
        y: 100 + level * 200,
      },
      data: {
        ...node.data,
        sourceHandles: sourceHandles.length > 0 ? sourceHandles : undefined,
        targetHandles: targetHandles.length > 0 ? targetHandles : undefined,
      },
    };
  });

  // Update edges with proper handle references
  const layoutedEdges = edges.map((edge) => {
    const outgoingEdges = sourceEdgeMap.get(edge.source) || [];
    const incomingEdges = targetEdgeMap.get(edge.target) || [];

    const sourceIndex = outgoingEdges.indexOf(edge);
    const targetIndex = incomingEdges.indexOf(edge);

    return {
      ...edge,
      sourceHandle: edge.sourceHandle || `${edge.source}-source-${sourceIndex}`,
      targetHandle: edge.targetHandle || `${edge.target}-target-${targetIndex}`,
    };
  });

  return {
    nodes: layoutedNodes,
    edges: layoutedEdges,
  };
}
