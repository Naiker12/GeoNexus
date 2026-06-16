import * as React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { type FileNode } from './ide-types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CodeEditorProps {
  file: FileNode | null;
  theme?: 'dark' | 'light';
  readOnly?: boolean;
  onChange?: (content: string) => void;
}

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    case 'js':
      return 'javascript';
    case 'jsx':
      return 'jsx';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
      return 'scss';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    default:
      return 'text';
  }
}

export function CodeEditor({ file, theme = 'dark', readOnly = true, onChange }: CodeEditorProps) {
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Selecciona un archivo para ver su contenido
        </p>
      </div>
    );
  }

  const language = getLanguage(file.name);
  const content = file.content || '// No hay contenido disponible';

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</span>
          {file.lineCount && (
            <span className="text-xs text-gray-500 dark:text-gray-500">{file.lineCount} líneas</span>
          )}
        </div>
        {file.status === 'generating' && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Generando...
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? vscDarkPlus : vs}
          customStyle={{ margin: 0, height: '100%', minHeight: '100%' }}
          showLineNumbers
          wrapLines
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            opacity: 0.5,
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
