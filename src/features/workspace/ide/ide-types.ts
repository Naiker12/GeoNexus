import type { FileNode } from '@/types/files'

export type { FileNode }

export interface Artifact {
  id: string;
  name: string;
  path: string;
  type: 'code' | 'report' | 'map' | 'dashboard' | 'geo_json' | 'pdf' | 'csv' | 'image';
  description: string;
  lineCount: number;
  status: 'pending' | 'generating' | 'done' | 'error';
  content?: string;
}

export interface WorkspaceState {
  selectedFile: FileNode | null;
  fileTree: FileNode[];
  artifacts: Artifact[];
}
