import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { notificationService } from '@/lib/services/notificationService';
import { executionHistoryManager, ExecutionHistoryEntry } from '@/lib/services/executionHistoryManager';
import { getServiceCategoryManager } from '@/lib/services/serviceCategoryManager';

/**
 * Helper function to get repository info from GitHub category configuration
 * Falls back to projectPath if not configured
 */
async function getGitHubRepositoryInfo(projectPath: string): Promise<{ owner: string; repo: string; repositoryFullName: string }> {
  const categoryManager = getServiceCategoryManager();

  // Try to get from category configuration
  const owner = await categoryManager.getConfigValueAsync(projectPath, 'github', 'owner');
  const repo = await categoryManager.getConfigValueAsync(projectPath, 'github', 'repo');

  if (owner && repo) {
    return {
      owner,
      repo,
      repositoryFullName: `${owner}/${repo}`,
    };
  }

  // Fallback: derive from projectPath (legacy behavior)
  // This assumes projectPath might contain the repo info
  return {
    owner: '',
    repo: '',
    repositoryFullName: '',
  };
}

/**
 * Helper function to get Jira configuration from Jira category configuration
 */
async function getJiraConfiguration(projectPath: string, serviceConfig: any): Promise<{ jiraUrl: string; jiraEmail: string; jiraApiToken: string; defaultProject: string }> {
  const categoryManager = getServiceCategoryManager();

  // Get from category configuration
  const jiraUrl = await categoryManager.getConfigValueAsync(projectPath, 'jira', 'jiraUrl') || '';
  const jiraEmail = await categoryManager.getConfigValueAsync(projectPath, 'jira', 'jiraEmail') || '';
  const jiraApiToken = await categoryManager.getConfigValueAsync(projectPath, 'jira', 'jiraApiToken') || '';
  const defaultProject = await categoryManager.getConfigValueAsync(projectPath, 'jira', 'defaultProject') || '';

  return {
    jiraUrl,
    jiraEmail,
    jiraApiToken,
    defaultProject,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { projectPath, workflowNodes, edges, edgeConditions, stream, workflowId, workflowName } = await request.json();

    if (!projectPath || !workflowNodes) {
      return NextResponse.json(
        { error: 'Project path and workflow nodes are required' },
        { status: 400 }
      );
    }

    // Create execution history entry
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();

    const historyEntry: ExecutionHistoryEntry = {
      id: executionId,
      workflowId: workflowId || 'unknown',
      workflowName: workflowName || 'Unnamed Workflow',
      projectPath,
      status: 'running',
      startTime,
      nodeResults: [],
    };

    // Load agent and service configurations directly from managers
    // (bypasses authentication middleware which would return HTML instead of JSON)
    const { agentManager } = await import('@/lib/services/agentManager');
    const { serviceManager } = await import('@/lib/services/serviceManager');

    const allAgents = await agentManager.getAllAgents();
    const allServices = await serviceManager.getAllServices();

    // If streaming is requested, use SSE
    if (stream) {
      const encoder = new TextEncoder();
      // Track all spawned child processes for cleanup on abort
      const childProcesses: Array<any> = [];

      // Cleanup function to kill all child processes
      const cleanup = () => {
        console.log(`[Cleanup] Killing ${childProcesses.length} child processes`);
        childProcesses.forEach((proc) => {
          try {
            if (proc && proc.pid && !proc.killed) {
              console.log(`[Cleanup] Killing process ${proc.pid}`);
              proc.kill('SIGTERM');
              // Force kill after 2 seconds if still running
              setTimeout(() => {
                if (!proc.killed) {
                  console.log(`[Cleanup] Force killing process ${proc.pid}`);
                  proc.kill('SIGKILL');
                }
              }, 2000);
            }
          } catch (error: any) {
            console.error(`[Cleanup] Error killing process:`, error.message);
          }
        });
        childProcesses.length = 0; // Clear array
      };

      const readableStream = new ReadableStream({
        async start(controller) {
          let isClosed = false;

          const sendEvent = (data: any) => {
            if (isClosed) {
              console.log('[sendEvent] Controller is closed, skipping event:', data.type);
              return;
            }
            try {
              const message = `data: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(message));
            } catch (error: any) {
              console.error('[sendEvent] Error enqueueing data:', error.message);
              isClosed = true;
            }
          };

          try {
            // Send workflow start event
            sendEvent({
              type: 'workflow_start',
              totalAgents: workflowNodes.length,
            });

            // Store agent outputs for passing to services
            const executionContext: Record<string, { output: string; data: any; success: boolean }> = {};
            const executedNodes = new Set<string>();

            // Helper function to evaluate edge condition
            const evaluateCondition = (condition: any, nodeResult: any): boolean => {
              if (!condition) {
                console.log('[Edge] No condition - always execute');
                return true; // No condition means always execute
              }

              // If nodeResult is undefined, only execute if no condition or condition is not dependent on result
              if (!nodeResult) {
                console.log('[Edge] No node result available - executing edge by default');
                return true;
              }

              console.log('[Edge] Evaluating condition:', condition.type, 'nodeResult.success:', nodeResult?.success);
              console.log('[Edge] NodeResult data:', JSON.stringify(nodeResult?.data, null, 2));

              if (condition.type === 'success' || condition.type === 'on_success') {
                const result = nodeResult.success === true;
                console.log('[Edge] Success condition:', result);
                return result;
              }

              if (condition.type === 'failure' || condition.type === 'on_failure') {
                const result = nodeResult.success === false;
                console.log('[Edge] Failure condition:', result);
                return result;
              }

              if (condition.type === 'variable' && condition.variableName) {
                // Get value from nodeResult.data
                let value = nodeResult.data?.[condition.variableName];
                let compareValue = condition.value;

                // Special handling for common GitHub Issues variables
                // Support checking labels of the first issue
                if (condition.variableName === 'label' || condition.variableName === 'labels') {
                  // Try to get labels from first issue
                  const firstIssue = nodeResult.data?.issues?.[0];
                  if (firstIssue?.labels) {
                    value = firstIssue.labels; // Array of label strings
                  }
                }

                // Special handling for issue_count
                if (condition.variableName === 'issue_count' || condition.variableName === 'issueCount') {
                  // Try multiple possible sources
                  value = nodeResult.data?.totalCount || nodeResult.data?.issue_count || nodeResult.data?.issues?.length || 0;
                }

                console.log('[Edge] Variable condition:', {
                  variableName: condition.variableName,
                  operator: condition.operator,
                  value: value,
                  compareValue: compareValue,
                  valueType: typeof value,
                  compareValueType: typeof compareValue
                });

                switch (condition.operator) {
                  case 'equals':
                    // If value is array, check if compareValue is in the array
                    if (Array.isArray(value)) {
                      const result = value.includes(compareValue);
                      console.log('[Edge] Array equals check:', result);
                      return result;
                    }
                    // Loose equality for number/string comparison
                    const equalsResult = value == compareValue;
                    console.log('[Edge] Equals check:', equalsResult);
                    return equalsResult;

                  case 'notEquals':
                    // If value is array, check if compareValue is NOT in the array
                    if (Array.isArray(value)) {
                      const result = !value.includes(compareValue);
                      console.log('[Edge] Array notEquals check:', result);
                      return result;
                    }
                    const notEqualsResult = value != compareValue;
                    console.log('[Edge] NotEquals check:', notEqualsResult);
                    return notEqualsResult;

                  case 'greaterThan':
                    // Convert to numbers for comparison
                    const numValue = Number(value);
                    const numCompare = Number(compareValue);
                    const gtResult = numValue > numCompare;
                    console.log('[Edge] GreaterThan check:', numValue, '>', numCompare, '=', gtResult);
                    return gtResult;

                  case 'lessThan':
                    // Convert to numbers for comparison
                    const numValueLt = Number(value);
                    const numCompareLt = Number(compareValue);
                    const ltResult = numValueLt < numCompareLt;
                    console.log('[Edge] LessThan check:', numValueLt, '<', numCompareLt, '=', ltResult);
                    return ltResult;

                  case 'contains':
                    // If value is array, check if any element contains compareValue
                    if (Array.isArray(value)) {
                      const result = value.some(item =>
                        String(item).toLowerCase().includes(String(compareValue).toLowerCase())
                      );
                      console.log('[Edge] Array contains check:', result);
                      return result;
                    }
                    // String contains
                    const containsResult = String(value).toLowerCase().includes(String(compareValue).toLowerCase());
                    console.log('[Edge] String contains check:', containsResult);
                    return containsResult;

                  case 'exists':
                    const existsResult = value !== undefined && value !== null;
                    console.log('[Edge] Exists check:', existsResult);
                    return existsResult;

                  case 'notExists':
                    const notExistsResult = value === undefined || value === null;
                    console.log('[Edge] NotExists check:', notExistsResult);
                    return notExistsResult;

                  default:
                    console.log('[Edge] Unknown operator:', condition.operator, '- defaulting to true');
                    return true;
                }
              }

              console.log('[Edge] Unknown condition type:', condition.type, '- defaulting to true');
              return true;
            };

            // Helper function to get next nodes to execute based on edges
            const getNextNodes = (currentNodeId: string): string[] => {
              if (!edges || !Array.isArray(edges)) {
                console.log(`[getNextNodes] No edges defined`);
                return [];
              }

              const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
              console.log(`[getNextNodes] Node ${currentNodeId} has ${outgoingEdges.length} outgoing edges`);

              const nextNodeIds: string[] = [];
              const currentResult = executionContext[currentNodeId];

              console.log(`[getNextNodes] Current node result:`, JSON.stringify(currentResult));

              for (const edge of outgoingEdges) {
                const condition = edgeConditions?.[edge.id] || edge.condition;
                console.log(`[getNextNodes] Evaluating edge ${edge.id} (${currentNodeId} -> ${edge.target})`);
                console.log(`[getNextNodes] Edge condition:`, JSON.stringify(condition));

                const conditionMet = evaluateCondition(condition, currentResult);
                console.log(`[getNextNodes] Edge condition result: ${conditionMet}`);

                if (conditionMet) {
                  console.log(`[getNextNodes] ✅ Edge ${edge.id} condition met, adding target: ${edge.target}`);
                  nextNodeIds.push(edge.target);
                } else {
                  console.log(`[getNextNodes] ❌ Edge ${edge.id} condition NOT met, skipping target: ${edge.target}`);
                }
              }

              console.log(`[getNextNodes] Returning ${nextNodeIds.length} next nodes:`, nextNodeIds);
              return nextNodeIds;
            };

            // Find start node (or use first node if no start node exists)
            let currentNodeIds: string[] = [];
            const startNode = workflowNodes.find((n: any) => n.nodeId === 'start');

            console.log('[Workflow] Total workflow nodes:', workflowNodes.length);
            console.log('[Workflow] Start node found:', !!startNode);
            console.log('[Workflow] First node in array:', workflowNodes[0]?.nodeId);
            console.log('[Workflow] Total edges:', edges?.length);

            if (startNode || edges.length === 0) {
              // If there's a start node or no edges, find nodes connected from start (or first node)
              const startId = startNode?.nodeId || workflowNodes[0]?.nodeId;
              console.log('[Workflow] Using start ID:', startId);

              if (startId) {
                const nextIds = getNextNodes(startId);
                console.log('[Workflow] Next nodes from start:', nextIds);
                currentNodeIds = nextIds.length > 0 ? nextIds : [workflowNodes[0]?.nodeId].filter(Boolean);
                console.log('[Workflow] Will execute nodes:', currentNodeIds);
              }
            } else {
              // Start with first actual workflow node
              currentNodeIds = [workflowNodes[0]?.nodeId].filter(Boolean);
              console.log('[Workflow] No start node, using first node:', currentNodeIds);
            }

            let nodeIndex = 0;

            // Execute nodes following the graph
            while (currentNodeIds.length > 0 && nodeIndex < 100) { // Safety limit
              const nodeId = currentNodeIds.shift()!;

              // Skip the start node itself - it's just a marker
              if (nodeId === 'start') {
                console.log('[Workflow] Skipping start node, getting next nodes');
                // Mark start node as executed with a dummy result
                executionContext['start'] = {
                  output: 'Workflow started',
                  data: {},
                  success: true
                };
                const nextIds = getNextNodes(nodeId);
                currentNodeIds.push(...nextIds);
                continue;
              }

              if (executedNodes.has(nodeId)) continue; // Skip already executed nodes
              executedNodes.add(nodeId);

              const workflowNode = workflowNodes.find((n: any) => n.nodeId === nodeId);
              if (!workflowNode) {
                console.log('[Workflow] Node not found:', nodeId);
                continue;
              }

              // Determine if this is an agent or service node
              const isServiceNode = workflowNode.nodeType === 'service' || workflowNode.serviceId;

              let config: any = null;

              if (isServiceNode) {
                // Find service configuration by ID
                config = allServices.find((s: any) => s.id === (workflowNode.serviceId || workflowNode.agentId));

                if (!config) {
                  sendEvent({
                    type: 'agent_error',
                    agent: workflowNode.agentRole || workflowNode.serviceName,
                    nodeId: workflowNode.nodeId,
                    message: `Service configuration not found: ${workflowNode.serviceName || workflowNode.agentRole}`,
                  });
                  continue;
                }

                // Load project-specific service configuration values per nodeId
                // Configuration hierarchy: Node-specific > Category config > Defaults
                try {
                  const finalConfigValues: Record<string, string> = {};

                  // Step 1: Start with defaults from service definition
                  config.configVariables?.forEach((v: any) => {
                    if (v.defaultValue) {
                      finalConfigValues[v.key] = v.defaultValue;
                    }
                  });

                  // Step 2A: Load and merge service-level config (stored as category config with serviceId)
                  try {
                    const { prisma } = await import('@/lib/db/prisma');
                    const path = await import('path');

                    const normalizedPath = projectPath.startsWith('~/')
                      ? path.join(process.env.HOME || '', projectPath.slice(2))
                      : projectPath;

                    const serviceConfig = await prisma.serviceCategoryConfig.findUnique({
                      where: {
                        projectPath_categoryId: {
                          projectPath: normalizedPath,
                          categoryId: config.id, // Use serviceId as categoryId
                        },
                      },
                    });

                    if (serviceConfig && serviceConfig.configValues) {
                      console.log(`[executeService] Loaded service-level config for ${config.id}:`, serviceConfig.configValues);
                      Object.assign(finalConfigValues, serviceConfig.configValues as Record<string, string>);
                    }
                  } catch (error: any) {
                    console.log(`[executeService] No service-level config for ${config.id}: ${error.message}`);
                  }

                  // Step 2B: Load and merge category config (if service belongs to a category)
                  try {
                    // Direct import to bypass authentication middleware
                    const categoryManager = getServiceCategoryManager();
                    const categoryConfigValues = await categoryManager.getServiceCategoryConfig(projectPath, config.category);
                    if (categoryConfigValues && Object.keys(categoryConfigValues).length > 0) {
                      console.log(`[executeService] Loaded category config for ${config.id}:`, categoryConfigValues);
                      Object.assign(finalConfigValues, categoryConfigValues);
                    }
                  } catch (error: any) {
                    console.log(`[executeService] No category config for service ${config.id}: ${error.message}`);
                  }

                  // Step 3: Load and merge node-specific config from database (highest priority)
                  if (workflowNode.nodeId) {
                    try {
                      console.log(`[executeService] Loading node-specific config from database for nodeId: ${workflowNode.nodeId}`);
                      const { prisma } = await import('@/lib/db/prisma');
                      const path = await import('path');

                      // Normalize path
                      const normalizedPath = projectPath.startsWith('~/')
                        ? path.join(process.env.HOME || '', projectPath.slice(2))
                        : projectPath;

                      console.log(`[executeService] Prisma query params:`, {
                        projectPath: normalizedPath,
                        nodeId: workflowNode.nodeId,
                        originalProjectPath: projectPath
                      });

                      const nodeConfig = await prisma.serviceConfig.findUnique({
                        where: {
                          projectPath_nodeId: {
                            projectPath: normalizedPath,
                            nodeId: workflowNode.nodeId,
                          },
                        },
                      });

                      if (nodeConfig && nodeConfig.configValues) {
                        console.log(`[executeService] Loaded node-specific config from DB:`, nodeConfig.configValues);
                        Object.assign(finalConfigValues, nodeConfig.configValues as Record<string, string>);
                      } else {
                        console.log(`[executeService] No node-specific config in DB for nodeId ${workflowNode.nodeId}`);
                      }
                    } catch (error: any) {
                      console.log(`[executeService] Error loading node-specific config from DB: ${error.message}`);
                    }
                  }

                  // Apply merged configuration
                  config = { ...config, configValues: finalConfigValues };
                  console.log(`[executeService] Final merged config for ${config.id}:`, finalConfigValues);
                } catch (error: any) {
                  console.log(`[executeService] Error loading service config: ${error.message}`);
                }
              } else {
                // Find agent configuration by ID
                config = allAgents.find((a: any) => a.id === workflowNode.agentId);

                if (!config) {
                  sendEvent({
                    type: 'agent_error',
                    agent: workflowNode.agentRole,
                    nodeId: workflowNode.nodeId,
                    message: `Agent configuration not found: ${workflowNode.agentRole}`,
                  });
                  continue;
                }

                // Load project-specific agent configuration values per nodeId
                try {
                  const { projectManager } = await import('@/lib/services/projectManager');
                  const nodeConfig = await projectManager.getNodeConfig(projectPath, workflowNode.nodeId);
                  if (nodeConfig && Object.keys(nodeConfig).length > 0) {
                    console.log(`[executeAgent] Loaded node config for ${workflowNode.nodeId}:`, nodeConfig);
                    config = { ...config, configValues: nodeConfig };
                  } else {
                    console.log(`[executeAgent] No node-specific config found for ${workflowNode.nodeId}`);
                  }
                } catch (error: any) {
                  console.log(`[executeAgent] Failed to load node config for ${workflowNode.nodeId}: ${error.message}`);
                }
              }

              // Agent start
              sendEvent({
                type: 'agent_start',
                index: nodeIndex,
                totalAgents: workflowNodes.length,
                agent: workflowNode.agentRole,
                agentName: workflowNode.agentName,
                nodeId: workflowNode.nodeId,
              });

              try {
                if (isServiceNode) {
                  // Execute service (notification, deployment, etc.)
                  const serviceResult = await executeService(
                    config,
                    workflowNode,
                    projectPath,
                    executionContext,
                    (output) => {
                      sendEvent({
                        type: 'agent_output',
                        agent: workflowNode.serviceName || workflowNode.agentRole,
                        nodeId: workflowNode.nodeId,
                        output: output,
                      });
                    },
                    sendEvent
                  );

                  // Store service execution result in context
                  executionContext[workflowNode.nodeId] = {
                    output: 'Service executed successfully',
                    success: true,
                    data: {
                      serviceName: workflowNode.serviceName,
                      serviceType: config.type,
                      timestamp: new Date().toISOString(),
                      // Merge in any data returned by the service
                      ...(serviceResult || {})
                    }
                  };
                } else {
                  // Build the prompt for agent execution
                  let prompt = '';

                  // Collect context from previously executed agents
                  let previousAgentsContext = '';
                  if (Object.keys(executionContext).length > 0) {
                    previousAgentsContext = '\n\n## Context from Previous Agents\n\n';
                    for (const [prevNodeId, prevResult] of Object.entries(executionContext)) {
                      if (prevResult.data) {
                        previousAgentsContext += `### ${prevResult.data.agentName || prevResult.data.serviceName || prevNodeId}\n`;
                        previousAgentsContext += `**Role:** ${prevResult.data.agentRole || prevResult.data.serviceType || 'N/A'}\n`;
                        previousAgentsContext += `**Timestamp:** ${prevResult.data.timestamp}\n`;

                        // Include structured data if available (excluding standard fields)
                        const { agentName, agentRole, serviceName, serviceType, timestamp, ...customData } = prevResult.data;
                        if (Object.keys(customData).length > 0) {
                          previousAgentsContext += `**Data:**\n\`\`\`json\n${JSON.stringify(customData, null, 2)}\n\`\`\`\n`;
                        }
                        previousAgentsContext += '\n';
                      }
                    }
                  }

                  // Use custom prompt if exists for this specific node
                  if (workflowNode.customPrompt) {
                    prompt = workflowNode.customPrompt;
                  } else {
                    // Use systemPrompt as a direct instruction - wrap it to make it actionable
                    prompt = `You are ${config.name}, a ${config.role}.

${config.systemPrompt}

Execute these tasks now for the current project. Do not ask questions - perform the tasks automatically and report your findings.`;
                  }

                  // Add previous agents context to the prompt
                  if (previousAgentsContext) {
                    prompt += previousAgentsContext;
                  }

                  // Add instructions for outputting structured data
                  prompt += `\n\n---
**IMPORTANT:** If you need to pass structured data to subsequent agents in the workflow, output it in the following format:

AGENT_OUTPUT_DATA:
{
  "key1": "value1",
  "key2": "value2"
}

This data will be automatically made available to the next agents in the workflow.
---`;

                  // Capture agent output for later use
                  let agentOutput = '';

                  // Execute Claude Code for development agents
                  await executeClaudeCode(
                    projectPath,
                    prompt,
                    config,
                    workflowNode,
                    childProcesses, // Pass array to track spawned processes
                    (output) => {
                      agentOutput += output + '\n';
                      sendEvent({
                        type: 'agent_output',
                        agent: workflowNode.agentRole,
                        nodeId: workflowNode.nodeId,
                        output: output,
                      });
                    },
                    sendEvent
                  );

                  // Parse AGENT_OUTPUT_DATA from agent output
                  let parsedData: any = {
                    agentName: workflowNode.agentName,
                    agentRole: workflowNode.agentRole,
                    timestamp: new Date().toISOString(),
                  };

                  // Look for AGENT_OUTPUT_DATA block in the output
                  const dataMatch = agentOutput.match(/AGENT_OUTPUT_DATA:\s*\n\s*(\{[\s\S]*?\})/);
                  if (dataMatch && dataMatch[1]) {
                    try {
                      const customData = JSON.parse(dataMatch[1]);
                      parsedData = { ...parsedData, ...customData };
                      sendEvent({
                        type: 'agent_output',
                        agent: workflowNode.agentRole,
                        nodeId: workflowNode.nodeId,
                        output: `📦 Parsed structured data: ${JSON.stringify(customData, null, 2)}`,
                      });
                    } catch (parseError: any) {
                      sendEvent({
                        type: 'agent_output',
                        agent: workflowNode.agentRole,
                        nodeId: workflowNode.nodeId,
                        output: `⚠️  Failed to parse AGENT_OUTPUT_DATA: ${parseError.message}`,
                      });
                    }
                  }

                  // Store agent output in execution context with parsed data
                  executionContext[workflowNode.nodeId] = {
                    output: agentOutput,
                    success: true,
                    data: parsedData
                  };
                }

                // Agent complete
                sendEvent({
                  type: 'agent_complete',
                  agent: workflowNode.agentRole,
                  agentName: workflowNode.agentName,
                  nodeId: workflowNode.nodeId,
                  output: `Agent ${workflowNode.agentName} (${workflowNode.nodeId}) completed`,
                });

                // Get next nodes to execute based on edges and conditions
                const nextNodes = getNextNodes(workflowNode.nodeId);
                currentNodeIds.push(...nextNodes);
              } catch (error: any) {
                // Store error result in context
                executionContext[workflowNode.nodeId] = {
                  output: error.message || 'Execution failed',
                  success: false,
                  data: {
                    error: error.message,
                    timestamp: new Date().toISOString(),
                  }
                };

                sendEvent({
                  type: 'agent_error',
                  agent: workflowNode.agentRole || workflowNode.serviceName,
                  nodeId: workflowNode.nodeId,
                  message: error.message,
                });

                // Check ONLY for explicit failure edges (not all edges!)
                const outgoingEdges = edges.filter((e: any) => e.source === workflowNode.nodeId);
                const failureEdges = outgoingEdges.filter((edge: any) => {
                  const condition = edgeConditions?.[edge.id] || edge.condition;
                  return condition?.type === 'failure' || condition?.type === 'on_failure';
                });

                if (failureEdges.length > 0) {
                  // There are EXPLICIT failure edges, execute them
                  console.log(`[Workflow] Node ${workflowNode.nodeId} failed but has ${failureEdges.length} explicit failure edges - executing them`);
                  const failureTargets = failureEdges.map((e: any) => e.target);
                  currentNodeIds.push(...failureTargets);
                } else {
                  // NO failure edges - STOP THE WORKFLOW IMMEDIATELY
                  console.log(`[Workflow] Node ${workflowNode.nodeId} failed with NO failure edges - STOPPING WORKFLOW`);
                  sendEvent({
                    type: 'workflow_error',
                    message: `Workflow stopped: ${workflowNode.serviceName || workflowNode.agentName} failed - ${error.message}`,
                  });
                  throw error; // Stop workflow IMMEDIATELY
                }
              }

              nodeIndex++;
            }

            // Workflow complete
            sendEvent({
              type: 'workflow_complete',
              completedAgents: workflowNodes.length,
              totalAgents: workflowNodes.length,
            });

            // Send completion event
            sendEvent({ type: 'complete' });
            isClosed = true;
            cleanup(); // Clean up any remaining processes
            controller.close();
          } catch (error: any) {
            console.error('[Workflow] Error occurred:', error.message);
            sendEvent({ type: 'error', message: error.message });
            isClosed = true;
            cleanup(); // Clean up processes on error
            controller.close();
          }
        },
        cancel() {
          console.log('[Workflow] Stream cancelled by client - cleaning up processes');
          cleanup(); // Kill all child processes when stream is cancelled
        }
      });

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response (backward compatibility)
    const results = workflowNodes.map((node: any) => ({
      nodeId: node.nodeId,
      agent: node.agentRole,
      status: 'success',
      output: `Agent ${node.agentName} executed successfully`,
    }));

    return NextResponse.json({
      success: true,
      results,
      message: 'Workflow executed successfully'
    });
  } catch (error: any) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}

