import * as React from 'react';
import { FileIcon } from './FileIcon';
import { type FileNode } from './ide-types';
import { cn } from '@/lib/utils';
import { ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ExplorerProps {
  fileTree: FileNode[];
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
}

interface FileTreeNodeProps {
  node: FileNode;
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
  level?: number;
}

function FileTreeNode({
  node,
  selectedFile,
  onSelectFile,
  level = 0,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const statusIcon = () => {
    switch (node.status) {
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

  const isSelected = selectedFile?.path === node.path;

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1.5 py-1 px-2 cursor-pointer text-sm transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          isSelected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (node.type === 'file') {
            onSelectFile(node);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {node.type === 'directory' && hasChildren && (
          <ChevronRight
            className={cn('size-3 text-gray-400 transition-transform', isExpanded && 'rotate-90')}
          />
        )}
        {node.type === 'directory' && !hasChildren && <span className="w-3" />}
        <FileIcon
          name={node.name}
          type={node.type}
          isOpen={node.type === 'directory' && isExpanded}
          className="size-4"
        />
        <span className="flex-1 truncate">{node.name}</span>
        {statusIcon()}
      </div>

      {node.type === 'directory' && isExpanded && hasChildren && (
        <div className="pl-1">
          {node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Explorer({ fileTree, selectedFile, onSelectFile }: ExplorerProps) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Explorer
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay archivos aún
          </div>
        ) : (
          fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
