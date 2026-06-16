import * as React from 'react';
import {
  FileText,
  FileJson,
  FileCode,
  FileCode2,
  FileType,
  FileImage,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileIconProps {
  name: string;
  type: 'file' | 'directory';
  isOpen?: boolean;
  className?: string;
}

export function FileIcon({ name, type, isOpen, className }: FileIconProps) {
  if (type === 'directory') {
    return isOpen ? (
      <FolderOpen className={cn('text-blue-500', className)} />
    ) : (
      <Folder className={cn('text-blue-400', className)} />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode2 className={cn('text-blue-600', className)} />;
    case 'json':
      return <FileJson className={cn('text-yellow-600', className)} />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileType className={cn('text-pink-500', className)} />;
    case 'html':
      return <FileType className={cn('text-orange-500', className)} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage className={cn('text-purple-500', className)} />;
    default:
      return <FileText className={cn('text-gray-500', className)} />;
  }
}
