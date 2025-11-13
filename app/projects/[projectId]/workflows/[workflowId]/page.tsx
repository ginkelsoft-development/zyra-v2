'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  MiniMap,
  EdgeProps,
  getBezierPath,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import AgentManager from '@/components/agents/AgentManager';
import AgentConfigForm from '@/components/agents/AgentConfigForm';
import AgentNodeWithConfig from '@/components/workflow/AgentNodeWithConfig';
import ServiceManager from '@/components/services/ServiceManager';
import ServiceConfigSidebar from '@/components/services/ServiceConfigSidebar';
import ServiceNode from '@/components/workflow/ServiceNode';
import WorkflowManager from '@/components/workflows/WorkflowManager';
import AgentAvatar from '@/components/AgentAvatar';
import EdgeConfigModal from '@/components/workflow/EdgeConfigModal';
import CustomEdge from '@/components/workflow/CustomEdge';
import BackgroundExecutionsPanel from '@/components/BackgroundExecutionsPanel';
import { SavedWorkflow } from '@/lib/services/workflowManager';
import { AgentConfig } from '@/lib/services/agentManager';
import { ServiceConfig } from '@/lib/services/serviceManager';
import { EdgeCondition } from '@/lib/types/workflow';
import { getLayoutedElements, getSimpleLayoutedElements } from '@/lib/layout/elkLayout';
import ExecutionLogPanel from '@/components/execution/ExecutionLogPanel';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';
import WorkflowScheduleModal from '@/components/WorkflowScheduleModal';
import WorkflowSchedulesList from '@/components/WorkflowSchedulesList';
import ServiceCategoryManager from '@/components/ServiceCategoryManager';

// Type for tracking multiple workflow executions
interface WorkflowExecution {
  id: string;
  workflowName: string;
  projectPath: string;
  startTime: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  logs: string[];
  abortController: AbortController;
}

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'input',
    data: {
      label: (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base">Start Workflow</span>
            <span className="text-xs text-white/80">Begin here</span>
          </div>
        </div>
      )
    },
    position: { x: 400, y: 50 }, // Start node bovenaan
    style: {
      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%) !important',
      backgroundColor: '#F59E0B',
      color: 'white',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '16px',
      padding: '0',
      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
      minWidth: '220px'
    },
    className: 'start-node-amber'
  },
];

// Define node and edge types outside component to prevent re-creation on each render
const nodeTypes = {
  serviceNode: ServiceNode,
  agentNode: AgentNodeWithConfig
};

const edgeTypes = {
  default: CustomEdge
};

