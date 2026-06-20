import * as React from 'react';
import { TimelineStep, TimelineItem } from './timeline-types';
import { useEventBus } from '@/hooks/useEventBus';

type TimelineAction =
  | { type: 'ADD_STEP'; step: TimelineStep }
  | { type: 'UPDATE_STEP_STATUS'; stepId: string; status: TimelineStep['status'] }
  | { type: 'ADD_ITEM'; stepId: string; item: TimelineItem }
  | { type: 'UPDATE_ITEM_STATUS'; stepId: string; itemName: string; status: TimelineItem['status'] }
  | { type: 'RESET_TIMELINE' };

function timelineReducer(state: TimelineStep[], action: TimelineAction): TimelineStep[] {
  switch (action.type) {
    case 'ADD_STEP':
      return [...state, action.step];
    case 'UPDATE_STEP_STATUS':
      return state.map(step => {
        if (step.id === action.stepId) {
          const newStep = { ...step, status: action.status };
          if (action.status === 'running' && !newStep.startedAt) {
            newStep.startedAt = Date.now();
          }
          if ((action.status === 'done' || action.status === 'error') && !newStep.finishedAt) {
            newStep.finishedAt = Date.now();
          }
          return newStep;
        }
        return step;
      });
    case 'ADD_ITEM':
      return state.map(step => {
        if (step.id === action.stepId) {
          return {
            ...step,
            items: [...(step.items || []), action.item],
          };
        }
        return step;
      });
    case 'UPDATE_ITEM_STATUS':
      return state.map(step => {
        if (step.id === action.stepId) {
          return {
            ...step,
            items: (step.items || []).map(item => {
              if (item.name === action.itemName) {
                return { ...item, status: action.status };
              }
              return item;
            }),
          };
        }
        return step;
      });
    case 'RESET_TIMELINE':
      return [];
    default:
      return state;
  }
}

const workerToAgent = (worker: string): TimelineStep['agent'] => {
  const w = worker.toLowerCase();
  if (w === 'planner') return 'planner';
  if (w === 'workspace') return 'workspace';
  if (w === 'dependencies' || w === 'dependency') return 'dependencies';
  if (w === 'coding' || w === 'code') return 'coding';
  if (w === 'database' || w === 'db') return 'database';
  if (w === 'api') return 'api';
  if (w === 'preview') return 'preview';
  return 'coding'; // fallback
};

export function useReasoningTimeline(sessionId: string, initialSteps: TimelineStep[] = []) {
  const [steps, dispatch] = React.useReducer(timelineReducer, initialSteps);

  const events = useEventBus(sessionId);

  const realSteps = React.useMemo(() => {
    if (!sessionId) return [];

    const stepsList: TimelineStep[] = [];
    const stepMap = new Map<string, TimelineStep>();
    let activeStep: TimelineStep | null = null;

    for (const event of events) {
      const type = event.event_type;
      switch (type) {
        case 'worker_started': {
          const worker = event.payload.worker || '';
          const task = event.payload.task || '';
          const step: TimelineStep = {
            id: event.id,
            agent: workerToAgent(worker),
            label: task || `Ejecutando ${worker}`,
            status: 'running',
            startedAt: event.timestamp,
            items: [],
          };
          stepsList.push(step);
          stepMap.set(event.id, step);
          activeStep = step;
          break;
        }
        case 'worker_completed': {
          const step = stepMap.get(event.id);
          if (step) {
            step.status = 'done';
            step.finishedAt = event.timestamp;
          }
          break;
        }
        case 'worker_failed': {
          const step = stepMap.get(event.id);
          if (step) {
            step.status = 'error';
            step.finishedAt = event.timestamp;
          }
          break;
        }
        case 'connector_used': {
          const target = activeStep || stepsList[stepsList.length - 1];
          if (target) {
            target.items = target.items || [];
            target.items.push({
              name: `Conector ${event.payload.connector || ''}: ${event.payload.action || ''} (${event.payload.result_count || 0} resultados)`,
              status: 'done',
            });
          }
          break;
        }
        case 'mcp_called': {
          const target = activeStep || stepsList[stepsList.length - 1];
          if (target) {
            target.items = target.items || [];
            target.items.push({
              name: `MCP ${event.payload.server || ''} -> ${event.payload.tool || ''} (${event.payload.duration_ms || 0}ms)`,
              status: 'done',
            });
          }
          break;
        }
        case 'mcp_failed': {
          const target = activeStep || stepsList[stepsList.length - 1];
          if (target) {
            target.items = target.items || [];
            target.items.push({
              name: `MCP ${event.payload.server || ''} -> ${event.payload.tool || ''} falló: ${event.payload.error || ''}`,
              status: 'error',
            });
          }
          break;
        }
        case 'artifact_created': {
          const target = activeStep || stepsList[stepsList.length - 1];
          if (target) {
            target.items = target.items || [];
            const name = event.payload.name || event.payload.path || 'Archivo creado';
            if (!target.items.some(item => item.name === name)) {
              target.items.push({
                name,
                status: 'done',
              });
            }
          }
          break;
        }
        case 'memory_queried': {
          const target = activeStep || stepsList[stepsList.length - 1];
          if (target) {
            target.items = target.items || [];
            target.items.push({
              name: `Memoria consultada: ${event.payload.chunks_found || 0} fragmentos`,
              status: 'done',
            });
          }
          break;
        }
        case 'llm_done': {
          const target = activeStep || stepsList[stepsList.length - 1];
          if (target) {
            target.items = target.items || [];
            target.items.push({
              name: `LLM completado en ${event.payload.duration_ms || 0}ms`,
              status: 'done',
            });
          }
          break;
        }
        case 'llm_tool_call': {
          const target = activeStep || stepsList[stepsList.length - 1];
          if (target) {
            target.items = target.items || [];
            target.items.push({
              name: `LLM Tool Call: ${event.payload.tool_name || ''}`,
              status: 'done',
            });
          }
          break;
        }
        default:
          break;
      }
    }

    return stepsList;
  }, [events, sessionId]);

  const isRunning = React.useMemo(() => {
    if (!sessionId) return false;
    return events.some(e => e.event_type === 'pipeline_started') &&
           !events.some(e => e.event_type === 'pipeline_completed' || e.event_type === 'pipeline_failed');
  }, [events, sessionId]);

  return {
    steps: sessionId ? realSteps : steps,
    dispatch,
    isRunning,
  };
}