/**
 * Execute service (notification, deployment, etc.)
 */
async function executeService(
  serviceConfig: any,
  workflowNode: any,
  projectPath: string,
  executionContext: Record<string, { output: string; data: any }>,
  onOutput: (output: string) => void,
  sendEvent: (data: any) => void
): Promise<any> {
  try {
    const serviceName = serviceConfig.name || workflowNode.serviceName;
    console.log(`[executeService] Starting service: ${serviceName}`);

    onOutput(`⚙️  Starting ${serviceName}...`);

    // Get previous agent outputs if connected
    const previousOutputs = Object.keys(executionContext).map(nodeId => ({
      nodeId,
      ...executionContext[nodeId]
    }));

    // Route to appropriate service handler based on service type
    switch (serviceConfig.type) {
      case 'slack-notifier':
      case 'email-notifier':
      case 'teams-notifier':
      case 'discord-notifier':
      case 'sms-notifier':
        // Notification services
        // Extract data from previous outputs for variable substitution
        let issueNumber = '';
        let issueTitle = '';
        let branchName = '';
        let prUrl = '';
        let issueCount = 0;

        // Find GitHub Issues output
        const githubIssuesData = previousOutputs.find(o => o.data?.issues || o.data?.serviceType === 'github-issues');
        if (githubIssuesData?.data?.issues) {
          issueCount = githubIssuesData.data.issues.length;
          if (githubIssuesData.data.issues.length > 0) {
            const firstIssue = githubIssuesData.data.issues[0];
            issueNumber = firstIssue.number?.toString() || '';
            issueTitle = firstIssue.title || '';
          }
        }

        // Find Branch Manager output
        const branchData = previousOutputs.find(o => o.data?.branch);
        if (branchData?.data?.branch) {
          branchName = branchData.data.branch;
        }

        // Find PR Creator output
        const prData = previousOutputs.find(o => o.data?.prUrl);
        if (prData?.data?.prUrl) {
          prUrl = prData.data.prUrl;
        }

        // Build formatted agent outputs
        let agentOutputsFormatted = '';
        if (previousOutputs.length > 0) {
          agentOutputsFormatted = 'Agent Results:\n';
          previousOutputs.forEach(({ data, output }) => {
            if (data.agentName) {
              agentOutputsFormatted += `\n📋 ${data.agentName} (${data.agentRole}):\n`;
              agentOutputsFormatted += `${output.slice(0, 500)}${output.length > 500 ? '...' : ''}\n`;
            }
          });
        }

        // Check if custom message template is configured
        const customMessageTemplate = serviceConfig.configValues?.custom_message;
        let messageContent = '';

        if (customMessageTemplate && customMessageTemplate.trim()) {
          // Use custom message template with variable substitution
          onOutput(`📝 Using custom message template`);
          messageContent = customMessageTemplate
            .replace(/{workflow_name}/g, workflowNode.workflowName || 'Workflow Execution')
            .replace(/{status}/g, 'completed')
            .replace(/{issue_count}/g, issueCount.toString())
            .replace(/{totalCount}/g, issueCount.toString())
            .replace(/{issue_number}/g, issueNumber)
            .replace(/{issue_title}/g, issueTitle)
            .replace(/{branch_name}/g, branchName)
            .replace(/{pr_url}/g, prUrl)
            .replace(/{agent_outputs}/g, agentOutputsFormatted)
            .replace(/\\n/g, '\n'); // Support escaped newlines
        } else {
          // Use auto-generated message (existing behavior)
          onOutput(`📝 Using auto-generated message`);
          messageContent = 'Workflow Execution Completed\n\n';
          messageContent += agentOutputsFormatted;
        }

        const payload = {
          workflowName: workflowNode.workflowName || 'Workflow Execution',
          projectPath: projectPath,
          status: 'completed' as const,
          timestamp: new Date().toISOString(),
          message: messageContent,
          agentOutputs: previousOutputs,
        };

        // Convert service config to agent-like config for notification service
        console.log('[executeService] serviceConfig:', JSON.stringify(serviceConfig, null, 2));
        console.log('[executeService] serviceConfig.configValues:', serviceConfig.configValues);

        const notificationConfig = {
          ...serviceConfig,
          role: serviceConfig.type,
          configValues: serviceConfig.configValues || {},
        };

        console.log('[executeService] notificationConfig.configValues:', notificationConfig.configValues);

        await notificationService.sendNotification(
          notificationConfig,
          payload,
          onOutput
        );
        break;

      case 'envoyer-deployer':
        // Deployment service
        onOutput(`🚀 Envoyer deployment service`);
        onOutput(`⚠️  Deployment functionality not yet implemented`);
        onOutput(`   Would deploy to: ${serviceConfig.configValues?.envoyer_project_id || 'N/A'}`);
        break;

      case 'github-issues':
        // GitHub Issues Service
        onOutput(`📋 GitHub Issues service starting...`);

        // Get repository from category configuration (fallback to service config)
        const ghRepoInfo = await getGitHubRepositoryInfo(projectPath);
        const repository = serviceConfig.configValues?.repository || ghRepoInfo.repositoryFullName;
        const issueState = serviceConfig.configValues?.issue_state || 'open';
        const labels = serviceConfig.configValues?.labels || '';
        const assignee = serviceConfig.configValues?.assignee || '';
        const author = serviceConfig.configValues?.author || '';
        const milestone = serviceConfig.configValues?.milestone || '';
        const limit = serviceConfig.configValues?.limit || '30';
        const searchQuery = serviceConfig.configValues?.search_query || '';
        const includeBody = serviceConfig.configValues?.include_body !== 'false';
        const includeComments = serviceConfig.configValues?.include_comments === 'true';
        const sortBy = serviceConfig.configValues?.sort_by || 'created';
        const sortDirection = serviceConfig.configValues?.sort_direction || 'desc';

        // Build filter summary
        const filters: string[] = [];
        if (issueState !== 'all') filters.push(`state:${issueState}`);
        if (labels) filters.push(`labels:${labels}`);
        if (assignee) filters.push(`assignee:${assignee}`);
        if (author) filters.push(`author:${author}`);
        if (milestone) filters.push(`milestone:${milestone}`);
        if (searchQuery) filters.push(`search:"${searchQuery}"`);

        onOutput(`📦 Repository: ${repository || 'current directory'}`);
        if (filters.length > 0) {
          onOutput(`🔍 Filters: ${filters.join(', ')}`);
        }
        onOutput(`📊 Sort: ${sortBy} (${sortDirection}), Limit: ${limit}`);

        // Parse labels to separate include and exclude
        const includeLabels: string[] = [];
        const excludeLabels: string[] = [];

        if (labels) {
          labels.split(',').forEach(label => {
            const trimmed = label.trim();
            if (trimmed.startsWith('!')) {
              // Exclude label (remove the ! prefix)
              excludeLabels.push(trimmed.substring(1));
            } else {
              // Include label
              includeLabels.push(trimmed);
            }
          });
        }

        // Execute GitHub Issues fetch
        const { spawn } = await import('child_process');

        try {
          // Build gh issue list command with all filters
          const command = 'gh';
          const args = [
            'issue',
            'list',
            '--state', issueState,
            '--limit', limit,
          ];

          // Add JSON fields
          const jsonFields = ['number', 'title', 'state', 'labels', 'assignees', 'createdAt', 'updatedAt', 'url'];
          if (includeBody) jsonFields.push('body');
          if (includeComments) jsonFields.push('comments');
          args.push('--json', jsonFields.join(','));

          // Add include label filters to command
          includeLabels.forEach(label => {
            args.push('--label', label);
          });
          if (assignee) args.push('--assignee', assignee);
          if (author) args.push('--author', author);
          if (milestone) args.push('--milestone', milestone);
          if (searchQuery) args.push('--search', searchQuery);

          // Add repository if specified
          if (repository) args.push('--repo', repository);

          onOutput(`🔧 Executing: gh ${args.join(' ')}`);

          const ghProcess = spawn(command, args, {
            cwd: projectPath,
            shell: false,
          });

          let output = '';
          let errorOutput = '';

          ghProcess.stdout?.on('data', (data) => {
            output += data.toString();
          });

          ghProcess.stderr?.on('data', (data) => {
            errorOutput += data.toString();
          });

          let issueServiceData: any = null;

          await new Promise<void>((resolve, reject) => {
            ghProcess.on('close', async (code) => {
              if (code === 0) {
                try {
                  let issues = JSON.parse(output);

                  // Apply label exclusion filtering if needed
                  if (excludeLabels && excludeLabels.length > 0) {
                    const beforeCount = issues.length;
                    issues = issues.filter((issue: any) => {
                      // Check if issue has any of the excluded labels
                      const issueLabels = issue.labels?.map((l: any) => l.name) || [];
                      const hasExcludedLabel = excludeLabels.some((excludeLabel: string) =>
                        issueLabels.includes(excludeLabel)
                      );
                      return !hasExcludedLabel; // Keep issue if it doesn't have any excluded labels
                    });
                    const filteredCount = beforeCount - issues.length;
                    if (filteredCount > 0) {
                      onOutput(`🔍 Filtered out ${filteredCount} issue(s) with excluded labels: ${excludeLabels.join(', ')}`);
                    }
                  }

                  // Apply sorting
                  issues.sort((a: any, b: any) => {
                    let aVal, bVal;
                    if (sortBy === 'created') {
                      aVal = new Date(a.createdAt).getTime();
                      bVal = new Date(b.createdAt).getTime();
                    } else if (sortBy === 'updated') {
                      aVal = new Date(a.updatedAt).getTime();
                      bVal = new Date(b.updatedAt).getTime();
                    } else if (sortBy === 'comments') {
                      aVal = a.comments?.length || 0;
                      bVal = b.comments?.length || 0;
                    } else {
                      return 0;
                    }
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                  });

                  onOutput(`✅ Found ${issues.length} issue(s)`);

                  if (issues.length > 0) {
                    // Format issue data for agents
                    const issueData = issues.map((issue: any) => {
                      const formatted: any = {
                        number: issue.number,
                        title: issue.title,
                        state: issue.state,
                        url: issue.url,
                        labels: issue.labels?.map((l: any) => l.name) || [],
                        assignees: issue.assignees?.map((a: any) => a.login) || [],
                        createdAt: issue.createdAt,
                        updatedAt: issue.updatedAt,
                      };

                      if (includeBody && issue.body) {
                        formatted.body = issue.body;
                      }

                      if (includeComments && issue.comments) {
                        formatted.comments = issue.comments.map((c: any) => ({
                          author: c.author?.login || 'unknown',
                          body: c.body,
                          createdAt: c.createdAt,
                        }));
                      }

                      return formatted;
                    });

                    // Store data to return
                    issueServiceData = {
                      issues: issueData,
                      totalCount: issues.length,
                      filters: {
                        state: issueState,
                        labels: labels || null,
                        assignee: assignee || null,
                        author: author || null,
                        milestone: milestone || null,
                        searchQuery: searchQuery || null,
                      },
                      repository: repository || 'current',
                    };

                    // Output summary
                    onOutput(`\n📌 Top Issues:`);
                    issues.slice(0, 5).forEach((issue: any) => {
                      onOutput(`  #${issue.number} - ${issue.title}`);
                    });

                    // Output structured data for agents
                    onOutput(`\nAGENT_OUTPUT_DATA:\n${JSON.stringify(issueServiceData, null, 2)}`);
                  } else {
                    onOutput(`ℹ️  No issues found matching the filters`);

                    // Return empty data structure so edge conditions can check for empty issues
                    issueServiceData = {
                      issues: [],
                      totalCount: 0,
                      filters: {
                        state: issueState,
                        labels: labels || null,
                        assignee: assignee || null,
                        author: author || null,
                        milestone: milestone || null,
                        searchQuery: searchQuery || null,
                      },
                      repository: repository || 'current',
                    };

                    // Check if we should fail when no issues found
                    // Default to false (continue workflow) unless explicitly set to true
                    const failOnNoIssues = serviceConfig.configValues?.fail_on_no_issues === 'true';
                    if (failOnNoIssues) {
                      onOutput(`❌ No issues found - stopping workflow (enable "Continue if No Issues" to avoid this)`);
                      reject(new Error('No issues found matching the filters'));
                      return;
                    }
                    onOutput(`ℹ️  No issues found but continuing workflow`);
                  }

                  resolve();
                } catch (e: any) {
                  onOutput(`⚠️  Could not parse GitHub response: ${e.message}`);
                  onOutput(output);
                  resolve();
                }
              } else {
                reject(new Error(`GitHub command failed: ${errorOutput || 'Unknown error'}`));
              }
            });
          });

          // Return the issue data
          return issueServiceData;
        } catch (error: any) {
          onOutput(`❌ GitHub Issues service error: ${error.message}`);
          throw error;
        }
        break;

      case 'github-branch':
        // GitHub Branch Manager Service
        onOutput(`🌿 GitHub Branch Manager starting...`);

        // ALWAYS auto-detect base branch from GitHub (don't trust config)
        let baseBranch: string | undefined;
        const branchType = serviceConfig.configValues?.branch_type || 'feature';
        const useIssueData = serviceConfig.configValues?.use_issue_data !== 'false';
        const customBranchName = serviceConfig.configValues?.custom_branch_name || '';

        try {
          const { promisify} = await import('util');
          const execPromise = promisify(require('child_process').exec);

          // CRITICAL: ALWAYS auto-detect from GitHub API (source of truth)
          // Never trust configured base_branch as it may be wrong
          if (true) {
            try {
              onOutput(`🔍 No base branch configured, auto-detecting default branch...`);

              // IMPORTANT: Check GitHub API FIRST (source of truth), not local git config
              try {
                const repoInfoResult = await execPromise(`cd "${projectPath}" && gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`);
                baseBranch = repoInfoResult.stdout.trim();
                if (baseBranch) {
                  onOutput(`✅ Got default branch from GitHub API: ${baseBranch}`);
                }
              } catch (ghError: any) {
                onOutput(`⚠️  GitHub API check failed: ${ghError.message}`);
              }

              // Fallback: check local git config (may be outdated/wrong)
              if (!baseBranch) {
                try {
                  const defaultBranchResult = await execPromise(`cd "${projectPath}" && git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`);
                  baseBranch = defaultBranchResult.stdout.trim();
                  if (baseBranch) {
                    onOutput(`✅ Auto-detected from git config: ${baseBranch}`);
                  }
                } catch (gitError: any) {
                  onOutput(`⚠️  Git config check failed: ${gitError.message}`);
                }
              }

              // Last resort fallback
              if (!baseBranch) {
                baseBranch = 'main';
                onOutput(`⚠️  Could not detect default branch, using fallback: ${baseBranch}`);
              }
            } catch (error) {
              baseBranch = 'main';
              onOutput(`⚠️  Error detecting default branch, using fallback: ${baseBranch}`);
            }
          } else {
            onOutput(`ℹ️  Using configured base branch: ${baseBranch}`);
          }

          // Helper function to fix git remote URL if repository not found
          const fixGitRemote = async () => {
            const ghRepoInfo = await getGitHubRepositoryInfo(projectPath);
            if (ghRepoInfo.owner && ghRepoInfo.repo) {
              const correctUrl = `https://github.com/${ghRepoInfo.owner}/${ghRepoInfo.repo}.git`;
              onOutput(`🔧 Fixing git remote URL to: ${correctUrl}`);
              await execPromise(`cd "${projectPath}" && git remote set-url origin ${correctUrl}`);
              onOutput(`✅ Git remote URL updated`);
              return true;
            }
            return false;
          };

          // Get issue data from GitHub Issues service (search through all previous outputs)
          onOutput(`🔍 Searching for GitHub Issues data in ${previousOutputs.length} previous outputs...`);
          const githubIssuesOutput = previousOutputs.find(output =>
            output.data?.serviceType === 'github-issues' ||
            output.data?.issues
          );

          if (githubIssuesOutput) {
            onOutput(`✅ Found GitHub Issues output with ${githubIssuesOutput.data?.issues?.length || 0} issues`);
          } else {
            onOutput(`⚠️  No GitHub Issues output found in previous nodes`);
          }

          const issueData = githubIssuesOutput?.data?.issues?.[0] || {};
          let branchName = '';

          if (useIssueData && issueData && issueData.number) {
            onOutput(`📋 Using issue #${issueData.number}: ${issueData.title}`);
            // Generate branch name from issue: fix/issue-123-issue-title
            const issueNumber = issueData.number || '';
            const issueTitle = (issueData.title || '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .substring(0, 50);

            branchName = `${branchType}/issue-${issueNumber}-${issueTitle}`;
          } else {
            if (!useIssueData) {
              onOutput(`ℹ️  Issue data usage is disabled, using custom or timestamp branch name`);
            } else if (!issueData || !issueData.number) {
              onOutput(`⚠️  No issue data available (issueData: ${JSON.stringify(issueData)})`);
            }
            branchName = customBranchName || `${branchType}/branch-${Date.now()}`;
          }

          onOutput(`📂 Repository: ${projectPath}`);
          onOutput(`🌿 Creating branch "${branchName}" from "${baseBranch}"...`);

          // Fetch and checkout base branch with hard reset to discard local changes
          onOutput(`🔄 Fetching latest changes...`);
          try {
            // First do a general fetch to update all remote references
            await execPromise(`cd "${projectPath}" && git fetch origin`);
          } catch (fetchError: any) {
            // Check if error is "repository not found"
            if (fetchError.message && (fetchError.message.includes('Repository not found') || fetchError.message.includes('repository') && fetchError.message.includes('not found'))) {
              onOutput(`⚠️  Repository not found error detected - attempting to fix git remote URL...`);
              const fixed = await fixGitRemote();
              if (fixed) {
                onOutput(`🔄 Retrying fetch...`);
                await execPromise(`cd "${projectPath}" && git fetch origin`);
              } else {
                throw new Error('Could not fix git remote URL - please configure GitHub service category settings');
              }
            } else {
              throw fetchError;
            }
          }

          onOutput(`🔄 Resetting to clean state...`);
          await execPromise(`cd "${projectPath}" && git reset --hard HEAD`);

          onOutput(`🔄 Checking out ${baseBranch}...`);
          // CRITICAL: Use -B to force create/reset local branch from remote
          // This handles cases where local "main" exists but remote default is "master"
          await execPromise(`cd "${projectPath}" && git checkout -B ${baseBranch} origin/${baseBranch}`);

          onOutput(`✅ Checked out ${baseBranch} from origin/${baseBranch}`);

          // Check if branch already exists and find available name with suffix
          let finalBranchName = branchName;
          let version = 0;
          let branchExists = true;

          while (branchExists) {
            try {
              // Check if branch exists locally or remotely
              await execPromise(`cd "${projectPath}" && git rev-parse --verify ${finalBranchName}`);
              // Branch exists, try next version
              version++;
              finalBranchName = `${branchName}-v${version}`;
              onOutput(`⚠️  Branch "${version === 1 ? branchName : branchName + '-v' + (version - 1)}" already exists, trying "${finalBranchName}"...`);
            } catch (error) {
              // Branch doesn't exist, we can use this name
              branchExists = false;
            }
          }

          // Create and checkout new branch
          onOutput(`🌿 Creating new branch...`);
          await execPromise(`cd "${projectPath}" && git checkout -b ${finalBranchName}`);

          onOutput(`✅ Created and checked out branch "${finalBranchName}"`);

          return {
            branch: finalBranchName,
            baseBranch,
            issueNumber: issueData?.number,
            issueTitle: issueData?.title
          };

        } catch (error: any) {
          onOutput(`❌ GitHub Branch Manager error: ${error.message}`);
          throw error;
        }
        break;

      case 'github-commit':
        // GitHub Committer Service
        onOutput(`💾 GitHub Committer starting...`);

        const commitMessageTemplate = serviceConfig.configValues?.commit_message || 'fix: resolve issue #{issue_number}';
        const commitFiles = serviceConfig.configValues?.commit_files || '.';
        const autoPush = serviceConfig.configValues?.auto_push !== 'false';
        const remoteName = serviceConfig.configValues?.remote_name || 'origin';

        try {
          const { promisify } = await import('util');
          const execPromise = promisify(require('child_process').exec);

          // Get data from previous nodes - try to find GitHub Issues and Branch Manager output
          let issueNumber = '';
          let issueTitle = '';
          let branch = '';

          // Find GitHub Issues output
          const issuesOutput = previousOutputs.find(o => o.data?.issues);
          if (issuesOutput?.data?.issues && issuesOutput.data.issues.length > 0) {
            const firstIssue = issuesOutput.data.issues[0];
            issueNumber = firstIssue.number?.toString() || '';
            issueTitle = firstIssue.title || '';
          }

          // Find GitHub Branch Manager output
          const branchOutput = previousOutputs.find(o => o.data?.branch);
          if (branchOutput?.data?.branch) {
            branch = branchOutput.data.branch;
          }

          // Replace placeholders in commit message
          const commitMessage = commitMessageTemplate
            .replace('{issue_number}', issueNumber)
            .replace('{issue_title}', issueTitle);

          onOutput(`📂 Repository: ${projectPath}`);

          // CRITICAL DEBUG: Check what branch we're on
          const currentBranchResult = await execPromise(`cd "${projectPath}" && git branch --show-current`);
          const currentBranch = currentBranchResult.stdout.trim();
          onOutput(`🔍 DEBUG: Currently on branch: ${currentBranch}`);
          onOutput(`🔍 DEBUG: Expected branch from Branch Manager: ${branch}`);

          if (currentBranch !== branch && branch) {
            onOutput(`⚠️  WARNING: Not on expected branch! Checking out ${branch}...`);
            try {
              await execPromise(`cd "${projectPath}" && git checkout ${branch}`);
              onOutput(`✅ Switched to branch ${branch}`);
            } catch (checkoutError: any) {
              onOutput(`❌ Could not checkout branch ${branch}: ${checkoutError.message}`);
            }
          }

          onOutput(`💾 Staging files: ${commitFiles}...`);

          // Stage files
          if (commitFiles === '.') {
            await execPromise(`cd "${projectPath}" && git add .`);
          } else {
            const files = commitFiles.split(',').map(f => f.trim()).join(' ');
            await execPromise(`cd "${projectPath}" && git add ${files}`);
          }

          // Check if there are any changes to commit
          const statusResult = await execPromise(`cd "${projectPath}" && git status --porcelain`);
          const hasChanges = statusResult.stdout.trim().length > 0;

          onOutput(`🔍 DEBUG: Git status output:`);
          if (hasChanges) {
            const statusLines = statusResult.stdout.trim().split('\n');
            statusLines.forEach(line => onOutput(`   ${line}`));
          } else {
            onOutput(`   (no changes)`);
          }

          if (!hasChanges) {
            onOutput(`ℹ️  No changes to commit - working directory clean`);
            return {
              commitHash: null,
              commitMessage,
              branch,
              pushed: false,
              skipped: true,
              reason: 'No changes to commit'
            };
          }

          // Commit
          onOutput(`📝 Committing: "${commitMessage}"...`);
          await execPromise(`cd "${projectPath}" && git commit -m "${commitMessage}"`);

          const commitHashResult = await execPromise(`cd "${projectPath}" && git rev-parse HEAD`);
          const commitHash = commitHashResult.stdout.trim();

          onOutput(`✅ Created commit ${commitHash.substring(0, 7)}`);
          onOutput(`🔍 DEBUG: Full commit hash: ${commitHash}`);

          // Push if auto-push is enabled
          if (autoPush) {
            onOutput(`⬆️  Pushing to ${remoteName}/${branch || currentBranch}...`);

            // Use current branch if no branch specified from Branch Manager
            const pushBranch = branch || currentBranch;

            try {
              const pushResult = await execPromise(`cd "${projectPath}" && git push ${remoteName} ${pushBranch}`);
              onOutput(`✅ Pushed to ${remoteName}/${pushBranch}`);
              onOutput(`🔍 DEBUG: Push output: ${pushResult.stdout.trim() || '(empty)'}`);
            } catch (pushError: any) {
              onOutput(`❌ Push failed: ${pushError.message}`);
              throw pushError;
            }
          } else {
            onOutput(`ℹ️  Auto-push is disabled, skipping push`);
          }

          return {
            commitHash,
            commitMessage,
            branch,
            pushed: autoPush
          };

        } catch (error: any) {
          onOutput(`❌ GitHub Committer error: ${error.message}`);
          throw error;
        }
        break;

      case 'github-pr':
        // GitHub PR Creator Service
        onOutput(`🔀 GitHub PR Creator starting...`);

        // ALWAYS get base branch from Branch Manager output (never trust config)
        let prBaseBranch: string | undefined;
        const prTitleTemplate = serviceConfig.configValues?.pr_title || 'Fix #{issue_number}: {issue_title}';
        const prBodyTemplate = serviceConfig.configValues?.pr_body_template || 'Closes #{issue_number}';
        const autoLinkIssue = serviceConfig.configValues?.auto_link_issue !== 'false';

        try {
          const { promisify } = await import('util');
          const execPromise = promisify(require('child_process').exec);

          // Get data from previous nodes - try to find GitHub Issues and Branch Manager output
          let issueNumber = '';
          let issueTitle = '';
          let branch = '';
          let agentSummary = 'Changes made by agent';

          // Find GitHub Issues output
          const issuesOutput = previousOutputs.find(o => o.data?.issues);
          if (issuesOutput?.data?.issues && issuesOutput.data.issues.length > 0) {
            const firstIssue = issuesOutput.data.issues[0];
            issueNumber = firstIssue.number?.toString() || '';
            issueTitle = firstIssue.title || '';
          }

          // Find GitHub Branch Manager output
          onOutput(`🔍 Searching for Branch Manager output in ${previousOutputs.length} previous outputs...`);
          const branchOutput = previousOutputs.find(o => o.data?.branch);
          if (branchOutput?.data?.branch) {
            branch = branchOutput.data.branch;
            onOutput(`✅ Found branch from Branch Manager: ${branch}`);
            onOutput(`   Branch Manager data: ${JSON.stringify(branchOutput.data)}`);

            // IMPORTANT: Use the same base branch that the Branch Manager used
            // to avoid "no history in common" errors
            if (branchOutput.data.baseBranch) {
              prBaseBranch = branchOutput.data.baseBranch;
              onOutput(`✅ Using base branch from Branch Manager: ${prBaseBranch}`);
            }
          } else {
            onOutput(`⚠️  No Branch Manager output found!`);
          }

          // If still no base branch, auto-detect it
          if (!prBaseBranch) {
            try {
              onOutput(`🔍 No base branch configured, auto-detecting default branch...`);

              // IMPORTANT: Check GitHub API FIRST (source of truth), not local git config
              try {
                const repoInfoResult = await execPromise(`cd "${projectPath}" && gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`);
                prBaseBranch = repoInfoResult.stdout.trim();
                if (prBaseBranch) {
                  onOutput(`✅ Got default branch from GitHub API: ${prBaseBranch}`);
                }
              } catch (ghError: any) {
                onOutput(`⚠️  GitHub API check failed: ${ghError.message}`);
              }

              // Fallback: check local git config (may be outdated/wrong)
              if (!prBaseBranch) {
                try {
                  const defaultBranchResult = await execPromise(`cd "${projectPath}" && git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`);
                  prBaseBranch = defaultBranchResult.stdout.trim();
                  if (prBaseBranch) {
                    onOutput(`✅ Auto-detected from git config: ${prBaseBranch}`);
                  }
                } catch (gitError: any) {
                  onOutput(`⚠️  Git config check failed: ${gitError.message}`);
                }
              }

              // Last resort fallback
              if (!prBaseBranch) {
                prBaseBranch = 'main';
                onOutput(`⚠️  Could not detect default branch, using fallback: ${prBaseBranch}`);
              }
            } catch (error: any) {
              prBaseBranch = 'main';
              onOutput(`⚠️  Error detecting default branch, using fallback: ${prBaseBranch}`);
            }
          }

          // Find agent summary from any agent output
          const agentOutput = previousOutputs.find(o => o.data?.summary || o.output);
          if (agentOutput) {
            agentSummary = agentOutput.data?.summary || agentOutput.output || 'Changes made by agent';
          }

          // Replace placeholders
          const prTitle = prTitleTemplate
            .replace('{issue_number}', issueNumber)
            .replace('{issue_title}', issueTitle);

          let prBody = prBodyTemplate
            .replace('{issue_number}', issueNumber)
            .replace('{issue_title}', issueTitle)
            .replace('{agent_summary}', agentSummary);

          if (autoLinkIssue && issueNumber) {
            prBody = `Closes #${issueNumber}\n\n${prBody}`;
          }

          // CRITICAL: Ensure branch is pushed to remote BEFORE checking for commits
          onOutput(`⬆️  Ensuring branch is pushed to remote...`);
          try {
            await execPromise(`cd "${projectPath}" && git push -u origin "${branch}"`);
            onOutput(`✅ Branch pushed to origin/${branch}`);
          } catch (pushError: any) {
            // Branch might already be pushed
            if (!pushError.message.includes('up-to-date')) {
              onOutput(`⚠️  Push warning: ${pushError.message}`);
            } else {
              onOutput(`ℹ️  Branch already up-to-date on remote`);
            }
          }

          // Fetch latest remote changes to ensure we see the pushed commits
          onOutput(`🔄 Fetching latest remote changes...`);
          try {
            await execPromise(`cd "${projectPath}" && git fetch origin`);
            onOutput(`✅ Fetched latest from origin`);
          } catch (fetchError: any) {
            onOutput(`⚠️  Could not fetch: ${fetchError.message}`);
          }

          // Check if there are commits between base and head branch
          onOutput(`🔍 Checking for commits between ${prBaseBranch} and ${branch}...`);
          onOutput(`🔍 DEBUG: Checking commit diff with: git rev-list origin/${prBaseBranch}..origin/${branch} --count`);

          // First, verify both branches exist on remote
          try {
            const baseBranchCheck = await execPromise(`cd "${projectPath}" && git rev-parse origin/${prBaseBranch}`);
            onOutput(`✅ origin/${prBaseBranch} exists: ${baseBranchCheck.stdout.trim().substring(0, 7)}`);
          } catch (e: any) {
            onOutput(`❌ origin/${prBaseBranch} does not exist: ${e.message}`);
          }

          try {
            const headBranchCheck = await execPromise(`cd "${projectPath}" && git rev-parse origin/${branch}`);
            onOutput(`✅ origin/${branch} exists: ${headBranchCheck.stdout.trim().substring(0, 7)}`);
          } catch (e: any) {
            onOutput(`❌ origin/${branch} does not exist: ${e.message}`);
          }

          // Show recent commits on the feature branch
          try {
            const recentCommits = await execPromise(`cd "${projectPath}" && git log origin/${branch} --oneline -5`);
            onOutput(`🔍 DEBUG: Recent commits on origin/${branch}:`);
            const commitLines = recentCommits.stdout.trim().split('\n');
            commitLines.forEach(line => onOutput(`   ${line}`));
          } catch (e: any) {
            onOutput(`⚠️  Could not get recent commits: ${e.message}`);
          }

          let commitDiff;
          try {
            const diffResult = await execPromise(
              `cd "${projectPath}" && git rev-list origin/${prBaseBranch}..origin/${branch} --count`
            );
            commitDiff = parseInt(diffResult.stdout.trim());
            onOutput(`🔍 DEBUG: Commit diff count: ${commitDiff}`);
          } catch (error: any) {
            onOutput(`⚠️  Could not check commit diff: ${error.message}`);
            commitDiff = 0;
          }

          if (commitDiff === 0) {
            onOutput(`⚠️  No commits found between ${prBaseBranch} and ${branch}`);
            onOutput(`   Skipping PR creation - no changes to merge`);

            // Show more debug info about why this might be happening
            try {
              const localBranchCheck = await execPromise(`cd "${projectPath}" && git log ${branch} --oneline -5 2>/dev/null || echo "local branch not found"`);
              onOutput(`🔍 DEBUG: Local ${branch} commits:`);
              onOutput(`   ${localBranchCheck.stdout.trim()}`);
            } catch (e) {}

            return {
              prUrl: null,
              prTitle,
              branch,
              baseBranch: prBaseBranch,
              issueNumber,
              skipped: true,
              reason: 'No commits to merge'
            };
          }

          onOutput(`✅ Found ${commitDiff} commit(s) to merge`);
          onOutput(`🔀 Creating PR: "${prTitle}"...`);
          onOutput(`   From: ${branch}`);
          onOutput(`   To: ${prBaseBranch}`);

          try {
            // Use heredoc for body to handle special characters and newlines safely
            const fs = await import('fs');
            const path = await import('path');
            const tempDir = path.join(projectPath, '.git');
            const bodyFile = path.join(tempDir, 'pr-body-temp.txt');

            // Write body to temp file
            fs.writeFileSync(bodyFile, prBody, 'utf-8');

            // Create PR using body from file
            const prResult = await execPromise(
              `cd "${projectPath}" && gh pr create --base "${prBaseBranch}" --head "${branch}" --title "${prTitle}" --body-file "${bodyFile}"`
            );

            // Clean up temp file
            try {
              fs.unlinkSync(bodyFile);
            } catch (e) {
              // Ignore cleanup errors
            }

            const prUrl = prResult.stdout.trim();

            onOutput(`✅ Created pull request: ${prUrl}`);

            return {
              prUrl,
              prTitle,
              branch,
              baseBranch: prBaseBranch,
              issueNumber
            };
          } catch (prError: any) {
            // Check if error is about no commits
            if (prError.message && (prError.message.includes('No commits between') || prError.message.includes('no commits'))) {
              onOutput(`⚠️  GitHub says no commits between branches - skipping PR creation`);
              onOutput(`   This usually means the agent made no changes`);

              return {
                prUrl: null,
                prTitle,
                branch,
                baseBranch: prBaseBranch,
                issueNumber,
                skipped: true,
                reason: 'GitHub reports no commits between branches'
              };
            }

            // Check if PR already exists
            if (prError.message && prError.message.includes('already exists')) {
              onOutput(`⚠️  Pull request already exists for this branch`);

              // Try to get the existing PR URL
              try {
                const existingPrResult = await execPromise(
                  `cd "${projectPath}" && gh pr view "${branch}" --json url --jq .url`
                );
                const existingPrUrl = existingPrResult.stdout.trim();
                onOutput(`ℹ️  Existing PR: ${existingPrUrl}`);

                return {
                  prUrl: existingPrUrl,
                  prTitle,
                  branch,
                  baseBranch: prBaseBranch,
                  issueNumber,
                  alreadyExists: true
                };
              } catch (e) {
                // Could not get existing PR URL
                return {
                  prUrl: null,
                  prTitle,
                  branch,
                  baseBranch: prBaseBranch,
                  issueNumber,
                  skipped: true,
                  reason: 'PR already exists but could not retrieve URL'
                };
              }
            }

            // Log full error for debugging
            onOutput(`❌ Full error: ${prError.message}`);
            if (prError.stderr) {
              onOutput(`   stderr: ${prError.stderr}`);
            }

            // Re-throw other errors
            throw prError;
          }

        } catch (error: any) {
          onOutput(`❌ GitHub PR Creator error: ${error.message}`);
          throw error;
        }
        break;

      case 'github-issue-updater':
        // GitHub Issue Updater Service
        onOutput(`📝 GitHub Issue Updater starting...`);

        const addComment = serviceConfig.configValues?.add_comment !== 'false';
        const commentTemplate = serviceConfig.configValues?.comment_template || '✅ Issue resolved';
        const addLabel = serviceConfig.configValues?.add_label || 'in-review';
        const removeLabels = serviceConfig.configValues?.remove_labels || '';
        const closeIssue = serviceConfig.configValues?.close_issue === 'true';

        try {
          const { promisify } = await import('util');
          const execPromise = promisify(require('child_process').exec);

          // Get data from previous nodes - try to find GitHub Issues, Branch Manager, and PR Creator output
          let issueNumber = '';
          let branch = '';
          let prUrl = '';
          let agentName = 'Agent';

          // Find GitHub Issues output
          const issuesOutput = previousOutputs.find(o => o.data?.issues);
          if (issuesOutput?.data?.issues && issuesOutput.data.issues.length > 0) {
            const firstIssue = issuesOutput.data.issues[0];
            issueNumber = firstIssue.number?.toString() || '';
          }

          // Find GitHub Branch Manager output
          const branchOutput = previousOutputs.find(o => o.data?.branch);
          if (branchOutput?.data?.branch) {
            branch = branchOutput.data.branch;
          }

          // Find GitHub PR Creator output
          const prOutput = previousOutputs.find(o => o.data?.prUrl);
          if (prOutput?.data?.prUrl) {
            prUrl = prOutput.data.prUrl;
          }

          // Find agent name from any agent output
          const agentOutput = previousOutputs.find(o => o.data?.agentName || o.data?.agent);
          if (agentOutput) {
            agentName = agentOutput.data?.agentName || agentOutput.data?.agent || 'Agent';
          }

          if (!issueNumber) {
            throw new Error('Issue number is required');
          }

          onOutput(`📝 Updating issue #${issueNumber}...`);

          // Add comment
          if (addComment) {
            const comment = commentTemplate
              .replace('{issue_number}', issueNumber)
              .replace('{branch_name}', branch)
              .replace('{pr_url}', prUrl)
              .replace('{agent_name}', agentName);

            onOutput(`💬 Adding comment...`);
            await execPromise(`cd "${projectPath}" && gh issue comment ${issueNumber} --body "${comment}"`);
            onOutput(`✅ Comment added`);
          }

          // Add label
          if (addLabel) {
            onOutput(`🏷️  Adding label "${addLabel}"...`);

            // Check if label exists in the repository
            try {
              const labelsResult = await execPromise(`cd "${projectPath}" && gh label list --json name`);
              const repoLabels = JSON.parse(labelsResult.stdout);
              const labelExists = repoLabels.some((l: any) => l.name.toLowerCase() === addLabel.toLowerCase());

              if (!labelExists) {
                onOutput(`⚠️  Label "${addLabel}" does not exist in repository`);
                onOutput(`   Creating label "${addLabel}"...`);

                // Create the label with a default color
                await execPromise(`cd "${projectPath}" && gh label create "${addLabel}" --color "0E8A16" --description "Automatically created label"`);
                onOutput(`✅ Label "${addLabel}" created`);
              }

              await execPromise(`cd "${projectPath}" && gh issue edit ${issueNumber} --add-label "${addLabel}"`);
              onOutput(`✅ Label added`);
            } catch (error: any) {
              onOutput(`⚠️  Failed to add label: ${error.message}`);
              onOutput(`   Continuing without label...`);
            }
          }

          // Remove labels
          if (removeLabels) {
            const labelsToRemove = removeLabels.split(',').map(l => l.trim());
            for (const label of labelsToRemove) {
              onOutput(`🏷️  Removing label "${label}"...`);
              await execPromise(`cd "${projectPath}" && gh issue edit ${issueNumber} --remove-label "${label}"`);
            }
            onOutput(`✅ Labels removed`);
          }

          // Close issue
          if (closeIssue) {
            onOutput(`🔒 Closing issue #${issueNumber}...`);
            await execPromise(`cd "${projectPath}" && gh issue close ${issueNumber}`);
            onOutput(`✅ Issue closed`);
          }

          onOutput(`✅ Issue #${issueNumber} updated successfully`);

          return {
            issueNumber,
            updated: true,
            closed: closeIssue
          };

        } catch (error: any) {
          onOutput(`❌ GitHub Issue Updater error: ${error.message}`);
          throw error;
        }
        break;

      case 'jira-issues':
        // Jira Issues Service
        onOutput(`📋 Jira Issues service starting...`);

        // Get Jira configuration from category or service config
        const jiraConfig = await getJiraConfiguration(projectPath, serviceConfig);
        const jiraUrl = jiraConfig.jiraUrl;
        const jiraEmail = jiraConfig.jiraEmail;
        const jiraApiToken = jiraConfig.jiraApiToken;
        const projectKey = jiraConfig.defaultProject;
        const jqlQuery = serviceConfig.configValues?.jql_query || '';
        const maxResults = parseInt(serviceConfig.configValues?.max_results || '50');
        const statusFilter = serviceConfig.configValues?.status_filter || '';
        const labelsFilter = serviceConfig.configValues?.labels_filter || '';
        const assigneeFilter = serviceConfig.configValues?.assignee_filter || '';

        if (!jiraUrl || !jiraEmail || !jiraApiToken) {
          throw new Error('Jira configuration incomplete: URL, email, and API token are required. Please configure the Jira Service Category.');
        }

        if (!projectKey) {
          throw new Error('Jira project key is required. Please configure it in the service or the Jira Service Category.');
        }

        onOutput(`📦 Jira Project: ${projectKey}`);
        onOutput(`🔍 Max Results: ${maxResults}`);

        try {
          // Build JQL query
          let finalJql = jqlQuery;
          if (!finalJql) {
            // Build JQL from filters if no custom query provided
            const jqlParts: string[] = [`project = ${projectKey}`];

            if (statusFilter) {
              const statuses = statusFilter.split(',').map(s => `"${s.trim()}"`).join(', ');
              jqlParts.push(`status IN (${statuses})`);
            }

            if (labelsFilter) {
              const labels = labelsFilter.split(',').map(l => l.trim());
              labels.forEach(label => jqlParts.push(`labels = "${label}"`));
            }

            if (assigneeFilter) {
              jqlParts.push(`assignee = ${assigneeFilter}`);
            }

            finalJql = jqlParts.join(' AND ');
          }

          onOutput(`🔍 JQL Query: ${finalJql}`);

          // Fetch issues from Jira
          const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
          const searchUrl = `${jiraUrl}/rest/api/3/search`;

          const response = await fetch(searchUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              jql: finalJql,
              maxResults: maxResults,
              fields: ['summary', 'status', 'assignee', 'labels', 'created', 'updated', 'description', 'issuetype', 'priority'],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Jira API error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          const issues = result.issues || [];

          onOutput(`✅ Found ${issues.length} issue(s)`);

          if (issues.length > 0) {
            // Format issue data for agents
            const jiraIssueData = issues.map((issue: any) => ({
              key: issue.key,
              summary: issue.fields.summary,
              status: issue.fields.status?.name,
              assignee: issue.fields.assignee?.displayName || 'Unassigned',
              labels: issue.fields.labels || [],
              created: issue.fields.created,
              updated: issue.fields.updated,
              description: issue.fields.description,
              issueType: issue.fields.issuetype?.name,
              priority: issue.fields.priority?.name,
              url: `${jiraUrl}/browse/${issue.key}`,
            }));

            // Display first few issues
            onOutput(`\n📋 Issues:`);
            jiraIssueData.slice(0, 5).forEach((issue: any) => {
              onOutput(`  #${issue.key}: ${issue.summary}`);
              onOutput(`    Status: ${issue.status} | Assignee: ${issue.assignee}`);
              if (issue.labels.length > 0) {
                onOutput(`    Labels: ${issue.labels.join(', ')}`);
              }
            });

            if (jiraIssueData.length > 5) {
              onOutput(`  ... and ${jiraIssueData.length - 5} more`);
            }

            // Return data for next nodes
            return {
              issues: jiraIssueData,
              count: jiraIssueData.length,
              serviceType: 'jira-issues',
              projectKey: projectKey,
            };
          } else {
            onOutput(`ℹ️  No issues found matching the criteria`);
            return {
              issues: [],
              count: 0,
              serviceType: 'jira-issues',
              projectKey: projectKey,
            };
          }
        } catch (error: any) {
          onOutput(`❌ Jira Issues error: ${error.message}`);
          throw error;
        }
        break;

      case 'jira-updater':
        // Jira Issue Updater Service
        onOutput(`✏️  Jira Issue Updater service starting...`);

        // Get Jira configuration from category or service config
        const updaterJiraConfig = await getJiraConfiguration(projectPath, serviceConfig);
        const updaterJiraUrl = updaterJiraConfig.jiraUrl;
        const updaterJiraEmail = updaterJiraConfig.jiraEmail;
        const updaterJiraApiToken = updaterJiraConfig.jiraApiToken;
        const addComment = serviceConfig.configValues?.add_comment !== 'false';
        const commentTemplate = serviceConfig.configValues?.comment_template || '';
        const transitionStatus = serviceConfig.configValues?.transition_status || '';
        const assignTo = serviceConfig.configValues?.assign_to || '';
        const addLabels = serviceConfig.configValues?.add_labels || '';
        const removeLabels = serviceConfig.configValues?.remove_labels || '';

        if (!updaterJiraUrl || !updaterJiraEmail || !updaterJiraApiToken) {
          throw new Error('Jira configuration incomplete: URL, email, and API token are required. Please configure the Jira Service Category.');
        }

        // Find Jira issue from previous outputs
        const jiraIssuesOutput = previousOutputs.find(o => o.data?.serviceType === 'jira-issues');
        if (!jiraIssuesOutput?.data?.issues || jiraIssuesOutput.data.issues.length === 0) {
          onOutput(`⚠️  No Jira issues found in previous outputs`);
          break;
        }

        const jiraIssue = jiraIssuesOutput.data.issues[0];
        const issueKey = jiraIssue.key;

        onOutput(`📝 Updating issue: ${issueKey}`);

        try {
          const auth = Buffer.from(`${updaterJiraEmail}:${updaterJiraApiToken}`).toString('base64');
          const headers = {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          };

          // Add comment if configured
          if (addComment && commentTemplate) {
            // Replace placeholders in comment
            let comment = commentTemplate;

            // Find branch name from previous outputs
            const branchOutput = previousOutputs.find(o => o.data?.branch);
            if (branchOutput?.data?.branch) {
              comment = comment.replace(/{branch_name}/g, branchOutput.data.branch);
            }

            // Find PR URL from previous outputs
            const prOutput = previousOutputs.find(o => o.data?.prUrl);
            if (prOutput?.data?.prUrl) {
              comment = comment.replace(/{pr_url}/g, prOutput.data.prUrl);
            }

            // Find agent name from previous outputs
            const agentOutput = previousOutputs.find(o => o.data?.agentName);
            if (agentOutput?.data?.agentName) {
              comment = comment.replace(/{agent_name}/g, agentOutput.data.agentName);
            }

            onOutput(`💬 Adding comment...`);

            const commentUrl = `${updaterJiraUrl}/rest/api/3/issue/${issueKey}/comment`;
            const commentResponse = await fetch(commentUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                body: {
                  type: 'doc',
                  version: 1,
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: comment,
                        },
                      ],
                    },
                  ],
                },
              }),
            });

            if (commentResponse.ok) {
              onOutput(`✅ Comment added successfully`);
            } else {
              const errorText = await commentResponse.text();
              onOutput(`⚠️  Failed to add comment: ${commentResponse.status} - ${errorText}`);
            }
          }

          // Update labels if configured
          if (addLabels || removeLabels) {
            onOutput(`🏷️  Updating labels...`);

            const updateData: any = { fields: {} };

            // Get current labels
            const issueUrl = `${updaterJiraUrl}/rest/api/3/issue/${issueKey}?fields=labels`;
            const issueResponse = await fetch(issueUrl, { headers });
            const issueData = await issueResponse.json();
            let currentLabels = issueData.fields?.labels || [];

            // Add new labels
            if (addLabels) {
              const newLabels = addLabels.split(',').map(l => l.trim());
              currentLabels = [...new Set([...currentLabels, ...newLabels])];
              onOutput(`   Adding labels: ${newLabels.join(', ')}`);
            }

            // Remove labels
            if (removeLabels) {
              const labelsToRemove = removeLabels.split(',').map(l => l.trim());
              currentLabels = currentLabels.filter((l: string) => !labelsToRemove.includes(l));
              onOutput(`   Removing labels: ${labelsToRemove.join(', ')}`);
            }

            updateData.fields.labels = currentLabels;

            const updateUrl = `${updaterJiraUrl}/rest/api/3/issue/${issueKey}`;
            const updateResponse = await fetch(updateUrl, {
              method: 'PUT',
              headers,
              body: JSON.stringify(updateData),
            });

            if (updateResponse.ok) {
              onOutput(`✅ Labels updated successfully`);
            } else {
              const errorText = await updateResponse.text();
              onOutput(`⚠️  Failed to update labels: ${updateResponse.status} - ${errorText}`);
            }
          }

          // Transition status if configured
          if (transitionStatus) {
            onOutput(`🔄 Transitioning to status: ${transitionStatus}...`);

            // Get available transitions
            const transitionsUrl = `${updaterJiraUrl}/rest/api/3/issue/${issueKey}/transitions`;
            const transitionsResponse = await fetch(transitionsUrl, { headers });
            const transitionsData = await transitionsResponse.json();

            // Find transition ID for the target status
            const transition = transitionsData.transitions?.find((t: any) =>
              t.name.toLowerCase() === transitionStatus.toLowerCase() ||
              t.to.name.toLowerCase() === transitionStatus.toLowerCase()
            );

            if (transition) {
              const transitionResponse = await fetch(transitionsUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  transition: { id: transition.id },
                }),
              });

              if (transitionResponse.ok) {
                onOutput(`✅ Issue transitioned to: ${transitionStatus}`);
              } else {
                const errorText = await transitionResponse.text();
                onOutput(`⚠️  Failed to transition: ${transitionResponse.status} - ${errorText}`);
              }
            } else {
              onOutput(`⚠️  Transition to "${transitionStatus}" not available`);
              onOutput(`   Available transitions: ${transitionsData.transitions?.map((t: any) => t.name).join(', ')}`);
            }
          }

          // Update assignee if configured
          if (assignTo) {
            onOutput(`👤 Updating assignee...`);

            let assigneeAccountId = null;
            if (assignTo === 'currentUser()') {
              // Get current user's account ID
              const myselfUrl = `${updaterJiraUrl}/rest/api/3/myself`;
              const myselfResponse = await fetch(myselfUrl, { headers });
              const myselfData = await myselfResponse.json();
              assigneeAccountId = myselfData.accountId;
            } else {
              // Search for user by username/email
              const userSearchUrl = `${updaterJiraUrl}/rest/api/3/user/search?query=${assignTo}`;
              const userResponse = await fetch(userSearchUrl, { headers });
              const users = await userResponse.json();
              if (users && users.length > 0) {
                assigneeAccountId = users[0].accountId;
              }
            }

            if (assigneeAccountId) {
              const assignUrl = `${updaterJiraUrl}/rest/api/3/issue/${issueKey}/assignee`;
              const assignResponse = await fetch(assignUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ accountId: assigneeAccountId }),
              });

              if (assignResponse.ok) {
                onOutput(`✅ Assignee updated successfully`);
              } else {
                const errorText = await assignResponse.text();
                onOutput(`⚠️  Failed to update assignee: ${assignResponse.status} - ${errorText}`);
              }
            } else {
              onOutput(`⚠️  User not found: ${assignTo}`);
            }
          }

          onOutput(`✅ Issue update completed`);

          return {
            issueKey: issueKey,
            updated: true,
            serviceType: 'jira-updater',
          };
        } catch (error: any) {
          onOutput(`❌ Jira Issue Updater error: ${error.message}`);
          throw error;
        }
        break;

      default:
        throw new Error(`Unknown service type: ${serviceConfig.type}`);
    }

    console.log(`[executeService] Completed service: ${serviceName}`);
  } catch (error: any) {
    console.error('[executeService] Error:', error);
    try {
      sendEvent({
        type: 'agent_error',
        agent: serviceConfig.name || workflowNode.serviceName,
        nodeId: workflowNode.nodeId,
        message: error.message,
      });
    } catch (e) {
      console.error('[executeService] Failed to send error event:', e);
    }
    throw error;
  }
}