export default function WorkflowPage() {
  const params = useParams();
  const router = useRouter();

  // Decode URL params
  const projectPath = decodeURIComponent(params.projectId as string);
  const workflowName = params.workflowId === 'new' ? null : decodeURIComponent(params.workflowId as string);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [useAutoLayout, setUseAutoLayout] = useState(true);

  // Multiple workflow executions
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSchedulesPanel, setShowSchedulesPanel] = useState(false);
  const [showProjectOverview, setShowProjectOverview] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [showProjectBrowser, setShowProjectBrowser] = useState(false);

  // Helper function to add timestamp to log messages
  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const addLog = (message: string) => {
    const logMessage = `[${getTimestamp()}] ${message}`;
    console.log('Adding log:', logMessage); // Debug logging
    setLogs(prev => [...prev, logMessage]);
  };

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [showServiceCategories, setShowServiceCategories] = useState(false);
  // Project and workflow info from URL params
  const [currentProject, setCurrentProject] = useState<string | null>(workflowName);
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(projectPath);
  const [recommendedAgents, setRecommendedAgents] = useState<string[]>([]);
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [configAgent, setConfigAgent] = useState<any>(null);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null); // Store nodeId for agent config
  const [configService, setConfigService] = useState<ServiceConfig | null>(null);
  const [configServiceNodeId, setConfigServiceNodeId] = useState<string | null>(null); // Store nodeId for service config
  const [logPanelHeight, setLogPanelHeight] = useState(192); // 48 * 4 = 192px (h-48)
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Array<{ name: string; path: string; type: string }>>([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<SavedWorkflow[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AgentConfig[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceConfig[]>([]);
  const [agentsAccordionOpen, setAgentsAccordionOpen] = useState(false);
  const [servicesAccordionOpen, setServicesAccordionOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [editingPromptNode, setEditingPromptNode] = useState<Node | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [showEdgeConfig, setShowEdgeConfig] = useState(false);
  const [editingEdge, setEditingEdge] = useState<{ source: string; target: string; id?: string } | null>(null);
  const [edgeConditions, setEdgeConditions] = useState<Record<string, EdgeCondition>>({});
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configPanelPosition, setConfigPanelPosition] = useState({ x: 0, y: 80 });
  const [isDraggingConfigPanel, setIsDraggingConfigPanel] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [promptEditorPosition, setPromptEditorPosition] = useState({ x: 0, y: 100 });
  const [isDraggingPromptEditor, setIsDraggingPromptEditor] = useState(false);
  const [promptDragOffset, setPromptDragOffset] = useState({ x: 0, y: 0 });

  // Initialize panel positions after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setConfigPanelPosition({ x: window.innerWidth - 400, y: 80 });
      setPromptEditorPosition({ x: window.innerWidth / 2 - 384, y: 100 });
    }
  }, []);

  // Project Overview Handlers
  const handleNewProject = () => {
    setShowProjectOverview(false);
    setShowProjectWizard(true);
  };

  const handleDeleteProject = async (projectPath: string) => {
    try {
      // Delete project from projects.json
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      if (res.ok) {
        // Reload projects
        const projectsRes = await fetch('/api/projects');
        const data = await projectsRes.json();

        if (data.projects) {
          const projectsWithWorkflows = [];
          for (const project of data.projects) {
            const workflowRes = await fetch(`/api/workflows?projectPath=${encodeURIComponent(project.path)}`);
            const workflowData = await workflowRes.json();
            projectsWithWorkflows.push({
              name: project.name,
              path: project.path,
              type: project.type || 'Unknown',
              workflows: workflowData.workflows || []
            });
          }
          setAvailableProjects(projectsWithWorkflows);
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Project Wizard Handler
  const handleWizardComplete = (projectPath: string, template: any) => {
    setShowProjectWizard(false);

    // Set the project
    const projectName = projectPath.split('/').pop() || '';
    setCurrentProject(projectName);
    setCurrentProjectPath(projectPath);

    // Hide project overview and load the template
    setShowProjectOverview(false);
    handleLoadTemplate(template);
  };

  // Project Browser Handler
  const handleBrowserOpen = async (projectPath: string, workflow?: SavedWorkflow) => {
    console.log('handleBrowserOpen called with:', { projectPath, workflow: workflow?.name });

    setShowProjectBrowser(false);
    setShowProjectOverview(false); // Hide project overview

    const projectName = projectPath.split('/').pop() || '';
    setCurrentProject(projectName);
    setCurrentProjectPath(projectPath);

    console.log('Set project:', projectName, 'path:', projectPath);

    if (workflow) {
      console.log('Loading workflow:', workflow.name);
      // Pass projectPath directly to handleLoadWorkflow
      handleLoadWorkflow(workflow, projectPath);
    } else {
      console.log('No workflow provided, checking for default workflow...');
      // Try to load the default workflow for this project
      try {
        const res = await fetch(`/api/workflows/default?projectPath=${encodeURIComponent(projectPath)}`);
        const data = await res.json();

        if (data.workflow) {
          console.log('Loading default workflow:', data.workflow.name);
          handleLoadWorkflow(data.workflow, projectPath);
        } else {
          console.log('No default workflow found, opening empty canvas');
        }
      } catch (error) {
        console.error('Failed to load default workflow:', error);
        console.log('Opening empty canvas');
      }
    }
  };

  // Drag & Drop handlers
  const onDragStart = (event: React.DragEvent, agent: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(agent));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Helper function to check if a service node is configured
  const checkServiceConfigured = async (serviceId: string, nodeId: string): Promise<boolean> => {
    if (!currentProjectPath) return false;

    try {
      // First check node-specific config
      const nodeRes = await fetch(`/api/projects/${encodeURIComponent(currentProjectPath)}/services/${serviceId}/config?nodeId=${encodeURIComponent(nodeId)}`);
      if (nodeRes.ok) {
        const nodeData = await nodeRes.json();
        if (nodeData.configValues && Object.keys(nodeData.configValues).length > 0) {
          return true;
        }
      }

      // Fallback to service-level config (without nodeId)
      const serviceRes = await fetch(`/api/projects/${encodeURIComponent(currentProjectPath)}/services/${serviceId}/config`);
      if (serviceRes.ok) {
        const serviceData = await serviceRes.json();
        const hasConfig = serviceData.configValues && Object.keys(serviceData.configValues).length > 0;
        return hasConfig;
      }
    } catch (error) {
      console.error('Failed to check service config:', error);
    }
    return false;
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');

      if (data && reactFlowBounds) {
        const dropData = JSON.parse(data);
        const position = {
          x: event.clientX - reactFlowBounds.left - 75,
          y: event.clientY - reactFlowBounds.top - 25,
        };

        // Check if this is a service or agent
        if (dropData.type === 'service' && dropData.service) {
          // Service node
          const service = dropData.service;
          const nodeId = `service-${Date.now()}`;

          const newNode: Node = {
            id: nodeId,
            type: 'serviceNode',
            position,
            data: {
              serviceId: service.id,
              serviceName: service.name,
              emoji: service.emoji,
              color: service.color,
              description: service.description,
              type: service.type,
              category: service.category,
              hasConfig: service.configVariables && service.configVariables.length > 0,
              isConfigured: false, // Will be checked async
              onConfigure: () => {
                // Find the full service config from availableServices
                const fullService = availableServices.find(s => s.id === service.id);
                if (fullService) {
                  setConfigService(fullService);
                  setConfigServiceNodeId(nodeId);
                }
              },
            },
          };

          setNodes((nds) => nds.concat(newNode));

          // Check if service is configured and update node
          if (service.configVariables && service.configVariables.length > 0) {
            checkServiceConfigured(service.id, nodeId).then(isConfigured => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === nodeId
                    ? { ...n, data: { ...n.data, isConfigured } }
                    : n
                )
              );
            });
          }
        } else {
          // Agent node
          const agent = dropData;
          const nodeId = `agent-${Date.now()}`;

          const newNode: Node = {
            id: nodeId,
            type: 'agentNode',
            position,
            data: {
              agent,
              customPrompt: customPrompts[nodeId],
              onConfigure: () => {
                setConfigAgent(agent);
                setConfigNodeId(nodeId);
              },
            },
            style: {}
          };

          setNodes((nds) => nds.concat(newNode));
        }
      }
    },
    [setNodes, currentProjectPath, customPrompts, nodes.length]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Apply auto layout to nodes
  const applyAutoLayout = useCallback(async () => {
    if (nodes.length <= 1) return; // Only layout if there are actual agent nodes

    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Layout error:', error);
      // Fallback to simple layout
      const { nodes: simpleLayoutedNodes, edges: simpleLayoutedEdges } = getSimpleLayoutedElements(nodes, edges);
      setNodes(simpleLayoutedNodes);
      setEdges(simpleLayoutedEdges);
    }
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => {
        // Count ALL edges between these two nodes (both directions)
        const edgesBetweenNodes = eds.filter(
          (edge) =>
            (edge.source === params.source && edge.target === params.target) ||
            (edge.source === params.target && edge.target === params.source)
        );

        // Count outgoing edges from this source node
        const outgoingEdges = eds.filter((edge) => edge.source === params.source);

        // Determine edge type based on number of outgoing connections
        let edgeLabel = '';
        let edgeStyle = {};
        let conditionType: 'success' | 'failure' | 'variable' = 'success';

        if (outgoingEdges.length === 0) {
          // First edge - default/success path
          edgeLabel = '✓ Success';
          edgeStyle = { stroke: '#10B981', strokeWidth: 2 };
          conditionType = 'success';
        } else if (outgoingEdges.length === 1) {
          // Second edge - failure/error path
          edgeLabel = '✗ Failure';
          edgeStyle = { stroke: '#EF4444', strokeWidth: 2 };
          conditionType = 'failure';
        } else {
          // Additional edges - variable condition (will configure in modal)
          edgeLabel = `🔀 Configure Condition`;
          edgeStyle = { stroke: '#6366F1', strokeWidth: 2 };
          conditionType = 'variable';
        }

        // Create unique edge ID using timestamp to allow multiple edges between same nodes
        const edgeId = `e-${params.source}-${params.target}-${Date.now()}`;

        // Calculate curve offset for multiple edges between same nodes
        // This creates a smooth curve that doesn't overlap with other edges
        const edgeCount = edgesBetweenNodes.length;
        const offset = edgeCount * 50; // 50px offset for each additional edge

        const newEdge = {
          ...params,
          id: edgeId,
          animated: true,
          label: edgeLabel,
          labelStyle: {
            fill: '#334155',
            fontWeight: 600,
            fontSize: 12,
          },
          labelBgStyle: {
            fill: '#F8FAFC',
            fillOpacity: 0.9,
          },
          labelBgPadding: [8, 4] as [number, number],
          labelBgBorderRadius: 4,
          style: edgeStyle,
          type: 'smoothstep', // Use smoothstep for better curved edges
          // Add curve offset for multiple edges
          ...(edgeCount > 0 && {
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
          }),
          data: {
            condition: { type: conditionType, label: edgeLabel },
            canEdit: true,
            offset: offset, // Store offset for future reference
          },
        };

        // Store default condition
        setEdgeConditions(prev => ({
          ...prev,
          [edgeId]: { type: conditionType, label: edgeLabel }
        }));

        // ALWAYS open configuration modal for user to confirm or customize
        setTimeout(() => {
          setEditingEdge({
            source: params.source as string,
            target: params.target as string,
            id: edgeId
          });
          setShowEdgeConfig(true);
        }, 100);

        return addEdge(newEdge, eds);
      });
    },
    [setEdges]
  );

  // Handle edge double-click for editing
  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setEditingEdge({
      source: edge.source,
      target: edge.target,
      id: edge.id
    });
    setShowEdgeConfig(true);
  }, []);

  // Handle node selection changes to show action menu
  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    console.log('🎯🎯🎯 SELECTION CHANGED!!! 🎯🎯🎯');
    console.log('Selected nodes:', params.nodes.length);

    if (params.nodes.length > 0) {
      const node = params.nodes[0];
      console.log('Node ID:', node.id);
      console.log('Node type:', node.type);
      console.log('Node has agent?', !!node.data?.agent);
      console.log('Node has service?', !!node.data?.serviceId);

      // Skip start node, but allow both agent nodes and service nodes
      if (node.id === 'start') {
        console.log('❌ Skipping start node');
        setSelectedNode(null);
        return;
      }

      // Accept both agent nodes and service nodes
      if (node.data?.agent || node.data?.serviceId) {
        console.log('✅ Setting selected node!');
        setSelectedNode(node);
      } else {
        console.log('❌ Node has no agent or service');
        setSelectedNode(null);
      }
    } else {
      console.log('❌ No nodes selected, clearing');
      setSelectedNode(null);
    }
  }, []);

  // Handle canvas click to deselect node
  const onPaneClick = useCallback(() => {
    console.log('🎯 Canvas clicked - deselecting node');
    setSelectedNode(null);
  }, []);

  // Handle config button click from toolbar
  const handleNodeConfig = useCallback(async (node: Node) => {
    if (!currentProjectPath) {
      alert('⚠️ Please select a project first to configure');
      return;
    }

    // Check if this is a service node
    if (node.data?.serviceId) {
      console.log('🔧 Opening config for service:', node.data?.serviceName);

      // Find the full service config
      const fullService = availableServices.find(s => s.id === node.data.serviceId);
      if (fullService) {
        setConfigService(fullService);
        setConfigServiceNodeId(node.id); // Store nodeId for service configuration
        setSelectedNode(null); // Close toolbar
      }
      return;
    }

    // Agent node
    console.log('🔧 Opening config for agent:', node.data?.agent?.name);

    try {
      const res = await fetch('/api/agents', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      const fullAgent = data.agents?.find((a: AgentConfig) => a.id === node.data.agent.id);

      if (fullAgent) {
        console.log('✅ Found agent with config:', fullAgent.name, 'configVariables:', fullAgent.configVariables?.length || 0);
        setConfigAgent(fullAgent);
        setConfigNodeId(node.id); // Store nodeId for configuration
        setConfigSidebarOpen(true);
        setSelectedNode(null); // Close toolbar
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
    }
  }, [currentProjectPath, availableServices]);

  // Save edge condition from modal
  const handleSaveEdgeCondition = useCallback((condition: EdgeCondition) => {
    if (!editingEdge || !editingEdge.id) return;

    // Determine style based on condition type
    let edgeStyle = {};
    if (condition.type === 'success') {
      edgeStyle = { stroke: '#10B981', strokeWidth: 2 };
    } else if (condition.type === 'failure') {
      edgeStyle = { stroke: '#EF4444', strokeWidth: 2 };
    } else {
      edgeStyle = { stroke: '#6366F1', strokeWidth: 2 };
    }

    // Create a better label that shows the actual condition
    let displayLabel = condition.label || '';

    if (condition.type === 'variable' && condition.variableName) {
      // Create a readable label from the condition
      const operatorSymbols: Record<string, string> = {
        'equals': '=',
        'notEquals': '≠',
        'greaterThan': '>',
        'lessThan': '<',
        'contains': '⊃',
        'exists': '✓',
        'notExists': '✗'
      };

      const symbol = condition.operator ? operatorSymbols[condition.operator] : '';

      if (condition.operator === 'exists' || condition.operator === 'notExists') {
        displayLabel = `${condition.variableName} ${symbol}`;
      } else if (condition.value !== undefined) {
        displayLabel = `${condition.variableName} ${symbol} ${condition.value}`;
      } else {
        displayLabel = condition.variableName;
      }
    } else if (condition.type === 'success') {
      displayLabel = condition.label || '✓ Success';
    } else if (condition.type === 'failure') {
      displayLabel = condition.label || '✗ Failure';
    }

    // Update edge with better styling
    setEdges((eds) =>
      eds.map((e) =>
        e.id === editingEdge.id
          ? {
              ...e,
              label: displayLabel,
              labelStyle: {
                fill: '#334155',
                fontWeight: 600,
                fontSize: 12,
              },
              labelBgStyle: {
                fill: '#F8FAFC',
                fillOpacity: 0.9,
              },
              labelBgPadding: [8, 4] as [number, number],
              labelBgBorderRadius: 4,
              style: edgeStyle,
              type: 'smoothstep',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
              },
              data: { ...e.data, condition: { ...condition, label: displayLabel } }
            }
          : e
      )
    );

    // Store condition
    const edgeId = String(editingEdge.id);
    setEdgeConditions(prev => ({
      ...prev,
      [edgeId]: { ...condition, label: displayLabel }
    }));

    setShowEdgeConfig(false);
    setEditingEdge(null);
  }, [editingEdge, setEdges]);

  // Run workflow with real code generation and real-time updates
  const runWorkflow = async () => {
    if (!currentProject || !currentProjectPath) {
      alert('⚠️ Please select or create a project first!');
      return;
    }

    // Get workflow nodes with their full configuration (both agents and services)
    // Include start node so execution logic can determine where to begin
    const workflowNodes = nodes
      .filter(node => node.id === 'start' || node.data?.agent || node.data?.serviceId)
      .map(node => {
        // Handle start node specially
        if (node.id === 'start') {
          return {
            nodeId: 'start',
            nodeType: 'start',
            agentRole: 'Start',
          };
        }

        // Check if this is a service node
        if (node.data?.serviceId) {
          return {
            nodeId: node.id,
            nodeType: 'service',
            serviceId: node.data.serviceId,
            serviceName: node.data.serviceName,
            agentRole: node.data.serviceName, // For display in logs
            agentName: node.data.serviceName,
          };
        }

        // Agent node
        return {
          nodeId: node.id,
          nodeType: 'agent',
          agentId: node.data.agent.id,
          agentRole: node.data.agent.role,
          agentName: node.data.agent.name,
          customPrompt: customPrompts[node.id],
          // Agent configuration will be loaded on the backend
        };
      });

    if (workflowNodes.length === 0) {
      alert('⚠️ No agents or services in workflow. Please add agents or services first.');
      return;
    }

    // No task needed - agents use their own system prompts, custom prompts, and configuration

    // Generate unique execution ID
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();

    // Create new execution
    const newExecution: WorkflowExecution = {
      id: executionId,
      workflowName: currentProject,
      projectPath: currentProjectPath,
      startTime: new Date(),
      status: 'running',
      logs: [],
      abortController,
    };

    // Add to executions array
    setExecutions(prev => [...prev, newExecution]);
    setActiveExecutionId(executionId);
    setIsRunning(true);
    setIsCancelling(false);

    // Helper to add logs to this specific execution
    const addExecutionLog = (message: string) => {
      const timestamp = new Date().toLocaleString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const logMessage = `[${timestamp}] ${message}`;

      setExecutions(prev =>
        prev.map(exec =>
          exec.id === executionId
            ? { ...exec, logs: [...exec.logs, logMessage] }
            : exec
        )
      );
    };

    addExecutionLog('🚀 Starting workflow execution...');
    addExecutionLog(`👥 Executing with ${workflowNodes.length} agents...`);
    addExecutionLog('🤖 Agents will use their configured prompts and settings...');

    try {
      // Execute workflow with streaming via fetch
      const response = await fetch('/api/projects/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: currentProjectPath,
          workflowNodes: workflowNodes,
          edges: edges,
          edgeConditions: edgeConditions,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        addExecutionLog(`❌ Error: ${error.error}`);
        setExecutions(prev =>
          prev.map(exec =>
            exec.id === executionId ? { ...exec, status: 'failed' } : exec
          )
        );
        setIsRunning(false);
        return;
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        addExecutionLog('❌ No response stream available');
        setExecutions(prev =>
          prev.map(exec =>
            exec.id === executionId ? { ...exec, status: 'failed' } : exec
          )
        );
        setIsRunning(false);
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = JSON.parse(line.slice(6));

            // Handle different event types
            switch (eventData.type) {
              case 'workflow_start':
                addExecutionLog('');
                addExecutionLog('═══════════════════════════════════════════════════');
                addExecutionLog(`🎯 WORKFLOW START: ${eventData.totalAgents} agents`);
                addExecutionLog('═══════════════════════════════════════════════════');
                break;

              case 'agent_start':
                addExecutionLog('');
                addExecutionLog(`▶️  Agent ${eventData.index + 1}/${eventData.totalAgents}: ${eventData.agentName || eventData.agent}`);

                // Highlight active node in the workflow using nodeId from event
                if (eventData.nodeId) {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === eventData.nodeId
                        ? { ...node, style: { ...node.style, border: '3px solid #10B981', boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)' } }
                        : node
                    )
                  );
                }
                break;

              case 'agent_executing':
                addExecutionLog(`   ⏳ ${eventData.message}`);
                break;

              case 'agent_output':
                if (eventData.output) {
                  addExecutionLog(`   💬 ${eventData.output}`);
                }
                break;

              case 'agent_complete':
                addExecutionLog(`   ✅ Completed`);
                if (eventData.output) {
                  addExecutionLog(`   📄 Output: ${eventData.output.substring(0, 200)}${eventData.output.length > 200 ? '...' : ''}`);
                }

                // Remove highlight from completed node using nodeId from event
                if (eventData.nodeId) {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === eventData.nodeId
                        ? { ...node, style: { ...node.style, border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' } }
                        : node
                    )
                  );
                }
                break;

              case 'agent_error':
                addExecutionLog(`   ❌ Error: ${eventData.error}`);
                break;

              case 'workflow_complete':
                addExecutionLog('');
                addExecutionLog('═══════════════════════════════════════════════════');
                addExecutionLog(`🎉 WORKFLOW COMPLETE: ${eventData.completedAgents}/${eventData.totalAgents} agents succeeded`);
                addExecutionLog('═══════════════════════════════════════════════════');
                setExecutions(prev =>
                  prev.map(exec =>
                    exec.id === executionId ? { ...exec, status: 'completed' } : exec
                  )
                );
                break;

              case 'complete':
                addExecutionLog('🏁 All done!');
                setExecutions(prev =>
                  prev.map(exec =>
                    exec.id === executionId ? { ...exec, status: 'completed' } : exec
                  )
                );
                break;

              case 'error':
                addExecutionLog(`❌ Workflow error: ${eventData.message}`);
                setExecutions(prev =>
                  prev.map(exec =>
                    exec.id === executionId ? { ...exec, status: 'failed' } : exec
                  )
                );
                break;
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addExecutionLog('⚠️ Workflow cancelled by user');
        setExecutions(prev =>
          prev.map(exec =>
            exec.id === executionId ? { ...exec, status: 'cancelled' } : exec
          )
        );
        setIsCancelling(false);
      } else {
        addExecutionLog(`❌ Failed to execute workflow: ${err.message}`);
        setExecutions(prev =>
          prev.map(exec =>
            exec.id === executionId ? { ...exec, status: 'failed' } : exec
          )
        );
      }
    } finally {
      // Check if any executions are still running
      setExecutions(prev => {
        const stillRunning = prev.some(exec => exec.status === 'running');
        if (!stillRunning) {
          setIsRunning(false);
        }
        return prev;
      });
      setIsCancelling(false);

      // Remove all highlights
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          style: { ...node.style, border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }
        }))
      );
    }
  };

  // Cancel specific execution
  const cancelExecution = (executionId: string) => {
    const execution = executions.find(exec => exec.id === executionId);
    if (execution) {
      setIsCancelling(true);
      execution.abortController.abort();
      setExecutions(prev =>
        prev.map(exec =>
          exec.id === executionId
            ? { ...exec, status: 'cancelled', logs: [...exec.logs, '🛑 Cancelling workflow...'] }
            : exec
        )
      );
    }
  };

  // Cancel running workflow (legacy - cancels active execution)
  const cancelWorkflow = () => {
    if (activeExecutionId) {
      cancelExecution(activeExecutionId);
    }
  };

  // Test individual agent with detailed configuration info
  const testAgent = async (agentNode: Node) => {
    if (!currentProjectPath) {
      alert('⚠️ Please select a project first!');
      return;
    }

    const agent = agentNode.data?.agent;
    if (!agent) return;

    // Check if there's a custom prompt configured
    const customPrompt = customPrompts[agentNode.id];
    let task = '';

    if (customPrompt && customPrompt.trim()) {
      // Use custom prompt automatically if configured
      task = 'Automated workflow - Using custom prompt';
    } else {
      // Ask for task if no custom prompt
      const userTask = prompt(`Test ${agent.name}\n\nWhat task should this agent perform?\n\nExample: "Analyze the authentication code" or "Write unit tests for user model"`);
      if (userTask === null || userTask.trim() === '') return;
      task = userTask;
    }

    setIsRunning(true);
    setLogs([]);

    // Show test header
    addLog('═══════════════════════════════════════════════════');
    addLog(`🧪 AGENT TEST: ${agent.name} (${agent.role})`);
    addLog('═══════════════════════════════════════════════════');
    addLog('');

    // Show configuration details
    addLog('📋 CONFIGURATION:');
    addLog(`   Agent ID: ${agent.id}`);
    addLog(`   Model: ${agent.model || 'sonnet'}`);
    addLog(`   Category: ${agent.category || 'general'}`);

    // Show custom prompt if exists (already loaded above)
    if (customPrompt && customPrompt.trim()) {
      addLog('');
      addLog('🎯 CUSTOM WORKFLOW PROMPT:');
      addLog(`   ${customPrompt.substring(0, 100)}${customPrompt.length > 100 ? '...' : ''}`);
    } else {
      addLog('');
      addLog('ℹ️  No custom prompt configured for this workflow');
    }

    // Show system prompt
    addLog('');
    addLog('🤖 DEFAULT SYSTEM PROMPT:');
    addLog(`   ${agent.systemPrompt?.substring(0, 150)}...`);

    // Load and show agent configuration values
    try {
      const configRes = await fetch(`/api/projects/${encodeURIComponent(currentProjectPath)}/agents/${agent.id}/config`);
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.config && Object.keys(configData.config).length > 0) {
          addLog('');
          addLog('⚙️  AGENT CONFIGURATION VALUES:');
          Object.entries(configData.config).forEach(([key, value]) => {
            const displayValue = key.includes('token') || key.includes('password') || key.includes('secret')
              ? '***hidden***'
              : String(value);
            addLog(`   ${key}: ${displayValue}`);
          });
        } else {
          addLog('');
          addLog('ℹ️  No configuration values set');
        }
      }
    } catch (error) {
      addLog('');
      addLog('⚠️  Could not load agent configuration');
    }

    addLog('');
    addLog('═══════════════════════════════════════════════════');
    addLog(`📝 TASK: ${task}`);
    addLog('═══════════════════════════════════════════════════');
    addLog('');
    addLog('⏳ Executing agent...');

    try {
      const res = await fetch('/api/projects/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: currentProjectPath,
          agents: [agent.role.toLowerCase().replace(/ /g, '-')],
          task: task.trim(),
          customPrompts: customPrompt ? { [agent.role]: customPrompt } : undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        addLog('');
        addLog(`❌ ERROR: ${data.error}`);
        setIsRunning(false);
        return;
      }

      // Display result
      addLog('');
      addLog('═══════════════════════════════════════════════════');
      addLog('📊 EXECUTION RESULT:');
      addLog('═══════════════════════════════════════════════════');

      const result = data.results[0];
      const emoji = result.status === 'completed' ? '✅' : '❌';
      addLog('');
      addLog(`${emoji} Status: ${result.status}`);
      if (result.output) {
        addLog('');
        addLog('📄 Output:');
        addLog(result.output);
      }

      addLog('');
      addLog('═══════════════════════════════════════════════════');
      addLog('🎉 Agent test completed!');
      addLog('═══════════════════════════════════════════════════');
    } catch (err: any) {
      addLog('');
      addLog(`❌ FAILED TO TEST AGENT: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    setNodes(initialNodes);
    setEdges([]);
    setLogs([]);
    setCurrentProject(null);
    setRecommendedAgents([]);
    setCustomPrompts({});
  };

  // Handle edit prompt
  const handleEditPrompt = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (node) {
        setEditingPromptNode(node);
        setShowPromptEditor(true);
      }
      return currentNodes; // Don't modify nodes, just use for reading
    });
  }, []);

  // Save custom prompt
  const handleSavePrompt = async (prompt: string) => {
    if (editingPromptNode) {
      const updatedPrompts = {
        ...customPrompts,
        [editingPromptNode.id]: prompt
      };

      setCustomPrompts(updatedPrompts);
      setShowPromptEditor(false);
      setEditingPromptNode(null);

      // Auto-save to workflow if a workflow is loaded
      if (currentWorkflowId && currentProjectPath) {
        try {
          const response = await fetch(`/api/workflows/${currentWorkflowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodes: nodes.filter(n => n.id !== 'start').map(node => ({
                id: node.id,
                agentId: node.data?.agent?.id || '',
                agentRole: node.data?.agent?.role || '',
                position: node.position,
              })),
              edges: edges,
              customPrompts: updatedPrompts,
            }),
          });

          if (response.ok) {
            setLogs(prev => [...prev, `✅ Custom prompt auto-saved`]);
          }
        } catch (error) {
          console.error('Failed to auto-save custom prompt:', error);
        }
      }
    }
  };

  // Load workflow
  const handleLoadWorkflow = (workflow: SavedWorkflow, projectPath?: string) => {
    // Use provided projectPath or fallback to state
    const workflowProjectPath = projectPath || workflow.projectPath || currentProjectPath;

    console.log('Loading workflow:', workflow.name);
    console.log('Workflow nodes:', workflow.nodes);
    console.log('Workflow edges:', workflow.edges);
    console.log('Project path:', workflowProjectPath);
    console.log('Available services:', availableServices.length);
    console.log('Available agents:', availableAgents.length);

    // Convert saved workflow to ReactFlow nodes
    const loadedNodes: (Node | null)[] = workflow.nodes.map(wfNode => {
      // Handle start node
      if (wfNode.id === 'start') {
        return {
          id: wfNode.id,
          type: 'input',
          position: wfNode.position,
          data: {
            label: (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base">Start Workflow</span>
                  <span className="text-xs text-white/80">Begin here</span>
                </div>
              </div>
            ),
          },
          style: {
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            padding: '0',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
            minWidth: '220px'
          }
        };
      }

      // Handle service node (check if serviceId exists, regardless of type)
      if (wfNode.serviceId) {
        const service = availableServices.find(s => s.id === wfNode.serviceId);
        if (!service) {
          console.warn(`Service not found for node ${wfNode.id}, serviceId: ${wfNode.serviceId}`);
          return null;
        }

        return {
          id: wfNode.id,
          type: 'serviceNode',
          position: wfNode.position,
          data: {
            serviceId: service.id,
            serviceName: service.name,
            emoji: service.emoji,
            color: service.color,
            description: service.description,
            type: service.type,
            category: service.category,
            hasConfig: service.configVariables && service.configVariables.length > 0,
            isConfigured: false, // Will be checked async
            onConfigure: () => {
              setConfigService(service);
              setConfigServiceNodeId(wfNode.id);
            },
          },
          style: {}
        };
      }

      // Handle agent node
      const agent = availableAgents.find(a => a.id === wfNode.agentId);
      if (!agent) {
        console.warn(`Agent not found for node ${wfNode.id}, agentId: ${wfNode.agentId}`);
        return null;
      }

      return {
        id: wfNode.id,
        type: 'agentNode',
        position: wfNode.position,
        data: {
          agent,
          customPrompt: customPrompts[wfNode.id],
          onConfigure: () => {
            setConfigAgent(agent);
            setConfigNodeId(wfNode.id);
          },
        },
        style: {}
      };
    });

    // Filter out null nodes (agents that weren't found)
    const validNodes = loadedNodes.filter(node => node !== null) as Node[];

    // Ensure start node is always present (for backwards compatibility with old workflows)
    const hasStartNode = validNodes.some(node => node.id === 'start');
    if (!hasStartNode) {
      validNodes.unshift(initialNodes[0]); // Add start node at the beginning
    }

    // Restore edge conditions from saved workflow
    const restoredEdgeConditions: Record<string, EdgeCondition> = {};
    workflow.edges.forEach((edge: any) => {
      if (edge.condition) {
        restoredEdgeConditions[edge.id] = edge.condition;
      }
    });

    console.log('Setting nodes:', validNodes);
    console.log('Setting edges:', workflow.edges);
    console.log('Restored edge conditions:', restoredEdgeConditions);

    setNodes(validNodes);
    setEdges(workflow.edges);
    setEdgeConditions(restoredEdgeConditions);
    setCustomPrompts(workflow.customPrompts || {});
    setCurrentWorkflowId(workflow.id);
    setLogs([`✅ Loaded workflow: ${workflow.name}`]);
    setShowWorkflowManager(false);

    // Check configuration status for all service nodes
    validNodes.forEach((node) => {
      if (node.type === 'serviceNode' && node.data.hasConfig) {
        checkServiceConfigured(node.data.serviceId, node.id).then(isConfigured => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? { ...n, data: { ...n.data, isConfigured } }
                : n
            )
          );
        });
      }
    });
  };

  // Load workflow from template
  const handleLoadTemplate = (template: any) => {
    // Create nodes from template - will be updated by useEffect when currentProjectPath is set
    const templateNodes: Node[] = [initialNodes[0]]; // Keep start node

    template.agents.forEach((templateAgent: any, index: number) => {
      // Check if this is a service (ID starts with 'service-')
      const isService = templateAgent.agentId.startsWith('service-');

      if (isService) {
        // Find the service
        const service = availableServices.find(s => s.id === templateAgent.agentId);

        if (service) {
          const nodeId = templateAgent.agentId; // Use service ID directly

          const newNode: Node = {
            id: nodeId,
            type: 'serviceNode',
            position: templateAgent.position,
            data: {
              serviceId: service.id,
              serviceName: service.name,
              emoji: service.emoji,
              color: service.color,
              description: service.description,
              type: service.type,
              category: service.category,
              hasConfig: service.configVariables && service.configVariables.length > 0,
              isConfigured: false
            },
            style: {}
          };

          templateNodes.push(newNode);
        }
      } else {
        // Find the agent
        const agent = availableAgents.find(a => a.id === templateAgent.agentId);

        if (agent) {
          const nodeId = `agent-${(templateAgent.role || 'agent').toLowerCase().replace(/ /g, '-')}`;

          const newNode: Node = {
            id: nodeId,
            type: 'agentNode',
            position: templateAgent.position,
            data: {
              agent,
              customPrompt: undefined
            },
            style: {}
          };

          templateNodes.push(newNode);
        }
      }
    });

    // Create edges from template
    const templateEdges = template.edges.map((edge: any) => {
      // Map edge sources/targets to actual node IDs
      let source = edge.source;
      let target = edge.target;

      if (source.startsWith('agent-')) {
        source = source; // Already in correct format
      }
      if (target.startsWith('agent-')) {
        target = target; // Already in correct format
      }

      return {
        id: `e-${source}-${target}`,
        source,
        target,
        animated: true
      };
    });

    setNodes(templateNodes);
    setEdges(templateEdges);
    setLogs([`✅ Loaded template: ${template.name}`, `📋 ${template.agents.length} agents/services added`, `⚙️ Nodes will update with project configuration`]);
    setShowWorkflowManager(false);
  };

  // Handle resize drag
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingResize(true);
  };

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingResize) return;

    const windowHeight = window.innerHeight;
    const newHeight = windowHeight - e.clientY - 60; // 60px for header

    // Min height 100px, max height 600px
    const clampedHeight = Math.min(Math.max(newHeight, 100), 600);
    setLogPanelHeight(clampedHeight);
  }, [isDraggingResize]);

  const handleResizeMouseUp = useCallback(() => {
    setIsDraggingResize(false);
  }, []);

  // Handle config panel dragging
  const handleConfigPanelMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingConfigPanel(true);
    setDragOffset({
      x: e.clientX - configPanelPosition.x,
      y: e.clientY - configPanelPosition.y,
    });
  }, [configPanelPosition]);

  const handleConfigPanelMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingConfigPanel) return;

    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 400));
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100));

    setConfigPanelPosition({ x: newX, y: newY });
  }, [isDraggingConfigPanel, dragOffset]);

  const handleConfigPanelMouseUp = useCallback(() => {
    setIsDraggingConfigPanel(false);
  }, []);

  // Handle prompt editor dragging
  const handlePromptEditorMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPromptEditor(true);
    setPromptDragOffset({
      x: e.clientX - promptEditorPosition.x,
      y: e.clientY - promptEditorPosition.y,
    });
  }, [promptEditorPosition]);

  const handlePromptEditorMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingPromptEditor) return;

    const newX = Math.max(0, Math.min(e.clientX - promptDragOffset.x, window.innerWidth - 768));
    const newY = Math.max(0, Math.min(e.clientY - promptDragOffset.y, window.innerHeight - 200));

    setPromptEditorPosition({ x: newX, y: newY });
  }, [isDraggingPromptEditor, promptDragOffset]);

  const handlePromptEditorMouseUp = useCallback(() => {
    setIsDraggingPromptEditor(false);
  }, []);

  // Add/remove event listeners for resize
  useEffect(() => {
    if (isDraggingResize) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isDraggingResize, handleResizeMouseMove, handleResizeMouseUp]);

  // Add/remove event listeners for config panel drag
  useEffect(() => {
    if (isDraggingConfigPanel) {
      document.addEventListener('mousemove', handleConfigPanelMouseMove);
      document.addEventListener('mouseup', handleConfigPanelMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleConfigPanelMouseMove);
        document.removeEventListener('mouseup', handleConfigPanelMouseUp);
      };
    }
  }, [isDraggingConfigPanel, handleConfigPanelMouseMove, handleConfigPanelMouseUp]);

  // Add/remove event listeners for prompt editor drag
  useEffect(() => {
    if (isDraggingPromptEditor) {
      document.addEventListener('mousemove', handlePromptEditorMouseMove);
      document.addEventListener('mouseup', handlePromptEditorMouseUp);
      return () => {
        document.removeEventListener('mousemove', handlePromptEditorMouseMove);
        document.removeEventListener('mouseup', handlePromptEditorMouseUp);
      };
    }
  }, [isDraggingPromptEditor, handlePromptEditorMouseMove, handlePromptEditorMouseUp]);

  // Load projects that have saved workflows
  useEffect(() => {
    const loadProjectsWithWorkflows = async () => {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();

        if (data.projects) {
          // Check each project for workflows
          const projectsWithWorkflows = [];

          for (const project of data.projects) {
            const workflowRes = await fetch(`/api/workflows?projectPath=${encodeURIComponent(project.path)}`);
            const workflowData = await workflowRes.json();

            // Include all projects, even those without workflows
            projectsWithWorkflows.push({
              name: project.name,
              path: project.path,
              type: project.type || 'Unknown',
              workflows: workflowData.workflows || []
            });
          }

          setAvailableProjects(projectsWithWorkflows);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjectsWithWorkflows();
  }, [showWorkflowManager]); // Reload when workflow manager closes (workflows might be saved)

  // Load available agents on mount and when agent manager closes
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const data = await res.json();
        if (data.agents) {
          console.log('📋 Loaded agents:', data.agents.length, 'agents');
          // Filter to only show default agents (not custom)
          const defaultAgents = data.agents.filter((a: AgentConfig) => !a.isCustom);
          console.log('📋 Default agents:', defaultAgents.length);
          defaultAgents.forEach((agent: AgentConfig) => {
            console.log(`  - ${agent.name}: ${agent.configVariables?.length || 0} config vars`);
          });
          setAvailableAgents(defaultAgents);
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    };
    loadAgents();
  }, [showAgentManager]); // Reload when agent manager closes (agents might be created)

  // Load available services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (data.services) {
          setAvailableServices(data.services);
        }
      } catch (error) {
        console.error('Failed to load services:', error);
      }
    };
    loadServices();
  }, []);

  // Load workflows when currentProjectPath changes
  useEffect(() => {
    const loadWorkflows = async () => {
      if (currentProjectPath) {
        try {
          const response = await fetch(`/api/workflows?projectPath=${encodeURIComponent(currentProjectPath)}`);
          if (response.ok) {
            const data = await response.json();
            setAvailableWorkflows(data.workflows || []);
          }
        } catch (error) {
          console.error('Failed to load workflows:', error);
          setAvailableWorkflows([]);
        }
      } else {
        setAvailableWorkflows([]);
      }
    };

    loadWorkflows();
  }, [currentProjectPath]);

  // Handle project selection from dropdown - load its workflows
  const handleProjectSelect = async (projectPath: string) => {
    if (!projectPath) {
      // Clear selection
      setCurrentProject(null);
      setCurrentProjectPath(null);
      setAvailableWorkflows([]);
      return;
    }

    // Set the current project
    const projectName = projectPath.split('/').pop() || '';
    setCurrentProject(projectName);
    setCurrentProjectPath(projectPath);

    // Load workflows for this project
    try {
      const response = await fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      setAvailableWorkflows([]);
    }

    // Clear canvas
    setNodes(initialNodes);
    setEdges([]);
  };

  // Handle workflow selection from dropdown
  const handleWorkflowSelect = (workflowName: string) => {
    if (!workflowName || !currentProjectPath) return;

    const workflow = availableWorkflows.find(w => w.name === workflowName);
    if (workflow) {
      handleLoadWorkflow(workflow, currentProjectPath);
    }
  };

  // Handle save workflow
  const handleSaveWorkflow = async (askForName: boolean = false) => {
    if (!currentProjectPath) {
      alert('Please select a project first');
      return;
    }

    if (nodes.length <= 1) {
      alert('Please add agents to your workflow before saving');
      return;
    }

    try {
      let workflowName: string | null = '';
      let workflowDescription: string | null = '';

      // If we have a current workflow ID and not explicitly asking for name, just update it
      if (currentWorkflowId && !askForName) {
        // Quick save - just update the existing workflow
        workflowName = `Workflow ${currentWorkflowId}`; // Use existing name
      } else {
        // Ask for name (new workflow or explicit save-as)
        workflowName = prompt('Enter workflow name:', currentWorkflowId ? `Workflow ${currentWorkflowId}` : 'My Workflow');
        if (!workflowName) return; // User cancelled

        workflowDescription = prompt('Enter workflow description (optional):', '') || '';
      }

      // Prepare workflow data
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        projectPath: currentProjectPath,
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
          agentId: node.data?.agent?.id,
          agentRole: node.data?.agent?.role,
          serviceId: node.data?.serviceId
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: edge.type,
          data: edge.data,
          condition: edgeConditions[edge.id]
        })),
        customPrompts,
        triggers: [],
        enabled: true
      };

      // If we have an existing workflow ID, use PUT to update it
      const url = currentWorkflowId ? `/api/workflows/${currentWorkflowId}` : '/api/workflows';
      const method = currentWorkflowId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save workflow');
      }

      setCurrentWorkflowId(result.workflow.id);
      setLogs(prev => [...prev, `✅ Workflow "${workflowName}" saved successfully!`]);

      // Only show alert if explicitly saving (not on Cmd+S quick save)
      if (askForName || !currentWorkflowId) {
        alert(`✅ Workflow "${workflowName}" saved successfully!`);
      }
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      setLogs(prev => [...prev, `❌ Failed to save workflow: ${error.message}`]);
      alert(`❌ Failed to save workflow: ${error.message}`);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Command/Ctrl+S: Save workflow (quick save)
      if (modKey && event.key === 's') {
        event.preventDefault();
        handleSaveWorkflow();
      }

      // Command/Ctrl+Shift+S: Save workflow as (explicit save with name prompt)
      if (modKey && event.shiftKey && event.key === 's') {
        event.preventDefault();
        handleSaveWorkflow(true);
      }

      // Command/Ctrl+E: Execute workflow
      if (modKey && event.key === 'e') {
        event.preventDefault();
        if (currentProjectPath) {
          runWorkflow();
        }
      }

      // Command/Ctrl+K: Clear workflow
      if (modKey && event.key === 'k') {
        event.preventDefault();
        if (confirm('Are you sure you want to clear the workflow?')) {
          setNodes([]);
          setEdges([]);
          setCustomPrompts({});
          setEdgeConditions({});
          setCurrentWorkflowId(null);
        }
      }

      // Delete/Backspace: Delete selected nodes/edges
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isInputFocused()) {
        event.preventDefault();
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);

        if (selectedNodes.length > 0) {
          setNodes(nodes.filter(n => !n.selected));
        }
        if (selectedEdges.length > 0) {
          setEdges(edges.filter(e => !e.selected));
        }
      }

      // Escape: Deselect all
      if (event.key === 'Escape') {
        setNodes(nodes.map(n => ({ ...n, selected: false })));
        setEdges(edges.map(e => ({ ...e, selected: false })));
      }

      // Command/Ctrl+D: Duplicate selected nodes
      if (modKey && event.key === 'd' && !isInputFocused()) {
        event.preventDefault();
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          const newNodes = selectedNodes.map(node => ({
            ...node,
            id: `${node.id}-copy-${Date.now()}`,
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50,
            },
            selected: false,
          }));
          setNodes([...nodes.map(n => ({ ...n, selected: false })), ...newNodes]);
        }
      }

      // Command/Ctrl+A: Select all nodes
      if (modKey && event.key === 'a' && !isInputFocused()) {
        event.preventDefault();
        setNodes(nodes.map(n => ({ ...n, selected: true })));
      }
    };

    // Helper to check if an input/textarea is focused
    const isInputFocused = () => {
      const activeEl = document.activeElement;
      return activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.hasAttribute('contenteditable')
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProjectPath, nodes, edges]); // Re-run when these dependencies change

  // Update customPrompt in agent node data when customPrompts change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type !== 'agentNode' || !node.data?.agent) {
          return node;
        }

        // Update only the customPrompt data property
        return {
          ...node,
          data: {
            ...node.data,
            customPrompt: customPrompts[node.id]
          },
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPrompts]);

  // Update service nodes to ensure they have the onConfigure callback and hasConfig property
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type !== 'serviceNode' || !node.data?.serviceId) {
          return node;
        }

        // Find the service definition to check if it has config variables
        const service = availableServices.find(s => s.id === node.data.serviceId);

        // Always update to ensure onConfigure callback and hasConfig are current
        return {
          ...node,
          data: {
            ...node.data,
            hasConfig: service?.configVariables && service.configVariables.length > 0,
            onConfigure: () => {
              if (!currentProjectPath) {
                alert('⚠️ Please select a project first to configure services');
                return;
              }
              // Find the full service config from availableServices
              const fullService = availableServices.find(s => s.id === node.data.serviceId);
              if (fullService) {
                setConfigService(fullService);
                setConfigServiceNodeId(node.id);
              }
            },
          },
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableServices, currentProjectPath, nodes.length]);

  return (
    <>
      {/* Agent Manager Modal */}
      {showAgentManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">Agent Management</h2>
              <button
                onClick={() => setShowAgentManager(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <AgentManager onAgentCreated={() => {
                // Reload agents in sidebar when new agent is created
                window.location.reload();
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Service Categories Modal */}
      {showServiceCategories && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">Service Settings</h2>
              <button
                onClick={() => setShowServiceCategories(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <ServiceCategoryManager projectPath={projectPath} />
            </div>
          </div>
        </div>
      )}

      {/* Workflow Manager Modal */}
      {showWorkflowManager && currentProjectPath && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">💾 Workflow Management</h2>
              <button
                onClick={() => setShowWorkflowManager(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <WorkflowManager
                projectPath={currentProjectPath}
                currentWorkflow={{ nodes, edges }}
                customPrompts={customPrompts}
                onLoad={handleLoadWorkflow}
                onSave={handleSaveWorkflow}
                onLoadTemplate={handleLoadTemplate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Application - Workflow Canvas */}
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">

        {/* Main Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Werkpallet - Modern Tool Palette */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 flex flex-col shadow-2xl transition-all duration-300`}>
          {/* Pallet Header */}
          <div className="p-3 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Werkpallet</h3>
                    <p className="text-[10px] text-slate-400">Agents & Services</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
                title={sidebarCollapsed ? 'Expand palette' : 'Collapse palette'}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            {!sidebarCollapsed && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowAgentManager(true)}
                  className="w-full px-2.5 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-xs hover:from-purple-600 hover:to-indigo-700 font-medium flex items-center justify-center gap-1.5 transition-all shadow-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Manage Tools
                </button>
                <button
                  onClick={() => setShowServiceCategories(true)}
                  className="w-full px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-xs hover:from-blue-600 hover:to-cyan-700 font-medium flex items-center justify-center gap-1.5 transition-all shadow-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Service Settings
                </button>
              </div>
            )}
          </div>


          {/* Unified Tool List - Agents & Services Combined */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* Agents Section */}
              <div>
                <button
                  onClick={() => setAgentsAccordionOpen(!agentsAccordionOpen)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-700/30 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agents ({availableAgents.length})</h4>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${agentsAccordionOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {agentsAccordionOpen && (
                  <div className="space-y-1 mt-1.5">
            {availableAgents.map((agent) => {
              const isRecommended = recommendedAgents.some(rec =>
                rec.toLowerCase().includes(agent.role.toLowerCase()) ||
                agent.role.toLowerCase().includes(rec.toLowerCase().split('-')[0])
              );

              return (
                <div
                  key={agent.id}
                  className="p-2 rounded-lg cursor-move transition-all group bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-indigo-500/50"
                  draggable
                  onDragStart={(e) => onDragStart(e, agent)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white truncate leading-tight">{agent.name}</div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">{agent.role}</div>
                    </div>
                    <div className="w-6 h-6 rounded flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${agent.color}20` }}>
                      {agent.emoji}
                    </div>
                  </div>
                </div>
              );
            })}
                  </div>
                )}
              </div>

              {/* Services Section */}
              <div>
                <button
                  onClick={() => setServicesAccordionOpen(!servicesAccordionOpen)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-700/30 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Services ({availableServices.length})</h4>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${servicesAccordionOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {servicesAccordionOpen && (
                  <div className="space-y-1 mt-1.5">
                  {availableServices.map((service) => (
                    <div
                      key={service.id}
                      className="p-2 rounded-lg transition-all group bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-purple-500/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/reactflow', JSON.stringify({
                              type: 'service',
                              service: service,
                            }));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-move"
                        >
                          <div className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-white truncate leading-tight">{service.name}</div>
                            <div className="text-[9px] text-slate-400 truncate mt-0.5">{service.category}</div>
                          </div>
                          <div className="w-6 h-6 rounded flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${service.color}20` }}>
                            {service.emoji}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Compact Modern Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <h1 className="text-lg font-bold text-gray-800">Zyra v2.0</h1>
              </div>

              {/* Compact Project Selector */}
              <div className="flex items-center gap-2 ml-4">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <select
                  value={currentProjectPath || ''}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-medium bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none min-w-[200px]"
                >
                  <option value="">Select project...</option>
                  {availableProjects.map((project) => (
                    <option key={project.path} value={project.path}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Workflow Selector - Only show when project is selected */}
              {currentProjectPath && (
                <div className="flex items-center gap-2 ml-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <select
                    value={currentWorkflowId || ''}
                    onChange={(e) => handleWorkflowSelect(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-medium bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none min-w-[200px]"
                  >
                    <option value="">Select workflow...</option>
                    {availableWorkflows.map((workflow) => (
                      <option key={workflow.name} value={workflow.name}>
                        {workflow.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runWorkflow}
                disabled={isRunning}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isRunning
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-sm'
                }`}
              >
                {isRunning ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Run Workflow
                  </>
                )}
              </button>

              {currentWorkflowId && (
                <>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    title="Schedule workflow"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Schedule
                  </button>

                  <button
                    onClick={() => setShowSchedulesPanel(!showSchedulesPanel)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      showSchedulesPanel
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title="View schedules"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {showSchedulesPanel ? 'Hide' : 'Schedules'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeDoubleClick={onEdgeDoubleClick}
              onSelectionChange={onSelectionChange}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              defaultEdgeOptions={{
                type: 'default',
                animated: true,
                style: {
                  strokeWidth: 2.5,
                  stroke: '#94a3b8',
                },
              }}
              connectionLineType={ConnectionLineType.SmoothStep}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Controls />
              <MiniMap />

              {/* Node Action Toolbar */}
              {selectedNode && (selectedNode.data?.agent || selectedNode.data?.serviceId) && (
                <Panel position="top-center" className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-2 py-1 border-r border-gray-200 dark:border-gray-700">
                      {selectedNode.data?.agent ? (
                        <>
                          <div className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ backgroundColor: `${selectedNode.data.agent.color}20` }}>
                            {selectedNode.data.agent.emoji}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedNode.data.agent.name}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ backgroundColor: `${selectedNode.data.color}20` }}>
                            {selectedNode.data.emoji}
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedNode.data.serviceName}</span>
                          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold">SERVICE</span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handleNodeConfig(selectedNode)}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configure
                    </button>

                    {/* Only show Edit Prompt and Test buttons for agent nodes */}
                    {selectedNode.data?.agent && (
                      <>
                        <button
                          onClick={() => {
                            handleEditPrompt(selectedNode.id);
                            setSelectedNode(null);
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                            customPrompts[selectedNode.id]
                              ? 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Prompt
                        </button>

                        <button
                          onClick={() => {
                            testAgent(selectedNode);
                            setSelectedNode(null);
                          }}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Test Agent
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors ml-1"
                      title="Close"
                    >
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </Panel>
              )}

              {/* Status Panel */}
              {isRunning && (
                <Panel position="top-center" className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-5 py-2.5 rounded-lg shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-semibold">
                        {isCancelling ? 'Cancelling...' : 'Workflow Running...'}
                      </span>
                    </div>
                    {!isCancelling && (
                      <button
                        onClick={cancelWorkflow}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md transition-all font-medium text-sm flex items-center gap-1.5"
                        title="Stop workflow execution"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        Stop
                      </button>
                    )}
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>

          {/* Logs Panel - Resizable */}
          {logs.length > 0 && (
            <div className="relative border-t border-gray-200">
              {/* Resize Handle */}
              <div
                className={`h-2 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-blue-400 hover:to-cyan-500 cursor-ns-resize flex items-center justify-center transition-all ${
                  isDraggingResize ? 'from-blue-500 to-cyan-600' : ''
                }`}
                onMouseDown={handleResizeMouseDown}
              >
                <div className="w-16 h-1 bg-white/80 rounded-full shadow-sm" />
              </div>

              {/* Execution Log Panel with Tabs */}
              <ExecutionLogPanel
                executions={executions}
                activeExecutionId={activeExecutionId}
                onSelectExecution={setActiveExecutionId}
                onCancelExecution={cancelExecution}
                logPanelHeight={logPanelHeight}
              />
            </div>
          )}
        </div>
      </div>

      {/* Draggable Config Panel */}
      {configSidebarOpen && configAgent && currentProjectPath && (
          <div
            className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50 transition-colors duration-300"
            style={{
              left: `${configPanelPosition.x}px`,
              top: `${configPanelPosition.y}px`,
              width: '400px',
              maxHeight: '80vh',
              cursor: isDraggingConfigPanel ? 'grabbing' : 'default',
            }}
          >
            <div
              className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white p-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleConfigPanelMouseDown}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                <AgentAvatar
                  name={configAgent.name}
                  role={configAgent.role}
                  color={configAgent.color}
                  size="sm"
                />
                <div>
                  <h3 className="font-bold text-sm">{configAgent.name}</h3>
                  <p className="text-xs opacity-90">{configAgent.role}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setConfigSidebarOpen(false);
                  setConfigAgent(null);
                  setConfigNodeId(null);
                }}
                className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-300" style={{ maxHeight: 'calc(80vh - 60px)' }}>
              <AgentConfigForm
                agent={configAgent}
                projectPath={currentProjectPath}
                nodeId={configNodeId || undefined} // Pass nodeId for workflow node config
                onSave={() => {
                  setConfigSidebarOpen(false);
                  setConfigAgent(null);
                  setConfigNodeId(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Draggable Prompt Editor */}
        {showPromptEditor && editingPromptNode && (
          <div
            className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-300 dark:border-gray-700 z-50 transition-colors duration-300"
            style={{
              left: `${promptEditorPosition.x}px`,
              top: `${promptEditorPosition.y}px`,
              width: '768px',
              maxHeight: '80vh',
              cursor: isDraggingPromptEditor ? 'grabbing' : 'default',
            }}
          >
            <div
              className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400 text-white cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handlePromptEditorMouseDown}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                <AgentAvatar
                  name={editingPromptNode.data.agent.name}
                  role={editingPromptNode.data.agent.role}
                  color={editingPromptNode.data.agent.color}
                  size="sm"
                />
                <div>
                  <h2 className="text-lg font-bold">Edit Agent Prompt</h2>
                  <p className="text-sm opacity-90">{editingPromptNode.data.agent.name} - {editingPromptNode.data.agent.role}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPromptEditor(false);
                  setEditingPromptNode(null);
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                onMouseDown={(e) => e.stopPropagation()}
              >
                Cancel
              </button>
            </div>
              <div className="p-4 flex-1 overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-300">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default System Prompt:
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                      {editingPromptNode.data.agent.systemPrompt}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Workflow-Specific Prompt:
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Optional - will be appended to the default prompt)</span>
                  </label>
                  <textarea
                    className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent font-mono text-sm transition-colors duration-300"
                    placeholder="Add custom instructions for this agent in this specific workflow..."
                    defaultValue={customPrompts[editingPromptNode.id] || ''}
                    id="prompt-textarea"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2 transition-colors duration-300">
                <button
                  onClick={() => {
                    const textarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
                    if (textarea) {
                      handleSavePrompt(textarea.value);
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 font-medium"
                >
                  Save Prompt
                </button>
              </div>
          </div>
        )}

      {/* Edge Configuration Modal */}
      {editingEdge && (
        <EdgeConfigModal
          isOpen={showEdgeConfig}
          onClose={() => {
            setShowEdgeConfig(false);
            setEditingEdge(null);
          }}
          onSave={handleSaveEdgeCondition}
          sourceAgent={editingEdge.source}
          targetAgent={editingEdge.target}
          existingCondition={editingEdge.id ? edgeConditions[editingEdge.id] : undefined}
        />
      )}

      {/* Service Configuration Sidebar */}
      <ServiceConfigSidebar
        service={configService}
        projectPath={currentProjectPath || ''}
        nodeId={configServiceNodeId || undefined} // Pass nodeId for workflow node config
        onClose={() => {
          setConfigService(null);
          setConfigServiceNodeId(null);
        }}
        onSave={(configValues) => {
          console.log('Service configured:', configService?.id, 'nodeId:', configServiceNodeId, configValues);

          // Update all service nodes with this serviceId to show as configured
          // NOTE: Only update the specific node if nodeId is provided
          if (configService) {
            setNodes((nds) =>
              nds.map((node) => {
                // If nodeId is specified, only update that specific node
                // Otherwise update all nodes with this serviceId (legacy behavior)
                const shouldUpdate = configServiceNodeId
                  ? (node.id === configServiceNodeId)
                  : (node.type === 'serviceNode' && node.data.serviceId === configService.id);

                if (shouldUpdate) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      isConfigured: true,
                    },
                  };
                }
                return node;
              })
            );
          }

          setConfigService(null);
          setConfigServiceNodeId(null);
        }}
      />

      {/* Background Executions Monitor */}
      <BackgroundExecutionsPanel />

      {/* Workflow Schedule Modal */}
      {showScheduleModal && currentWorkflowId && (
        <WorkflowScheduleModal
          workflowId={currentWorkflowId}
          workflowName={currentWorkflowId}
          projectPath={currentProjectPath}
          onClose={() => setShowScheduleModal(false)}
          onScheduleCreated={() => {
            setShowScheduleModal(false);
            // Optionally show the schedules panel after creating a schedule
            setShowSchedulesPanel(true);
          }}
        />
      )}

      {/* Schedules Panel (Sidebar) */}
      {showSchedulesPanel && currentWorkflowId && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workflow Schedules</h2>
              <button
                onClick={() => setShowSchedulesPanel(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <WorkflowSchedulesList
              workflowId={currentWorkflowId}
              projectPath={currentProjectPath}
            />
          </div>
        </div>
      )}
    </>
  );
}
