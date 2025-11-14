'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

type WizardStep = 'create' | 'template';

export default function NewProjectPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>('create');
  const [projectPath, setProjectPath] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleComplete = async () => {
    if (!projectPath || !selectedTemplate) return;

    try {
      setIsSaving(true);

      // Create the project
      const createRes = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          path: projectPath,
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create project');
      }

      // Navigate to workflow editor with template
      const projectId = encodeURIComponent(projectPath);
      const templateId = encodeURIComponent(selectedTemplate.id);
      router.push(`/projects/${projectId}/workflows/new?template=${templateId}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/projects');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
              <p className="text-sm text-gray-600 mt-1">Set up your project and choose a workflow template</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center">
            {/* Step 1 */}
            <div className="flex items-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                currentStep === 'create' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-green-500 text-white'
              }`}>
                {currentStep === 'template' ? '✓' : '1'}
              </div>
              <div className="ml-4">
                <div className="text-sm font-semibold text-gray-900">Project Details</div>
                <div className="text-xs text-gray-500">Name and location</div>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-6 transition-all rounded ${
              currentStep === 'template' ? 'bg-green-500' : 'bg-gray-300'
            }`} />

            {/* Step 2 */}
            <div className="flex items-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                currentStep === 'template' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <div className="ml-4">
                <div className="text-sm font-semibold text-gray-900">Workflow Template</div>
                <div className="text-xs text-gray-500">Select starting point</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Step 1: Create New Project */}
        {currentStep === 'create' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Information</h2>

            <div className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a descriptive name for your project
                </p>
              </div>

              {/* Project Path */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Path *
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="/Users/username/Projects/my-project"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                  <button
                    onClick={handleBrowseFolder}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Browse
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Full path to your project directory
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Getting Started</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      After creating your project, you'll select a workflow template to quickly set up your automation.
                      Templates include pre-configured agents and services that you can customize to fit your needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>

              <button
                onClick={handleNext}
                disabled={!projectPath || !projectName}
                className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  !projectPath || !projectName
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                }`}
              >
                Continue
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Template */}
        {currentStep === 'template' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            {isLoadingTemplates ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Templates...</h3>
                <p className="text-gray-600">Finding available workflow templates</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Workflow Template</h2>
                  <p className="text-gray-600">Select a template to get started with pre-configured workflows</p>
                </div>

                {templates.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Available</h3>
                    <p className="text-gray-600 mb-6">Start with a blank workflow or create your first template</p>
                    <button
                      onClick={() => {
                        setSelectedTemplate({
                          id: 'blank',
                          name: 'Blank Workflow',
                          description: 'Start from scratch',
                          category: 'custom',
                          agents: [],
                          edges: []
                        });
                      }}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Start with Blank Workflow
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`text-left p-6 rounded-xl border-2 transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                            : 'border-gray-200 hover:border-indigo-300 bg-white hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-lg mb-2">{template.name}</div>
                            <div className="text-sm text-gray-600 mb-4">{template.description}</div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{template.agents.length} agents</span>
                              </div>
                              <div className="px-3 py-1 bg-gray-100 rounded-full text-gray-700 font-medium">
                                {template.category}
                              </div>
                            </div>
                          </div>

                          {selectedTemplate?.id === template.id && (
                            <div className="flex-shrink-0 ml-4">
                              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setCurrentStep('create')}
                    className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>

                  <button
                    onClick={handleComplete}
                    disabled={!selectedTemplate || isSaving}
                    className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      !selectedTemplate || isSaving
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Project & Open Workflow
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
