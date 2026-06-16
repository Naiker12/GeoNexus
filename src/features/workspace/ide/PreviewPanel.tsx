import * as React from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PreviewPanelProps {
  port: number;
  isLoading?: boolean;
}

export function PreviewPanel({ port, isLoading = false }: PreviewPanelProps) {
  const [key, setKey] = React.useState(0);
  const previewUrl = `http://localhost:${port}`;

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
          <span className="text-xs text-gray-500 dark:text-gray-500">{previewUrl}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Recargar"
          >
            <RefreshCw className="size-4 text-gray-500" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title="Abrir en navegador"
          >
            <ExternalLink className="size-4 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Iniciando servidor...</p>
            </div>
          </div>
        )}
        <iframe
          key={key}
          src={previewUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Preview"
        />
      </div>
    </div>
  );
}
