'use client';

import { useState, useEffect } from 'react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  agents: Array<{
    agentId: string;
    role: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
}

interface ProjectWizardProps {
  onClose: () => void;
  onComplete: (projectPath: string, template: WorkflowTemplate) => void;
  availableProjects: Array<{ name: string; path: string; type: string }>;
}

type WizardStep = 'create' | 'template';

export default function ProjectWizard({ onClose, onComplete, availableProjects }: ProjectWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('create');
  const [projectPath, setProjectPath] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const handleBrowseFolder = async () => {
    try {
      // @ts-ignore - showDirectoryPicker is not in TypeScript types yet
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        setProjectPath(dirHandle.name);
        if (!projectName) {
          setProjectName(dirHandle.name);
        }
      } else {
        alert('Folder selection not supported in this browser. Please enter the path manually.');
      }
    } catch (err) {
      console.log('User cancelled folder selection');
    }
  };

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
  };

  const handleNext = async () => {
    if (currentStep === 'create' && projectPath && projectName) {
      // Move to template selection step
      setCurrentStep('template');
      setIsLoadingTemplates(true);

      try {
        const res = await fetch('/api/workflows/templates');
        const data = await res.json();

        if (data.templates) {
          setTemplates(data.templates);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
  };

  const handleComplete = () => {
    if (projectPath && selectedTemplate) {
      onComplete(projectPath, selectedTemplate);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">New Project Workflow</h2>
            <p className="text-sm text-gray-600 mt-1">Create new project and choose workflow template</p>
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

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center max-w-xl mx-auto">
            {/* Step 1 */}
            <div className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                currentStep === 'create' ? 'bg-indigo-600 text-white' : 'bg-green-500 text-white'
              }`}>
                {currentStep === 'template' ? '✓' : '1'}
              </div>
              <div className="ml-3">
                <div className="text-sm font-semibold text-gray-900">Create Project</div>
                <div className="text-xs text-gray-500">Set up your project</div>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-4 transition-all ${
              currentStep === 'template' ? 'bg-green-500' : 'bg-gray-300'
            }`} />

            {/* Step 2 */}
            <div className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                currentStep === 'template' ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <div className="ml-3">
                <div className="text-sm font-semibold text-gray-900">Choose Template</div>
                <div className="text-xs text-gray-500">Select workflow</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Create New Project */}
          {currentStep === 'create' && (
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Project</h3>

              <div className="space-y-6">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Project Path */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Path
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={projectPath}
                      onChange={(e) => setProjectPath(e.target.value)}
                      placeholder="/path/to/your/project"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleBrowseFolder}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Browse
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the full path to your project directory
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">New Project Setup</h4>
                      <p className="text-sm text-blue-700">
                        This will create a new workflow for your project. In the next step, you'll choose a workflow template to get started quickly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Template */}
          {currentStep === 'template' && (
            <div>
              {isLoadingTemplates ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Templates...</h3>
                  <p className="text-gray-600">Finding available workflow templates</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose a Workflow Template</h3>

                  {templates.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Available</h3>
                      <p className="text-gray-600">Create your first workflow template to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${
                            selectedTemplate?.id === template.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">{template.name}</div>
                              <div className="text-sm text-gray-600 mb-3">{template.description}</div>

                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span>{template.agents.length} agents</span>
                                </div>
                                <div className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                                  {template.category}
                                </div>
                              </div>
                            </div>

                            {selectedTemplate?.id === template.id && (
                              <svg className="w-6 h-6 text-indigo-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
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

          <div className="flex items-center gap-3">
            {currentStep === 'template' && (
              <button
                onClick={() => setCurrentStep('create')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Back
              </button>
            )}

            {currentStep === 'template' ? (
              <button
                onClick={handleComplete}
                disabled={!selectedTemplate}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  !selectedTemplate
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                Open in Canvas
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!projectPath || !projectName}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  !projectPath || !projectName
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
