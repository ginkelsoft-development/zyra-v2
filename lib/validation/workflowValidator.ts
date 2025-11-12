/**
 * Workflow Validation
 * Validates workflow structure before execution
 */

import { Node, Edge } from 'reactflow';

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class WorkflowValidator {
  /**
   * Validate entire workflow
   */
  static validate(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if workflow has any nodes
    if (nodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Workflow is empty. Add at least one agent or service.',
      });
      return { valid: false, errors, warnings };
    }

    // Find start node
    const startNode = nodes.find(n => n.id === 'start');
    if (!startNode) {
      errors.push({
        type: 'error',
        message: 'Workflow must have a start node.',
      });
    }

    // Check for disconnected nodes (except start node)
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    nodes.forEach(node => {
      if (node.id !== 'start' && !connectedNodeIds.has(node.id)) {
        warnings.push({
          type: 'warning',
          message: `Node "${node.data?.agent?.name || node.data?.serviceName || node.id}" is not connected to any other nodes.`,
          nodeId: node.id,
        });
      }
    });

    // Check if start node has outgoing connections
    const startOutgoingEdges = edges.filter(e => e.source === 'start');
    if (startNode && startOutgoingEdges.length === 0) {
      errors.push({
        type: 'error',
        message: 'Start node must have at least one outgoing connection.',
        nodeId: 'start',
      });
    }

    // Check for circular dependencies (simple check)
    const hasCircularDependency = this.detectCircularDependency(nodes, edges);
    if (hasCircularDependency) {
      warnings.push({
        type: 'warning',
        message: 'Workflow contains circular dependencies. This may cause infinite loops.',
      });
    }

    // Check for nodes with no outgoing edges (dead ends)
    const nodesWithoutOutgoing = nodes.filter(node => {
      if (node.id === 'start') return false;
      const outgoing = edges.filter(e => e.source === node.id);
      return outgoing.length === 0;
    });

    if (nodesWithoutOutgoing.length > 0) {
      warnings.push({
        type: 'warning',
        message: `${nodesWithoutOutgoing.length} node(s) have no outgoing connections. These are workflow endpoints.`,
      });
    }

    // Check for missing edge conditions on multiple outgoing edges
    nodes.forEach(node => {
      const outgoingEdges = edges.filter(e => e.source === node.id);
      if (outgoingEdges.length > 1) {
        const edgesWithoutConditions = outgoingEdges.filter(e => !e.data?.condition);
        if (edgesWithoutConditions.length > 0) {
          warnings.push({
            type: 'warning',
            message: `Node "${node.data?.agent?.name || node.data?.serviceName || node.id}" has multiple outgoing edges without conditions. All edges will execute.`,
            nodeId: node.id,
          });
        }
      }
    });

    // Check for service nodes without configuration
    nodes.forEach(node => {
      if (node.type === 'serviceNode' && node.data?.serviceId) {
        // You might want to check if service has required config values
        // This would require loading service config, which is async
        // For now, just a placeholder
      }
    });

    // Check for agent nodes
    const agentNodes = nodes.filter(n => n.type === 'agentNode' || n.data?.agent);
    if (agentNodes.length === 0) {
      warnings.push({
        type: 'warning',
        message: 'Workflow contains no agents. Consider adding agents to perform tasks.',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect circular dependencies using DFS
   */
  private static detectCircularDependency(nodes: Node[], edges: Edge[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCycle(edge.target)) {
            return true;
          }
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get reachable nodes from start
   */
  static getReachableNodes(nodes: Node[], edges: Edge[]): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = ['start'];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;

      reachable.add(current);

      const outgoing = edges.filter(e => e.source === current);
      outgoing.forEach(edge => {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    }

    return reachable;
  }

  /**
   * Find unreachable nodes
   */
  static findUnreachableNodes(nodes: Node[], edges: Edge[]): Node[] {
    const reachable = this.getReachableNodes(nodes, edges);
    return nodes.filter(n => !reachable.has(n.id));
  }
}
