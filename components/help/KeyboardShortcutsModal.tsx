'use client';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      category: 'Workflow Management',
      items: [
        { keys: `${modKey} + S`, description: 'Quick save workflow' },
        { keys: `${modKey} + Shift + S`, description: 'Save workflow as (with name prompt)' },
        { keys: `${modKey} + E`, description: 'Execute workflow' },
        { keys: `${modKey} + K`, description: 'Clear workflow' },
      ],
    },
    {
      category: 'Node Operations',
      items: [
        { keys: `${modKey} + A`, description: 'Select all nodes' },
        { keys: `${modKey} + D`, description: 'Duplicate selected nodes' },
        { keys: 'Delete / Backspace', description: 'Delete selected nodes/edges' },
        { keys: 'Escape', description: 'Deselect all' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { keys: 'Mouse Drag', description: 'Pan canvas' },
        { keys: 'Mouse Wheel', description: 'Zoom in/out' },
        { keys: 'Click + Drag', description: 'Move node' },
        { keys: 'Shift + Click', description: 'Multi-select' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-900/20 to-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-400">Speed up your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
          <div className="space-y-6">
            {shortcuts.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-gray-300">{item.description}</span>
                      <kbd className="px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 rounded-lg shadow-sm">
                        {item.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-300">Pro Tip</p>
                <p className="text-sm text-gray-400 mt-1">
                  Most shortcuts won't work when typing in input fields. This prevents accidental actions while editing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-2 py-0.5 text-xs font-semibold bg-gray-700 border border-gray-600 rounded">?</kbd> to toggle this help
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