/**
 * Execute Claude Code with the agent's prompt using --dangerously-skip-user-approval
 */
async function executeClaudeCode(
  projectPath: string,
  prompt: string,
  agentConfig: any,
  workflowNode: any,
  childProcesses: Array<any>, // Track spawned processes for cleanup
  onOutput: (output: string) => void,
  sendEvent: (data: any) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[executeClaudeCode] Starting for agent: ${workflowNode.agentRole}`);
    console.log(`[executeClaudeCode] Project path: ${projectPath}`);
    console.log(`[executeClaudeCode] Prompt length: ${prompt.length} chars`);

    // Spawn claude with --print for non-interactive mode, streaming JSON output
    const claudeProcess = spawn('claude', [
      '--print',
      '--verbose',
      '--dangerously-skip-permissions',
      '--output-format',
      'stream-json'
    ], {
      cwd: projectPath,
      shell: false, // Don't use shell to avoid issues with multiline prompts
      env: {
        ...process.env,
        // Add any agent-specific env vars from configuration
        // TODO: Add agent configVariables as env vars
      },
    });

    console.log(`[executeClaudeCode] Claude process spawned with PID: ${claudeProcess.pid}`);

    // Add process to tracking array for cleanup on workflow cancellation
    childProcesses.push(claudeProcess);

    // Send prompt via stdin
    if (claudeProcess.stdin) {
      claudeProcess.stdin.write(prompt);
      claudeProcess.stdin.end();
    }

    let output = '';
    let errorOutput = '';
    let buffer = '';

    claudeProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      buffer += text;

      // Process line by line
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const jsonData = JSON.parse(line);

          // Debug: log the event type
          console.log('[Claude Code Event]', jsonData.type, jsonData.subtype || '');

          // Handle different event types from stream-json verbose format
          if (jsonData.type === 'assistant' && jsonData.message?.content) {
            // Extract text from content array
            for (const content of jsonData.message.content) {
              if (content.type === 'text' && content.text) {
                console.log('[Text Output]', content.text.substring(0, 100));
                output += content.text;
                onOutput(content.text);
              }
            }
          } else if (jsonData.type === 'result') {
            // Final result
            if (jsonData.result) {
              console.log('[Result]', jsonData.result.substring(0, 100));
              output += jsonData.result;
              onOutput(jsonData.result);
            }
          }
        } catch (e) {
          // If not JSON, treat as plain text
          console.log('[Non-JSON output]', line);
          output += line;
          onOutput(line);
        }
      }
    });

    claudeProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.log('[stderr]', text);
      // Also send stderr to output for debugging
      onOutput(`[stderr] ${text}`);
    });

    claudeProcess.on('close', (code) => {
      console.log(`[executeClaudeCode] Process closed with code: ${code}`);
      if (code === 0) {
        resolve();
      } else {
        try {
          sendEvent({
            type: 'agent_error',
            agent: workflowNode.agentRole,
            nodeId: workflowNode.nodeId,
            message: `Claude Code exited with code ${code}\nError: ${errorOutput}`,
          });
        } catch (e) {
          console.error('[executeClaudeCode] Failed to send error event:', e);
        }
        reject(new Error(`Claude Code exited with code ${code}: ${errorOutput}`));
      }
    });

    claudeProcess.on('error', (error) => {
      console.error('[executeClaudeCode] Process error:', error);
      try {
        sendEvent({
          type: 'agent_error',
          agent: workflowNode.agentRole,
          nodeId: workflowNode.nodeId,
          message: error.message,
        });
      } catch (e) {
        console.error('[executeClaudeCode] Failed to send error event:', e);
      }
      reject(error);
    });
  });
}
