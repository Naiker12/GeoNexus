import * as React from 'react';
import { CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface ThinkingPanelProps {
  tasks: Task[];
  title?: string;
}

export function ThinkingPanel({ 
  tasks, 
  title = "Thinking ..." 
}: ThinkingPanelProps) {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="size-4 text-gray-500 animate-spin" />
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h4>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        complete, missing some parts)
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 text-sm">
            {task.status === 'pending' && (
              <Circle className="size-4 text-gray-400" />
            )}
            {task.status === 'running' && (
              <Loader2 className="size-4 text-blue-500 animate-spin" />
            )}
            {task.status === 'done' && (
              <CheckCircle2 className="size-4 text-green-600" />
            )}
            {task.status === 'error' && (
              <XCircle className="size-4 text-red-600" />
            )}
            <span className={clsx(
              "text-gray-700 dark:text-gray-300",
              task.status === 'done' && "line-through text-gray-400"
            )}>
              {task.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// DEFAULT_TASKS eliminado en F1, serán reemplazados por Event Bus en F3
