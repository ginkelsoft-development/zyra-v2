'use client';

import { useState, useEffect } from 'react';
import AgentManager from '@/components/agents/AgentManager';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/layout/StatCard';
import EmptyState from '@/components/layout/EmptyState';

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string;
  tools: string;
  systemPrompt: string;
  fullPrompt: string;
  color: string;
  emoji: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowAgentManager(true);
  };

  const handleEditAgent = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setShowAgentManager(true);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const res = await fetch(`/api/agents?id=${agentId}`, { method: 'DELETE' });
      if (res.ok) {
        loadAgents();
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleAgentSaved = () => {
    setShowAgentManager(false);
    setEditingAgent(null);
    loadAgents();
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading agents...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="AI Agents"
        description="Manage your AI agents and their configurations"
        action={
          <button
            onClick={handleCreateAgent}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 font-medium flex items-center gap-2 shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Agent
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Agents"
          value={agents.length}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="No agents yet"
            description="Get started by creating your first AI agent"
            action={
              <button
                onClick={handleCreateAgent}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Agent
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${agent.color}20` }}
                    >
                      {agent.emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{agent.role}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditAgent(agent)}
                    className="flex-1 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 font-medium text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Agent Manager Modal */}
      {showAgentManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <AgentManager
              onClose={() => {
                setShowAgentManager(false);
                setEditingAgent(null);
              }}
              onAgentSaved={handleAgentSaved}
              editingAgent={editingAgent}
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
