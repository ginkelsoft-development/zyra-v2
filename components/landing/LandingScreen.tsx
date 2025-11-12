'use client';

interface LandingScreenProps {
  onNewProject: () => void;
  onOpenExisting: () => void;
  onQuickStart: () => void;
  onLoadWorkflow: () => void;
}

export default function LandingScreen({
  onNewProject,
  onOpenExisting,
  onQuickStart,
  onLoadWorkflow,
}: LandingScreenProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center z-50">
      <div className="max-w-5xl w-full px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h1 className="text-4xl font-bold text-gray-900">Zyra v2.0</h1>
          </div>
          <p className="text-lg text-gray-600">Orchestrate your AI agent workflows with ease</p>
        </div>

        {/* Main Options Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* New Project + Workflow */}
          <button
            onClick={onNewProject}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">New Project</h3>
              <p className="text-gray-600 mb-4">Start fresh with a codebase project and build a custom workflow from scratch</p>

              <div className="flex items-center text-indigo-600 font-semibold">
                <span>Get Started</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </button>

          {/* Open Existing Project */}
          <button
            onClick={onOpenExisting}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-500 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Open Existing</h3>
              <p className="text-gray-600 mb-4">Continue working on a project with saved workflows ready to run</p>

              <div className="flex items-center text-green-600 font-semibold">
                <span>Browse Projects</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </button>

          {/* Quick Start (Templates) */}
          <button
            onClick={onQuickStart}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-orange-500 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Quick Start</h3>
              <p className="text-gray-600 mb-4">Choose from pre-built templates like Laravel Dev, Bug Fixer, or CI/CD Pipeline</p>

              <div className="flex items-center text-orange-600 font-semibold">
                <span>View Templates</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </button>

          {/* Load Saved Workflow */}
          <button
            onClick={onLoadWorkflow}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-500 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Load Workflow</h3>
              <p className="text-gray-600 mb-4">Open a previously saved workflow and continue where you left off</p>

              <div className="flex items-center text-blue-600 font-semibold">
                <span>My Workflows</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Not sure where to start? Try{' '}
            <button onClick={onQuickStart} className="text-indigo-600 hover:text-indigo-700 font-semibold underline">
              Quick Start
            </button>
            {' '}for ready-made templates
          </p>
        </div>
      </div>
    </div>
  );
}
