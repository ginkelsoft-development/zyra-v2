'use client';

import { useState } from 'react';
import { SavedWorkflow } from '@/lib/services/workflowManager';

interface ProjectWithWorkflows {
  name: string;
  path: string;
  type: string;
  workflows: SavedWorkflow[];
}

interface ProjectBrowserProps {
  onClose: () => void;
  onOpenProject: (projectPath: string, workflow?: SavedWorkflow) => void;
  projects: ProjectWithWorkflows[];
}

export default function ProjectBrowser({ onClose, onOpenProject, projects }: ProjectBrowserProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectWithWorkflows | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<SavedWorkflow | null>(null);

  const handleProjectClick = (project: ProjectWithWorkflows) => {
    setSelectedProject(project);
    setSelectedWorkflow(null);
  };

  const handleWorkflowSelect = (workflow: SavedWorkflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleOpen = () => {
    if (selectedProject) {
      onOpenProject(selectedProject.path, selectedWorkflow || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Open Existing Project</h2>
            <p className="text-sm text-gray-600 mt-1">Select a project and workflow to continue working</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-600">Create a new project to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const isSelected = selectedProject?.path === project.path;

                return (
                  <div
                    key={project.path}
                    className={`border-2 rounded-xl transition-all ${
                      isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Project Header */}
                    <button
                      onClick={() => handleProjectClick(project)}
                      className="w-full p-4 text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-green-500' : 'bg-gray-100'
                        }`}>
                          <svg className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500">{project.path}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{project.type}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600 font-medium">
                              {project.workflows.length} workflow{project.workflows.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Workflows List (shown when project is selected) */}
                    {isSelected && project.workflows.length > 0 && (
                      <div className="px-4 pb-4 border-t border-green-200">
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Choose a workflow:</h4>
                          <div className="space-y-2">
                            {project.workflows.map((workflow) => {
                              const isWorkflowSelected = selectedWorkflow?.name === workflow.name;
                              // Count nodes that have an agentId or serviceId and are not the "start" node
                              const agentCount = workflow.nodes?.filter(n => (n.agentId || n.serviceId) && n.id !== 'start').length || 0;
                              const edgeCount = workflow.edges?.length || 0;

                              return (
                                <button
                                  key={workflow.name}
                                  onClick={() => handleWorkflowSelect(workflow)}
                                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    isWorkflowSelected
                                      ? 'border-green-500 bg-white shadow-md'
                                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{workflow.name}</div>

                                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                        <div className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                          </svg>
                                          <span>{edgeCount} connection{edgeCount !== 1 ? 's' : ''}</span>
                                        </div>
                                        {workflow.customPrompts && Object.keys(workflow.customPrompts).length > 0 && (
                                          <div className="flex items-center gap-1 text-amber-600">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                            <span>{Object.keys(workflow.customPrompts).length} custom prompt{Object.keys(workflow.customPrompts).length !== 1 ? 's' : ''}</span>
                                          </div>
                                        )}
                                      </div>

                                      {workflow.lastModified && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          Last modified: {new Date(workflow.lastModified).toLocaleString('nl-NL')}
                                        </div>
                                      )}
                                    </div>

                                    {isWorkflowSelected && (
                                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No workflows message */}
                    {isSelected && project.workflows.length === 0 && (
                      <div className="px-4 pb-4 border-t border-green-200">
                        <div className="mt-4 text-center py-6 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">No saved workflows yet</p>
                          <p className="text-xs text-gray-500 mt-1">You can create a new workflow for this project</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleOpen}
            disabled={!selectedProject}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              !selectedProject
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {selectedWorkflow ? 'Open Workflow' : 'Open Project'}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
