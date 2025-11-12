'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/layout/StatCard';
import SearchBar from '@/components/layout/SearchBar';
import EmptyState from '@/components/layout/EmptyState';

interface Workflow {
  id: string;
  name: string;
  projectPath: string;
  description?: string;
  nodesCount?: number;
  lastModified?: string;
}

interface Project {
  path: string;
  name: string;
  workflows: Workflow[];
}

export default function WorkflowsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();

      // Load workflows for each project
      const projectsWithWorkflows = await Promise.all(
        (data.projects || []).map(async (project: any) => {
          try {
            const workflowRes = await fetch(`/api/workflows?projectPath=${encodeURIComponent(project.path)}`);
            const workflowData = await workflowRes.json();
            return {
              ...project,
              workflows: workflowData.workflows || []
            };
          } catch (error) {
            return { ...project, workflows: [] };
          }
        })
      );

      setProjects(projectsWithWorkflows);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const allWorkflows = projects.flatMap(project =>
    project.workflows.map(workflow => ({
      ...workflow,
      projectName: project.name
    }))
  );

  const filteredWorkflows = allWorkflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalWorkflows = allWorkflows.length;

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading workflows...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Workflows"
        description="Browse and manage all workflows across your projects"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Workflows"
          value={totalWorkflows}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" />
            </svg>
          }
        />
        <StatCard
          title="Projects"
          value={projects.length}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search workflows..."
        />
      </div>

      {/* Workflows by Project */}
      {filteredWorkflows.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          title="No workflows found"
          description={searchQuery ? 'Try adjusting your search query' : 'Create your first workflow from a project'}
          action={
            <Link
              href="/"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Go to Projects
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {projects.map((project) => {
            const projectWorkflows = filteredWorkflows.filter(w => w.projectName === project.name);
            if (projectWorkflows.length === 0) return null;

            return (
              <div key={project.path} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{project.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{projectWorkflows.length} workflow{projectWorkflows.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectWorkflows.map((workflow) => (
                    <Link
                      key={workflow.id}
                      href={`/projects/${encodeURIComponent(workflow.projectPath)}/workflows/${workflow.id}`}
                      className="block bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-transparent hover:border-indigo-500 dark:hover:border-indigo-400 group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {workflow.name}
                        </h3>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      {workflow.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {workflow.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {workflow.nodesCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                            </svg>
                            {workflow.nodesCount} nodes
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
