import * as React from 'react';
import { TimelineStep, TimelineItem, GenerationStats } from './timeline-types';
import { CheckCircle2, XCircle, Circle, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AGENT_ICONS: Record<TimelineStep['agent'], string> = {
  planner: '🧠',
  workspace: '📁',
  dependencies: '⚙️',
  coding: '💻',
  database: '🗄️',
  api: '🔌',
  preview: '🎨',
};

interface StatusIconProps {
  status: TimelineStep['status'];
}

function StatusIcon({ status }: StatusIconProps) {
  switch (status) {
    case 'pending':
      return <Circle className="size-4 text-gray-300" />;
    case 'running':
      return <Loader2 className="size-4 text-blue-500 animate-spin" />;
    case 'done':
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    case 'error':
      return <XCircle className="size-4 text-red-500" />;
  }
}

interface ElapsedTimerProps {
  startedAt: number;
}

function ElapsedTimer({ startedAt }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="text-xs text-gray-500 ml-2">
      {elapsed.toFixed(1)}s
    </span>
  );
}

interface ItemBadgeProps {
  item: TimelineItem;
}

function ItemBadge({ item }: ItemBadgeProps) {
  const statusColor = {
    pending: 'bg-gray-100 text-gray-500 border-gray-200',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
      statusColor[item.status]
    )}>
      {item.status === 'done' && <CheckCircle2 className="size-3" />}
      {item.status === 'error' && <XCircle className="size-3" />}
      {item.name}
    </span>
  );
}

interface TimelineCardProps {
  step: TimelineStep;
}

function TimelineCard({ step }: TimelineCardProps) {
  const statusStyle = {
    pending: 'border-gray-200 bg-gray-50 opacity-60',
    running: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    done: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10',
    error: 'border-red-500/30 bg-red-50 dark:bg-red-900/10',
  };

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all duration-200',
      statusStyle[step.status]
    )}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{AGENT_ICONS[step.agent]}</span>
        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{step.label}</span>
        <div className="ml-auto flex items-center gap-2">
          <StatusIcon status={step.status} />
          {step.status === 'running' && step.startedAt && (
            <ElapsedTimer startedAt={step.startedAt} />
          )}
          {step.status === 'done' && step.startedAt && step.finishedAt && (
            <span className="text-xs text-gray-500">
              {((step.finishedAt - step.startedAt) / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
      {step.items && step.items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {step.items.map(item => (
            <ItemBadge key={item.name} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

interface GenerationSummaryProps {
  stats: GenerationStats;
}

function GenerationSummary({ stats }: GenerationSummaryProps) {
  return (
    <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumen de generación</h4>
        <span className="text-xs text-gray-500">Completado</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.filesCreated}</div>
          <div className="text-xs text-gray-500">Archivos creados</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.linesOfCode}</div>
          <div className="text-xs text-gray-500">Líneas de código</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.dependenciesAdded}</div>
          <div className="text-xs text-gray-500">Dependencias</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTimeSeconds.toFixed(1)}s</div>
          <div className="text-xs text-gray-500">Tiempo total</div>
        </div>
      </div>
    </div>
  );
}

interface ReasoningTimelineProps {
  steps: TimelineStep[];
  stats?: GenerationStats;
}

export function ReasoningTimeline({ steps, stats }: ReasoningTimelineProps) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 p-4">
        {steps.map(step => (
          <TimelineCard key={step.id} step={step} />
        ))}
      </div>
      {stats && <GenerationSummary stats={stats} />}
    </div>
  );
}

// Datos de ejemplo — eliminados en F1, serán reemplazados por Event Bus en F3
