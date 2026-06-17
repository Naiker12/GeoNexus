import * as React from 'react';
import { TimelineStep, TimelineItem } from './timeline-types';
import { isTauriAvailable } from '@/api/data';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

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
          if (action.status === 'running' && !newStep.startedAt) newStep.startedAt = Date.now();
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
          return { ...step, items: [...(step.items || []), action.item] };
        }
        return step;
      });
    case 'UPDATE_ITEM_STATUS':
      return state.map(step => {
        if (step.id === action.stepId) {
          return {
            ...step,
            items: (step.items || []).map(item =>
              item.name === action.itemName ? { ...item, status: action.status } : item
            ),
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

export function useReasoningTimeline(initialSteps: TimelineStep[] = []) {
  const [steps, dispatch] = React.useReducer(timelineReducer, initialSteps);
  const [isRunning, setIsRunning] = React.useState(false);

  const simulateTimeline = React.useCallback(async () => {
    setIsRunning(true);
    dispatch({ type: 'RESET_TIMELINE' });

    dispatch({
      type: 'ADD_STEP',
      step: { id: 't1', agent: 'planner', label: 'Analizando objetivo: App de Inventario', status: 'running', startedAt: Date.now(), items: [] },
    });
    await new Promise(r => setTimeout(r, 1200));
    dispatch({ type: 'UPDATE_STEP_STATUS', stepId: 't1', status: 'done' });
    dispatch({ type: 'ADD_ITEM', stepId: 't1', item: { name: 'Stack: React + Tailwind + Zustand', status: 'done' } });

    dispatch({
      type: 'ADD_STEP',
      step: { id: 't2', agent: 'workspace', label: 'Creando estructura del proyecto', status: 'running', startedAt: Date.now(), items: [] },
    });
    await new Promise(r => setTimeout(r, 600));
    dispatch({ type: 'UPDATE_STEP_STATUS', stepId: 't2', status: 'done' });
    dispatch({ type: 'ADD_ITEM', stepId: 't2', item: { name: '~/projects/inventario-app', status: 'done' } });

    dispatch({
      type: 'ADD_STEP',
      step: { id: 't3', agent: 'dependencies', label: 'Instalando dependencias', status: 'running', startedAt: Date.now(), items: [] },
    });
    const deps = ['react@18.3', 'tailwindcss@3.4', 'zustand@4.5', 'lucide-react@0.383', '@tauri-apps/api@2.0'];
    for (let i = 0; i < deps.length; i++) {
      await new Promise(r => setTimeout(r, 500));
      dispatch({ type: 'ADD_ITEM', stepId: 't3', item: { name: deps[i], status: 'done' } });
    }
    dispatch({ type: 'UPDATE_STEP_STATUS', stepId: 't3', status: 'done' });

    dispatch({
      type: 'ADD_STEP',
      step: { id: 't4', agent: 'coding', label: 'Generando componentes', status: 'running', startedAt: Date.now(), items: [] },
    });
    const files = ['App.tsx', 'components/Layout.tsx', 'components/ProductTable.tsx', 'components/AddProductModal.tsx', 'store/inventory.ts', 'hooks/useInventory.ts'];
    for (const f of files) dispatch({ type: 'ADD_ITEM', stepId: 't4', item: { name: f, status: 'pending' } });
    for (const f of files) {
      await new Promise(r => setTimeout(r, 700));
      dispatch({ type: 'UPDATE_ITEM_STATUS', stepId: 't4', itemName: f, status: 'done' });
    }
    dispatch({ type: 'UPDATE_STEP_STATUS', stepId: 't4', status: 'done' });

    dispatch({
      type: 'ADD_STEP',
      step: { id: 't5', agent: 'database', label: 'Configurando base de datos', status: 'running', startedAt: Date.now(), items: [] },
    });
    await new Promise(r => setTimeout(r, 800));
    dispatch({ type: 'ADD_ITEM', stepId: 't5', item: { name: 'migrations/001_products.sql', status: 'done' } });
    await new Promise(r => setTimeout(r, 400));
    dispatch({ type: 'ADD_ITEM', stepId: 't5', item: { name: 'seed/sample_products.sql', status: 'done' } });
    dispatch({ type: 'UPDATE_STEP_STATUS', stepId: 't5', status: 'done' });

    dispatch({
      type: 'ADD_STEP',
      step: { id: 't6', agent: 'preview', label: 'Lanzando preview', status: 'running', startedAt: Date.now(), items: [] },
    });
    await new Promise(r => setTimeout(r, 1200));
    dispatch({ type: 'ADD_ITEM', stepId: 't6', item: { name: '→ App corriendo en localhost:5174', status: 'done' } });
    dispatch({ type: 'UPDATE_STEP_STATUS', stepId: 't6', status: 'done' });

    setIsRunning(false);
  }, []);

  React.useEffect(() => {
    if (!isTauriAvailable()) return;

    // Rust emite snake_case (step_id, item_name) — se mapea explícitamente aquí
    const unlistenPromises = Promise.all([
      listen('agent:step_start', (event) => {
        const p = event.payload as { step_id: string; agent: string; label: string };
        dispatch({
          type: 'ADD_STEP',
          step: { id: p.step_id, agent: p.agent as any, label: p.label, status: 'running', startedAt: Date.now(), items: [] },
        });
      }),

      listen('agent:item_added', (event) => {
        const p = event.payload as { step_id: string; item: string; status: 'done' | 'pending' };
        dispatch({ type: 'ADD_ITEM', stepId: p.step_id, item: { name: p.item, status: p.status } });
      }),

      listen('agent:item_updated', (event) => {
        const p = event.payload as { step_id: string; item_name: string; status: 'done' | 'pending' };
        dispatch({ type: 'UPDATE_ITEM_STATUS', stepId: p.step_id, itemName: p.item_name, status: p.status });
      }),

      listen('agent:step_complete', (event) => {
        const p = event.payload as { step_id: string; status: 'done' | 'error' };
        dispatch({ type: 'UPDATE_STEP_STATUS', stepId: p.step_id, status: p.status });
      }),

      listen('coding:file_created', (event) => {
        const p = event.payload as { path: string; content: string };
        if (!p?.path) return;
        dispatch({ type: 'ADD_ITEM', stepId: 't3', item: { name: `📄 ${p.path}`, status: 'done' } });
      }),
    ]);

    return () => {
      unlistenPromises.then((unlistens) => unlistens.forEach((u) => u()));
    };
  }, []);

  return { steps, dispatch, isRunning, simulateTimeline };
}
