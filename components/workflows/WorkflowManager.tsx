'use client';

import { useState, useEffect } from 'react';
import { SavedWorkflow } from '@/lib/services/workflowManager';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  agents: any[];
  edges: any[];
  variables: any[];
}

interface WorkflowManagerProps {
  projectPath: string;
  currentWorkflow?: { nodes: any[]; edges: any[] };
  customPrompts?: Record<string, string>;
  onLoad: (workflow: SavedWorkflow) => void;
  onSave: () => void;
  onLoadTemplate?: (template: WorkflowTemplate) => void;
}

export default function WorkflowManager({
  projectPath,
  currentWorkflow,
  customPrompts = {},
  onLoad,
  onSave,
  onLoadTemplate
}: WorkflowManagerProps) {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'saved' | 'templates'>('saved');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadTemplates();
  }, [projectPath]);

  const loadWorkflows = async () => {
    try {
      const res = await fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`);
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/workflows/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    if (!currentWorkflow || currentWorkflow.nodes.length === 0) {
      alert('No workflow to save');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          description: workflowDescription,
          projectPath,
          nodes: currentWorkflow.nodes.map(node => {
            // Handle start node
            if (node.id === 'start') {
              return {
                id: 'start',
                agentId: '',
                agentRole: 'start',
                position: node.position,
              };
            }
            // Check if this is a service node
            if (node.data?.serviceId) {
              return {
                id: node.id,
                serviceId: node.data.serviceId,
                serviceName: node.data.serviceName,
                agentId: '', // Empty for service nodes
                agentRole: node.data.serviceName, // Use service name as role
                position: node.position,
              };
            }
            // Agent node
            return {
              id: node.id,
              agentId: node.data?.agent?.id || '',
              agentRole: node.data?.agent?.role || '',
              position: node.position,
            };
          }),
          edges: currentWorkflow.edges,
          customPrompts,
          triggers: [],
          enabled: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Workflow saved successfully!');
        setShowSaveDialog(false);
        setWorkflowName('');
        setWorkflowDescription('');
        loadWorkflows();
        onSave();
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadWorkflow = (workflow: SavedWorkflow) => {
    if (confirm(`Load workflow "${workflow.name}"? This will replace your current workflow.`)) {
      onLoad(workflow);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Workflow deleted');
        loadWorkflows();
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSetDefault = async (workflowId: string, name: string) => {
    try {
      const res = await fetch('/api/workflows/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ "${name}" is now the default workflow`);
        loadWorkflows();
      } else {
        alert(`Failed to set default: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 font-semibold text-sm transition-all ${
              activeTab === 'saved'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Saved ({workflows.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 font-semibold text-sm transition-all ${
              activeTab === 'templates'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Templates ({templates.length})
            </div>
          </button>
        </div>
        {activeTab === 'saved' && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Current
          </button>
        )}
      </div>

      {/* Saved Workflows Tab */}
      {activeTab === 'saved' && (
        <>
          {workflows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p className="font-medium">No saved workflows yet</p>
          <p className="text-sm mt-1">Create a workflow and save it to get started</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {workflow.name}
                    {workflow.isDefault && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full font-semibold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Default
                      </span>
                    )}
                  </div>
                  {workflow.description && (
                    <div className="text-xs text-gray-600 mt-1">{workflow.description}</div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {workflow.nodes.length} agents
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {workflow.edges.length} connections
                    </span>
                    {workflow.lastRun && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last: {new Date(workflow.lastRun).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleLoadWorkflow(workflow)}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-md text-xs hover:from-blue-600 hover:to-cyan-700 font-medium flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Load
                  </button>
                  {!workflow.isDefault && (
                    <button
                      onClick={() => handleSetDefault(workflow.id, workflow.name)}
                      className="p-1.5 hover:bg-yellow-100 rounded-md transition-colors group/default"
                      title="Set as default workflow"
                    >
                      <svg className="w-4 h-4 text-gray-400 group-hover/default:text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                    className="p-1.5 hover:bg-red-100 rounded-md transition-colors group/delete"
                    title="Delete workflow"
                  >
                    <svg className="w-4 h-4 text-gray-400 group-hover/delete:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-3">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <p className="font-medium">No workflow templates available</p>
              <p className="text-sm mt-1">Templates help you get started quickly</p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {template.agents.length} agents
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        {template.variables.length} configuration options
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium capitalize">
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onLoadTemplate?.(template)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Use Template
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl animate-slide-down">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Save Workflow</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-sm mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g., Bug Fix Pipeline"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Description (optional)
                </label>
                <textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveWorkflow}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold disabled:from-gray-300 disabled:to-gray-400 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Workflow
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
