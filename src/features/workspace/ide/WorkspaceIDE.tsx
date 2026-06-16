import * as React from 'react';
import { Explorer } from './Explorer';
import { CodeEditor } from './CodeEditor';
import { PreviewPanel } from './PreviewPanel';
import { ArtifactsPanel } from './ArtifactsPanel';
import { ReasoningTimeline, exampleSteps, exampleStats } from './ReasoningTimeline';
import { ThinkingPanel, DEFAULT_TASKS } from './ThinkingPanel';
import { useReasoningTimeline } from './useReasoningTimeline';
import { type FileNode, type Artifact, type WorkspaceState } from './ide-types';
import { Layout, Eye, Code, Play, RotateCcw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { codingAgentStartGeneration } from '@/api/telegram';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Datos de ejemplo
const sampleFileTree: FileNode[] = [
  {
    name: 'mi-proyecto',
    path: '/mi-proyecto',
    type: 'directory',
    status: 'done',
    children: [
      {
        name: 'src',
        path: '/mi-proyecto/src',
        type: 'directory',
        status: 'done',
        children: [
          {
            name: 'components',
            path: '/mi-proyecto/src/components',
            type: 'directory',
            status: 'done',
            children: [
              {
                name: 'Login.tsx',
                path: '/mi-proyecto/src/components/Login.tsx',
                type: 'file',
                status: 'done',
                language: 'tsx',
                lineCount: 47,
                content: `import React, { useState } from 'react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login:', { email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center">Iniciar Sesión</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}`
              },
              {
                name: 'Dashboard.tsx',
                path: '/mi-proyecto/src/components/Dashboard.tsx',
                type: 'file',
                status: 'generating',
                language: 'tsx',
                lineCount: 0,
                content: ''
              }
            ]
          },
          {
            name: 'pages',
            path: '/mi-proyecto/src/pages',
            type: 'directory',
            status: 'done',
            children: [
              {
                name: 'Home.tsx',
                path: '/mi-proyecto/src/pages/Home.tsx',
                type: 'file',
                status: 'done',
                language: 'tsx',
                lineCount: 32,
                content: `import React from 'react';
import { Login } from '../components/Login';

export function Home() {
  return (
    <div>
      <h1>GeoNexus Project</h1>
      <Login />
    </div>
  );
}`
              }
            ]
          },
          {
            name: 'App.tsx',
            path: '/mi-proyecto/src/App.tsx',
            type: 'file',
            status: 'done',
            language: 'tsx',
            lineCount: 18,
            content: `import React from 'react';
import { Home } from './pages/Home';

export default function App() {
  return (
    <div className="App">
      <Home />
    </div>
  );
}`
          },
          {
            name: 'main.tsx',
            path: '/mi-proyecto/src/main.tsx',
            type: 'file',
            status: 'done',
            language: 'tsx',
            lineCount: 12,
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
          }
        ]
      },
      {
        name: 'package.json',
        path: '/mi-proyecto/package.json',
        type: 'file',
        status: 'done',
        language: 'json',
        lineCount: 25,
        content: `{
  "name": "mi-proyecto",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`
      },
      {
        name: 'tailwind.config.ts',
        path: '/mi-proyecto/tailwind.config.ts',
        type: 'file',
        status: 'done',
        language: 'typescript',
        lineCount: 15,
        content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
      }
    ]
  }
];

const sampleArtifacts: Artifact[] = [
  {
    id: '1',
    name: 'Login.tsx',
    path: '/mi-proyecto/src/components/Login.tsx',
    type: 'component',
    description: 'Componente React de login',
    lineCount: 47,
    status: 'done'
  },
  {
    id: '2',
    name: 'Dashboard.tsx',
    path: '/mi-proyecto/src/components/Dashboard.tsx',
    type: 'component',
    description: 'Panel de dashboard principal',
    lineCount: 0,
    status: 'generating'
  },
  {
    id: '3',
    name: 'Home.tsx',
    path: '/mi-proyecto/src/pages/Home.tsx',
    type: 'page',
    description: 'Página de inicio',
    lineCount: 32,
    status: 'done'
  },
  {
    id: '4',
    name: 'tailwind.config.ts',
    path: '/mi-proyecto/tailwind.config.ts',
    type: 'config',
    description: 'Configuración de Tailwind CSS',
    lineCount: 15,
    status: 'done'
  }
];

export function WorkspaceIDE() {
  const [state, setState] = React.useState<WorkspaceState>({
    selectedFile: sampleFileTree[0].children?.[0].children?.[0].children?.[0] || null,
    activeTab: 'preview',
    previewPort: 5174,
    isPreviewLoading: false,
    fileTree: sampleFileTree,
    artifacts: sampleArtifacts,
  });

  const { steps, isRunning, simulateTimeline } = useReasoningTimeline([]);
  const [showTimeline, setShowTimeline] = React.useState(true);
  const [activeSidebar, setActiveSidebar] = React.useState<'chat' | 'artifacts'>('chat');

  // Estado para los tasks del ThinkingPanel
  const [thinkingTasks, setThinkingTasks] = React.useState(DEFAULT_TASKS);

  // Mapeo de stepIds a taskIds del ThinkingPanel
  const stepToTaskMap: Record<string, string> = {
    t1: '1',
    t2: '2',
    t3: '3',
    t4: '4',
    t5: '5',
    t6: '6',
  };

  // Actualiza el ThinkingPanel basado en el estado del timeline
  React.useEffect(() => {
    if (steps.length === 0) return;

    setThinkingTasks(prev => prev.map(task => {
      const stepId = Object.keys(stepToTaskMap).find(key => stepToTaskMap[key] === task.id);
      if (!stepId) return task;

      const step = steps.find(s => s.id === stepId);
      if (!step) return task;

      if (step.status === 'done') {
        return { ...task, status: 'done' };
      } else if (step.status === 'running') {
        return { ...task, status: 'running' };
      } else if (step.status === 'error') {
        return { ...task, status: 'error' };
      } else {
        return { ...task, status: 'pending' };
      }
    }));
  }, [steps]);

  const handleSelectFile = (file: FileNode) => {
    setState(prev => ({
      ...prev,
      selectedFile: file,
      activeTab: 'code'
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

  const handleStartDemo = async () => {
    if (!isRunning) {
      // Reset
      setThinkingTasks(DEFAULT_TASKS);
      
      // Ejecuta la simulación del timeline (que actualizará automáticamente el ThinkingPanel via useEffect)
      await simulateTimeline();
    }
  };

  const totalFiles = steps.flatMap(s => s.items || []).filter(i => i.status === 'done').length;
  const totalDeps = steps.find(s => s.agent === 'dependencies')?.items?.filter(i => i.status === 'done').length || 0;
  const totalTime = steps
    .filter(s => s.startedAt && s.finishedAt)
    .reduce((acc, s) => acc + (s.finishedAt! - s.startedAt!), 0) / 1000;
  const stats = {
    filesCreated: totalFiles,
    linesOfCode: totalFiles * 70, // Estimación
    dependenciesAdded: totalDeps,
    totalTimeSeconds: totalTime,
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
            onClick={() => setShowTimeline(!showTimeline)}
          >
            {showTimeline ? <RotateCcw className="size-4 mr-1" /> : <MessageSquare className="size-4 mr-1" />}
            {showTimeline ? 'Ocultar Timeline' : 'Ver Timeline'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleStartDemo}
            disabled={isRunning}
          >
            <Play className="size-4 mr-1" />
            {isRunning ? 'Generando...' : 'Demo: Crear App'}
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Explorer + Timeline */}
        <div className="flex flex-col w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
          {/* Timeline Toggle */}
          {showTimeline && (
            <div className="flex-1 overflow-auto border-b border-gray-200 dark:border-gray-800">
              <ReasoningTimeline
                steps={steps.length > 0 ? steps : exampleSteps}
                stats={steps.length > 0 && totalTime > 0 ? stats : exampleStats}
              />
            </div>
          )}
          {/* Explorer */}
          <div className={cn(
            'flex flex-col',
            showTimeline ? 'h-1/2' : 'flex-1'
          )}>
            <Explorer
              fileTree={state.fileTree}
              selectedFile={state.selectedFile}
              onSelectFile={handleSelectFile}
            />
          </div>
        </div>

        {/* Center - Preview/Code */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="h-10 border-b border-gray-200 dark:border-gray-800 flex items-center px-2 bg-white dark:bg-gray-900">
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'preview' }))}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                state.activeTab === 'preview'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <Eye className="size-4" />
              Preview
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'code' }))}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                state.activeTab === 'code'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <Code className="size-4" />
              Código
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {state.activeTab === 'preview' ? (
              <PreviewPanel
                port={state.previewPort}
                isLoading={state.isPreviewLoading}
              />
            ) : (
              <CodeEditor
                file={state.selectedFile}
                theme="dark"
              />
            )}
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
                <div className="flex-1">
                  <ThinkingPanel tasks={thinkingTasks} />
                </div>
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
