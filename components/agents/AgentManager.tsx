'use client';

import React, { useState, useEffect } from 'react';
import { AgentConfig, AgentTemplate, AgentCategory } from '@/lib/services/agentManager';
import AgentIcon from '@/components/AgentIcon';

interface AgentManagerProps {
  onAgentCreated?: () => void;
  onClose?: () => void;
  onAgentSaved?: () => void;
  editingAgent?: AgentConfig | null;
}

// Category metadata
const CATEGORY_INFO: Record<AgentCategory, { label: string; icon: JSX.Element; color: string }> = {
  management: {
    label: 'Management',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: '#3B82F6'
  },
  development: {
    label: 'Development',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    color: '#8B5CF6'
  },
  quality: {
    label: 'Quality & Testing',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: '#EC4899'
  },
  security: {
    label: 'Security',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    color: '#F59E0B'
  },
  deployment: {
    label: 'Deployment',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: '#059669'
  },
  notifications: {
    label: 'Notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    color: '#6366F1'
  },
  'domain-experts': {
    label: 'Domain Experts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: '#0891B2'
  },
};

export default function AgentManager({ onAgentCreated, onClose: onCloseProp, onAgentSaved, editingAgent: editingAgentProp }: AgentManagerProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'template'>('list');
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    emoji: '🤖',
    color: '#3B82F6',
    description: '',
    capabilities: '',
    tools: '',
    model: 'sonnet' as 'sonnet' | 'opus' | 'haiku',
    category: 'custom' as AgentCategory | 'custom',
    systemPrompt: '',
    fullPrompt: '',
  });

  // Template form
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

  // AI generation state
  const [isGeneratingSystemPrompt, setIsGeneratingSystemPrompt] = useState(false);
  const [isGeneratingFullPrompt, setIsGeneratingFullPrompt] = useState(false);

  useEffect(() => {
    loadAgents();
    loadTemplates();
  }, []);

  // Load editing agent data when provided
  useEffect(() => {
    if (editingAgentProp) {
      setSelectedAgent(editingAgentProp);
      setFormData({
        name: editingAgentProp.name,
        role: editingAgentProp.role,
        emoji: editingAgentProp.emoji,
        color: editingAgentProp.color,
        description: editingAgentProp.description,
        capabilities: editingAgentProp.capabilities.join(', '),
        tools: editingAgentProp.tools.join(', '),
        model: editingAgentProp.model,
        category: editingAgentProp.category as AgentCategory | 'custom',
        systemPrompt: editingAgentProp.systemPrompt,
        fullPrompt: editingAgentProp.fullPrompt || editingAgentProp.systemPrompt,
      });
      setIsEditing(true);
    } else if (editingAgentProp === null) {
      // Only reset if explicitly set to null (not on initial undefined)
      setIsEditing(false);
      setSelectedAgent(null);
    }
  }, [editingAgentProp]);

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      setError('Failed to load agents');
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/agents/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError('Failed to load templates');
    }
  };

  const onClose = () => {
    if (onCloseProp) {
      onCloseProp();
    }
    setActiveTab('list');
    setIsEditing(false);
    setSelectedAgent(null);
    resetForm();
  };

  const handleCreateAgent = async () => {
    setError(null);

    if (!formData.name || !formData.role) {
      setError('Name and role are required');
      return;
    }

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          emoji: formData.emoji,
          color: formData.color,
          description: formData.description,
          capabilities: formData.capabilities.split(',').map(c => c.trim()).filter(Boolean),
          tools: formData.tools.split(',').map(t => t.trim()).filter(Boolean),
          model: formData.model,
          category: formData.category,
          systemPrompt: formData.systemPrompt,
          fullPrompt: formData.fullPrompt,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      alert('✅ Agent created successfully!');
      resetForm();
      setActiveTab('list');
      loadAgents();
      onAgentCreated?.();
      onAgentSaved?.();
    } catch (err: any) {
      setError('Failed to create agent: ' + err.message);
    }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;

    setError(null);

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          emoji: formData.emoji,
          color: formData.color,
          description: formData.description,
          capabilities: formData.capabilities.split(',').map(c => c.trim()).filter(Boolean),
          tools: formData.tools.split(',').map(t => t.trim()).filter(Boolean),
          model: formData.model,
          category: formData.category,
          systemPrompt: formData.systemPrompt,
          fullPrompt: formData.fullPrompt,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      alert('✅ Agent updated successfully!');
      setIsEditing(false);
      setSelectedAgent(null);
      resetForm();
      loadAgents();
      onAgentCreated?.();
      onAgentSaved?.();
    } catch (err: any) {
      setError('Failed to update agent: ' + err.message);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      alert('✅ Agent deleted successfully!');
      loadAgents();
      onAgentCreated?.();
    } catch (err: any) {
      setError('Failed to delete agent: ' + err.message);
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !formData.name) {
      setError('Please select a template and provide a name');
      return;
    }

    setError(null);

    try {
      const res = await fetch('/api/agents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: selectedTemplate,
          name: formData.name,
          variables: templateVars,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      alert('✅ Agent created from template successfully!');
      resetForm();
      setSelectedTemplate('');
      setTemplateVars({});
      setActiveTab('list');
      loadAgents();
      onAgentCreated?.();
    } catch (err: any) {
      setError('Failed to create agent from template: ' + err.message);
    }
  };

  const startEdit = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      role: agent.role,
      emoji: agent.emoji,
      color: agent.color,
      description: agent.description,
      capabilities: agent.capabilities.join(', '),
      tools: agent.tools.join(', '),
      model: agent.model,
      category: agent.category as AgentCategory | 'custom',
      systemPrompt: agent.systemPrompt,
      fullPrompt: agent.fullPrompt || agent.systemPrompt,
    });
    setIsEditing(true);
    setActiveTab('create');
  };

  const cloneAgent = (agent: AgentConfig) => {
    setFormData({
      name: agent.name + ' (Copy)',
      role: agent.role,
      emoji: agent.emoji,
      color: agent.color,
      description: agent.description,
      capabilities: agent.capabilities.join(', '),
      tools: agent.tools.join(', '),
      model: agent.model,
      category: agent.category as AgentCategory | 'custom',
      systemPrompt: agent.systemPrompt,
      fullPrompt: agent.fullPrompt || agent.systemPrompt,
    });
    setSelectedAgent(null);
    setIsEditing(false);
    setActiveTab('create');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      emoji: '🤖',
      color: '#3B82F6',
      description: '',
      capabilities: '',
      tools: '',
      model: 'sonnet',
      category: 'custom',
      systemPrompt: '',
      fullPrompt: '',
    });
    setSelectedAgent(null);
    setIsEditing(false);
  };

  const handleGeneratePrompt = async (promptType: 'system' | 'full') => {
    if (!formData.name || !formData.role) {
      setError('Please provide at least a name and role before generating a prompt');
      return;
    }

    const isGenerating = promptType === 'system' ? setIsGeneratingSystemPrompt : setIsGeneratingFullPrompt;
    isGenerating(true);
    setError(null);

    try {
      const existingPrompt = promptType === 'system' ? formData.systemPrompt : formData.fullPrompt;

      const res = await fetch('/api/agents/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: formData.name,
          agentRole: formData.role,
          agentDescription: formData.description,
          capabilities: formData.capabilities,
          tools: formData.tools,
          promptType,
          existingPrompt,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (promptType === 'system') {
        setFormData({ ...formData, systemPrompt: data.prompt });
      } else {
        setFormData({ ...formData, fullPrompt: data.prompt });
      }
    } catch (err: any) {
      setError('Failed to generate prompt: ' + err.message);
    } finally {
      isGenerating(false);
    }
  };

  const customAgents = agents.filter(a => a.isCustom);
  const defaultAgents = agents.filter(a => !a.isCustom);

  // Filter agents by category
  const filteredAgents = selectedCategory === 'all'
    ? defaultAgents
    : defaultAgents.filter(a => a.category === selectedCategory);

  // Group agents by category
  const agentsByCategory = defaultAgents.reduce((acc, agent) => {
    const category = agent.category || 'development';
    if (!acc[category]) acc[category] = [];
    acc[category].push(agent);
    return acc;
  }, {} as Record<AgentCategory, AgentConfig[]>);

  return (
    <div>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Edit Agent' : 'Create New Agent'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Agent Form - Direct without tabs */}
      {false && (
        <div className="space-y-6">
          {/* Custom Agents */}
          {customAgents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h3 className="font-semibold text-lg">Custom Agents</h3>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{customAgents.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {customAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 border-2 border-green-300 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-400 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{agent.emoji}</span>
                        <div>
                          <div className="font-bold text-sm">{agent.name}</div>
                          <div className="text-xs text-gray-600">{agent.role}</div>
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            {agent.model}
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-8 h-8 rounded-lg shadow-sm"
                        style={{ backgroundColor: agent.color }}
                      />
                    </div>
                    <p className="text-xs text-gray-700 mb-2 line-clamp-2">{agent.description}</p>

                    {agent.configVariables && agent.configVariables.length > 0 && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs flex items-center gap-1">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{agent.configVariables.length} settings</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => startEdit(agent)}
                        className="px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => cloneAgent(agent)}
                        className="px-2 py-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Clone
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="px-2 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 font-medium flex items-center justify-center transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Filters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="font-semibold text-lg">Built-in Agents by Category</h3>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">{defaultAgents.length}</span>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({defaultAgents.length})
              </button>
              {Object.entries(CATEGORY_INFO).map(([cat, info]) => {
                const count = agentsByCategory[cat as AgentCategory]?.length || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as AgentCategory)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      selectedCategory === cat
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={selectedCategory === cat ? { background: info.color } : {}}
                  >
                    {React.cloneElement(info.icon as React.ReactElement, { className: 'w-3 h-3' })}
                    {info.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredAgents.map((agent) => {
                const categoryInfo = CATEGORY_INFO[agent.category || 'development'];
                return (
                  <div
                    key={agent.id}
                    className="p-3 border rounded-lg bg-white hover:border-indigo-300 hover:shadow-md transition-all group"
                    style={{ borderColor: `${categoryInfo.color}40` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${agent.color}20` }}
                        >
                          <AgentIcon role={agent.role} className="w-5 h-5" color={agent.color} />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{agent.name}</div>
                          <div className="text-xs text-gray-600">{agent.role}</div>
                          <div className="flex items-center gap-1 text-xs mt-1" style={{ color: categoryInfo.color }}>
                            {React.cloneElement(categoryInfo.icon as React.ReactElement, { className: 'w-3 h-3' })}
                            <span className="font-medium">{categoryInfo.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mb-2 line-clamp-2">{agent.description}</p>

                    {agent.configVariables && agent.configVariables.length > 0 && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs flex items-center gap-1">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{agent.configVariables.length} settings</span>
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => cloneAgent(agent)}
                        className="flex-1 px-2 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded text-xs hover:from-blue-600 hover:to-cyan-700 font-medium flex items-center justify-center gap-1 transition-all shadow-sm"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Clone
                      </button>
                      <button
                        onClick={() => {
                          alert(`Agent: ${agent.name}\n\nModel: ${agent.model}\n\nSystem Prompt:\n${agent.systemPrompt}\n\nFull Prompt:\n${agent.fullPrompt || 'Not set'}`);
                        }}
                        className="flex-1 px-2 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Agent Form */}
      <div className="animate-fade-in">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Agent Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Bug Fixer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Emoji</label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="🤖"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-[42px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Model</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sonnet">Sonnet</option>
                  <option value="opus">Opus</option>
                  <option value="haiku">Haiku</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="custom">Custom</option>
                  <option value="management">Management</option>
                  <option value="development">Development</option>
                  <option value="quality">Quality</option>
                  <option value="security">Security</option>
                  <option value="deployment">Deployment</option>
                  <option value="notifications">Notifications</option>
                  <option value="domain-experts">Domain Experts</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this agent do?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Capabilities (comma-separated)
              </label>
              <input
                type="text"
                value={formData.capabilities}
                onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                placeholder="e.g., bug fixing, code review, testing"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tools (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tools}
                onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
                placeholder="e.g., debugger, linter, test runner"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  System Prompt
                </label>
                <button
                  onClick={() => handleGeneratePrompt('system')}
                  disabled={isGeneratingSystemPrompt || !formData.name || !formData.role}
                  className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded text-xs hover:from-purple-600 hover:to-indigo-700 font-medium flex items-center gap-1.5 transition-all shadow-sm disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
                >
                  <svg className={`w-3 h-3 ${isGeneratingSystemPrompt ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isGeneratingSystemPrompt ? 'Generating...' : (formData.systemPrompt ? 'Regenerate with AI' : 'Generate with AI')}
                </button>
              </div>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Base instructions for the agent..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Full Prompt (optional)
                </label>
                <button
                  onClick={() => handleGeneratePrompt('full')}
                  disabled={isGeneratingFullPrompt || !formData.name || !formData.role}
                  className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded text-xs hover:from-purple-600 hover:to-indigo-700 font-medium flex items-center gap-1.5 transition-all shadow-sm disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
                >
                  <svg className={`w-3 h-3 ${isGeneratingFullPrompt ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isGeneratingFullPrompt ? 'Generating...' : (formData.fullPrompt ? 'Regenerate with AI' : 'Generate with AI')}
                </button>
              </div>
              <textarea
                value={formData.fullPrompt}
                onChange={(e) => setFormData({ ...formData, fullPrompt: e.target.value })}
                placeholder="Complete prompt with context and instructions..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={isEditing ? handleUpdateAgent : handleCreateAgent}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEditing ? 'Update Agent' : 'Create Agent'}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create from Template */}
      {activeTab === 'template' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              Create from Template
            </h3>
            <button
              onClick={() => {
                resetForm();
                setActiveTab('list');
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Template <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a template</option>
                {templates.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Agent Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Agent name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {templates.find((t) => t.name === selectedTemplate)?.variables.map((v) => (
                  <div key={v.name}>
                    <label className="block text-sm font-semibold mb-1.5">
                      {v.label} {v.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={templateVars[v.name] || ''}
                      onChange={(e) =>
                        setTemplateVars({ ...templateVars, [v.name]: e.target.value })
                      }
                      placeholder={v.placeholder || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {v.description && (
                      <p className="text-xs text-gray-600 mt-1">{v.description}</p>
                    )}
                  </div>
                ))}
              </>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleCreateFromTemplate}
                disabled={!selectedTemplate || !formData.name}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold disabled:from-gray-300 disabled:to-gray-400 flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create from Template
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setSelectedTemplate('');
                  setTemplateVars({});
                  setActiveTab('list');
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
