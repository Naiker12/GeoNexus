import * as React from 'react';
import { TimelineStep, TimelineItem } from './timeline-types';
import { isTauriAvailable } from '@/api/data';
import { listen } from '@tauri-apps/api/event';

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

export function useReasoningTimeline(initialSteps: TimelineStep[] = []) {
  const [steps, dispatch] = React.useReducer(timelineReducer, initialSteps);
  const [isRunning, setIsRunning] = React.useState(false);

  // Simulación de eventos (para demo)
  const simulateTimeline = React.useCallback(async () => {
    setIsRunning(true);
    dispatch({ type: 'RESET_TIMELINE' });

    // Paso 1: Planner
    dispatch({
      type: 'ADD_STEP',
      step: {
        id: 't1',
        agent: 'planner',
        label: 'Analizando objetivo: App de Inventario',
        status: 'running',
        startedAt: Date.now(),
        items: [],
      },
    });

    await new Promise(r => setTimeout(r, 1200));
    
    dispatch({
      type: 'UPDATE_STEP_STATUS',
      stepId: 't1',
      status: 'done',
    });

    dispatch({
      type: 'ADD_ITEM',
      stepId: 't1',
      item: { name: 'Stack: React + Tailwind + Zustand', status: 'done' },
    });

    // Paso 2: Workspace
    dispatch({
      type: 'ADD_STEP',
      step: {
        id: 't2',
        agent: 'workspace',
        label: 'Creando estructura del proyecto',
        status: 'running',
        startedAt: Date.now(),
        items: [],
      },
    });

    await new Promise(r => setTimeout(r, 600));
    
    dispatch({
      type: 'UPDATE_STEP_STATUS',
      stepId: 't2',
      status: 'done',
    });

    dispatch({
      type: 'ADD_ITEM',
      stepId: 't2',
      item: { name: '~/projects/inventario-app', status: 'done' },
    });

    // Paso 3: Dependencies
    dispatch({
      type: 'ADD_STEP',
      step: {
        id: 't3',
        agent: 'dependencies',
        label: 'Instalando dependencias',
        status: 'running',
        startedAt: Date.now(),
        items: [],
      },
    });

    const deps = ['react@18.3', 'tailwindcss@3.4', 'zustand@4.5', 'lucide-react@0.383', '@tauri-apps/api@2.0'];
    for (let i = 0; i < deps.length; i++) {
      await new Promise(r => setTimeout(r, 500));
      dispatch({
        type: 'ADD_ITEM',
        stepId: 't3',
        item: { name: deps[i], status: 'done' },
      });
    }

    dispatch({
      type: 'UPDATE_STEP_STATUS',
      stepId: 't3',
      status: 'done',
    });

    // Paso 4: Coding
    dispatch({
      type: 'ADD_STEP',
      step: {
        id: 't4',
        agent: 'coding',
        label: 'Generando componentes',
        status: 'running',
        startedAt: Date.now(),
        items: [],
      },
    });

    const files = [
      'App.tsx',
      'components/Layout.tsx',
      'components/ProductTable.tsx',
      'components/AddProductModal.tsx',
      'store/inventory.ts',
      'hooks/useInventory.ts'
    ];
    for (let i = 0; i < files.length; i++) {
      dispatch({
        type: 'ADD_ITEM',
        stepId: 't4',
        item: { name: files[i], status: 'pending' },
      });
    }

    for (let i = 0; i < files.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      dispatch({
        type: 'UPDATE_ITEM_STATUS',
        stepId: 't4',
        itemName: files[i],
        status: 'done',
      });
    }

    dispatch({
      type: 'UPDATE_STEP_STATUS',
      stepId: 't4',
      status: 'done',
    });

    // Paso 5: Database
    dispatch({
      type: 'ADD_STEP',
      step: {
        id: 't5',
        agent: 'database',
        label: 'Configurando base de datos',
        status: 'running',
        startedAt: Date.now(),
        items: [],
      },
    });

    await new Promise(r => setTimeout(r, 800));
    dispatch({
      type: 'ADD_ITEM',
      stepId: 't5',
      item: { name: 'migrations/001_products.sql', status: 'done' },
    });
    await new Promise(r => setTimeout(r, 400));
    dispatch({
      type: 'ADD_ITEM',
      stepId: 't5',
      item: { name: 'seed/sample_products.sql', status: 'done' },
    });

    dispatch({
      type: 'UPDATE_STEP_STATUS',
      stepId: 't5',
      status: 'done',
    });

    // Paso 6: Preview
    dispatch({
      type: 'ADD_STEP',
      step: {
        id: 't6',
        agent: 'preview',
        label: 'Lanzando preview',
        status: 'running',
        startedAt: Date.now(),
        items: [],
      },
    });

    await new Promise(r => setTimeout(r, 1200));
    dispatch({
      type: 'ADD_ITEM',
      stepId: 't6',
      item: { name: '→ App corriendo en localhost:5174', status: 'done' },
    });
    
    dispatch({
      type: 'UPDATE_STEP_STATUS',
      stepId: 't6',
      status: 'done',
    });

    setIsRunning(false);
  }, []);

  // Escuchar eventos Tauri reales (integración con backend Rust)
  React.useEffect(() => {
    if (!isTauriAvailable()) return;

    const unlistenPromises = Promise.all([
      // Evento: Paso del agente iniciado
      listen('agent:step_start', (event) => {
        const payload = event.payload as { stepId: string; agent: string; label: string };
        dispatch({
          type: 'ADD_STEP',
          step: {
            id: payload.stepId,
            agent: payload.agent as any,
            label: payload.label,
            status: 'running',
            startedAt: Date.now(),
            items: [],
          },
        });
      }),

      // Evento: Item añadido a un paso
      listen('agent:item_added', (event) => {
        const payload = event.payload as { stepId: string; item: string; status: 'done' | 'pending' };
        dispatch({
          type: 'ADD_ITEM',
          stepId: payload.stepId,
          item: {
            name: payload.item,
            status: payload.status,
          },
        });
      }),

      // Evento: Item actualizado en un paso
      listen('agent:item_updated', (event) => {
        const payload = event.payload as { stepId: string; itemName: string; status: 'done' | 'pending' };
        dispatch({
          type: 'UPDATE_ITEM_STATUS',
          stepId: payload.stepId,
          itemName: payload.itemName,
          status: payload.status,
        });
      }),

      // Evento: Paso del agente completado
      listen('agent:step_complete', (event) => {
        const payload = event.payload as { stepId: string; status: 'done' | 'error' };
        dispatch({
          type: 'UPDATE_STEP_STATUS',
          stepId: payload.stepId,
          status: payload.status,
        });
      }),

      // Evento: Archivo creado por el Coding Agent (para referencia)
      listen('coding:file_created', () => { /* Already handled by agent:item_updated */ }),

      // Evento: Dependencia instalada (para referencia)
      listen('dep:installed', () => { /* Already handled by agent:item_added */ }),
    ]);

    return () => {
      unlistenPromises.then(unlistens => {
        unlistens.forEach(unlisten => unlisten());
      });
    };
  }, []);

  return {
    steps,
    dispatch,
    isRunning,
    simulateTimeline,
  };
}
