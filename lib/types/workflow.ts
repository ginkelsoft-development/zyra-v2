// Agent execution output structure with variables
export interface AgentOutput {
  success: boolean;
  data: Record<string, any>;
  error?: string;
  variables: Record<string, any>;
  triggerAgents?: string[];  // List of agent roles to trigger next
  metadata?: {
    executionTime?: number;
    timestamp?: string;
  };
}

// Edge condition based on variables
export interface EdgeCondition {
  type: 'success' | 'failure' | 'variable';
  variableName?: string;
  operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
  value?: any;
  label?: string;
  customArgs?: Record<string, string>; // Custom arguments to pass to the target service
}

// Extended edge data
export interface WorkflowEdgeData {
  condition: EdgeCondition;
  animated?: boolean;
}

// Agent execution context with variables from previous agents
export interface AgentExecutionContext {
  currentAgentIndex: number;
  totalAgents: number;
  agentsBefore: string[];
  agentsAfter: string[];
  previousResults: Array<{
    agent: string;
    output: AgentOutput;
  }>;
  availableVariables: Record<string, any>;
}
