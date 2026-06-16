export interface TimelineItem {
  name: string;
  status: 'pending' | 'done' | 'error';
}

export interface TimelineStep {
  id: string;
  agent: 'planner' | 'workspace' | 'dependencies' | 'coding' | 'database' | 'api' | 'preview';
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  items?: TimelineItem[];
  startedAt?: number;
  finishedAt?: number;
}

export interface GenerationStats {
  filesCreated: number;
  linesOfCode: number;
  dependenciesAdded: number;
  totalTimeSeconds: number;
}
