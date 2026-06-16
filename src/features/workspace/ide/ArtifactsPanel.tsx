import * as React from 'react';
import { Artifact } from './ide-types';
import { FileCode, Copy, Download, Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ArtifactsPanelProps {
  artifacts: Artifact[];
  onViewArtifact: (artifact: Artifact) => void;
}

function getArtifactIcon(type: Artifact['type']) {
  switch (type) {
    case 'component':
      return <FileCode className="size-4 text-blue-500" />;
    case 'page':
      return <FileCode className="size-4 text-green-500" />;
    case 'style':
      return <FileCode className="size-4 text-pink-500" />;
    case 'config':
      return <FileCode className="size-4 text-yellow-500" />;
    case 'util':
      return <FileCode className="size-4 text-purple-500" />;
    default:
      return <FileCode className="size-4 text-gray-500" />;
  }
}

function ArtifactCard({ artifact, onView }: { artifact: Artifact; onView: (a: Artifact) => void }) {
  const [copying, setCopying] = React.useState(false);

  const statusIcon = () => {
    switch (artifact.status) {
      case 'generating':
        return <Loader2 className="size-3 animate-spin text-amber-500" />;
      case 'done':
        return <CheckCircle2 className="size-3 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="size-3 text-red-500" />;
      default:
        return null;
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('Error al copiar');
    } finally {
      setCopying(false);
    }
  };

  const handleExport = () => {
    toast.success('Exportando artifact...');
  };

  return (
    <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {getArtifactIcon(artifact.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {artifact.name}
            </h4>
            {statusIcon()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{artifact.description}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{artifact.lineCount} líneas</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={() => onView(artifact)}
        >
          <Eye className="size-3 mr-1" />
          Ver
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={handleCopy}
          disabled={copying}
        >
          <Copy className="size-3 mr-1" />
          {copying ? 'Copiado' : 'Copiar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={handleExport}
        >
          <Download className="size-3 mr-1" />
          Exportar
        </Button>
      </div>
    </div>
  );
}

export function ArtifactsPanel({ artifacts, onViewArtifact }: ArtifactsPanelProps) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Artifacts
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {artifacts.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No hay artifacts generados aún
          </div>
        ) : (
          artifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onView={onViewArtifact}
            />
          ))
        )}
      </div>
    </div>
  );
}
