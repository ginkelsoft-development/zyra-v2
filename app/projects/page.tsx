'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectOverview from '@/components/overview/ProjectOverview';
import { SavedWorkflow } from '@/lib/services/workflowManager';

interface ProjectWithWorkflows {
  name: string;
  path: string;
  type: string;
  workflows: SavedWorkflow[];
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithWorkflows[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();

      // Load workflows for each project
      const projectsWithWorkflows: ProjectWithWorkflows[] = [];
      for (const project of data.projects) {
        try {
          const workflowRes = await fetch(`/api/workflows?projectPath=${encodeURIComponent(project.path)}`);
          const workflowData = await workflowRes.json();

          projectsWithWorkflows.push({
            name: project.name,
            path: project.path,
            type: project.type || 'Unknown',
            workflows: workflowData.workflows || []
          });
        } catch (error) {
          console.error(`Failed to load workflows for ${project.name}:`, error);
          projectsWithWorkflows.push({
            name: project.name,
            path: project.path,
            type: project.type || 'Unknown',
            workflows: []
          });
        }
      }

      setProjects(projectsWithWorkflows);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setLoading(false);
    }
  };

  const handleNewProject = () => {
    router.push('/projects/new');
  };

  const handleOpenWorkflow = (projectPath: string, workflow?: SavedWorkflow) => {
    // Encode the project path as a URL-safe ID
    const projectId = encodeURIComponent(projectPath);

    if (workflow) {
      // Open existing workflow
      const workflowId = encodeURIComponent(workflow.name);
      router.push(`/projects/${projectId}/workflows/${workflowId}`);
    } else {
      // Create new workflow
      router.push(`/projects/${projectId}/workflows/new`);
    }
  };

  const handleDeleteProject = async (projectPath: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      if (res.ok) {
        // Reload projects after deletion
        loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleEditProject = async (projectPath: string, newName: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, newName })
      });

      if (res.ok) {
        // Reload projects after update
        loadProjects();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to update project'}`);
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectOverview
      projects={projects}
      onNewProject={handleNewProject}
      onOpenWorkflow={handleOpenWorkflow}
      onDeleteProject={handleDeleteProject}
      onEditProject={handleEditProject}
    />
  );
}
