/**
 * Hook for managing image edit history with undo/redo capability.
 */

import { useReducer, useCallback } from 'react';
import type { HistoryState, HistoryAction, ImageMap } from './types';

const MAX_HISTORY_SIZE = 50;

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET': {
      const next = typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      if (next === state.present) return state;
      return {
        past: [...state.past.slice(-MAX_HISTORY_SIZE), state.present],
        present: next,
        future: []
      };
    }
    case 'UNDO': {
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future]
      };
    }
    case 'REDO': {
      if (!state.future.length) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1)
      };
    }
    case 'REPLACE':
      return { past: [], present: action.payload, future: [] };
    default:
      return state;
  }
}

export function useImageHistory(initialState: ImageMap) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialState,
    future: []
  });

  const setImages = useCallback((payload: ImageMap | ((prev: ImageMap) => ImageMap)) => {
    dispatch({ type: 'SET', payload });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const replace = useCallback((payload: ImageMap) => {
    dispatch({ type: 'REPLACE', payload });
  }, []);

  return {
    images: state.present,
    setImages,
    undo,
    redo,
    replace,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0
  };
}
