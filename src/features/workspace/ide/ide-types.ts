export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  status: 'pending' | 'generating' | 'done' | 'error';
  children?: FileNode[];
  content?: string;
  language?: string;
  lineCount?: number;
}

export interface Artifact {
  id: string;
  name: string;
  path: string;
  type: 'component' | 'page' | 'style' | 'config' | 'util' | 'other';
  description: string;
  lineCount: number;
  status: 'pending' | 'generating' | 'done' | 'error';
  content?: string;
}

export interface WorkspaceState {
  selectedFile: FileNode | null;
  activeTab: 'preview' | 'code';
  previewPort: number;
  isPreviewLoading: boolean;
  fileTree: FileNode[];
  artifacts: Artifact[];
}
