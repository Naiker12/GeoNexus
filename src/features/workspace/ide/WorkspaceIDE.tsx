import * as React from 'react';
import { Explorer } from './Explorer';
import { CodeEditor } from './CodeEditor';
import { ArtifactsPanel } from './ArtifactsPanel';
import { ReasoningTimeline } from './ReasoningTimeline';

import { FilesystemTimeline } from './FilesystemTimeline';
import { useReasoningTimeline } from './useReasoningTimeline';
import { useFilesystemTimeline } from '@/hooks/useFilesystemTimeline';
import { useConversation } from '@/components/chat/hooks/useConversation';
import { type FileNode, type Artifact, type WorkspaceState } from './ide-types';
import { Layout, Code, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



export function WorkspaceIDE() {
  const [state, setState] = React.useState<WorkspaceState>({
    selectedFile: null,
    fileTree: [],
    artifacts: [],
  });

  const { conversationId } = useConversation();
  const { steps } = useReasoningTimeline(conversationId || "");
  const { entries: fsEntries, clearEntries: clearFsEntries } = useFilesystemTimeline();
  const [showFsTimeline, setShowFsTimeline] = React.useState(false);
  const [activeSidebar, setActiveSidebar] = React.useState<'chat' | 'artifacts'>('chat');

  const handleSelectFile = (file: FileNode) => {
    setState(prev => ({
      ...prev,
      selectedFile: file,
    }));
  };

  const handleViewArtifact = (artifact: Artifact) => {
    // Encontrar el archivo en el árbol y seleccionarlo
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === artifact.path) return node;
        if (node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const file = findFile(state.fileTree);
    if (file) {
      handleSelectFile(file);
    }
  };



  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Layout className="size-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Workspace IDE</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFsTimeline(!showFsTimeline)}
            className="relative"
          >
            <Activity className="size-4 mr-1" />
            {showFsTimeline ? 'Ocultar FS' : 'FS Activity'}
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden relative">
        <FilesystemTimeline
          entries={fsEntries}
          open={showFsTimeline}
          onOpenChange={setShowFsTimeline}
          onClear={clearFsEntries}
        />
        {/* Left: Explorer + Timeline */}
        <div className="flex flex-col w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
          <ReasoningTimeline steps={steps} />
          {/* Explorer */}
          <div className="flex flex-col flex-1">
            <Explorer
              fileTree={state.fileTree}
              selectedFile={state.selectedFile}
              onSelectFile={handleSelectFile}
            />
          </div>
        </div>

        {/* Center - Code */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              file={state.selectedFile}
              theme="dark"
            />
          </div>
        </div>

        {/* Right Sidebar - Artifacts/Chat */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveSidebar('chat')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                activeSidebar === 'chat'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveSidebar('artifacts')}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                activeSidebar === 'artifacts'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Artifacts
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {activeSidebar === 'artifacts' ? (
              <ArtifactsPanel
                artifacts={state.artifacts}
                onViewArtifact={handleViewArtifact}
              />
            ) : (
              <div className="p-4 flex flex-col h-full">
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <input
                    type="text"
                    placeholder="Describe la app que quieres crear..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
