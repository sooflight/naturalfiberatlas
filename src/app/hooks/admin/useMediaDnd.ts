import React, { useState, useCallback } from "react";

interface UseMediaDndOptions<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
}

export function useMediaDnd<T>({ items, onReorder }: UseMediaDndOptions<T>) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const onDragStart = useCallback((idx: number) => {
    // Wrap in startTransition if available to keep UI responsive
    if (typeof React.startTransition === 'function') {
      React.startTransition(() => {
        setDraggedIdx(idx);
      });
    } else {
      setDraggedIdx(idx);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    
    if (draggedIdx === null || draggedIdx === toIdx) {
      setDraggedIdx(null);
      return;
    }

    const newItems = [...items];
    const [movedItem] = newItems.splice(draggedIdx, 1);
    newItems.splice(toIdx, 0, movedItem);

    onReorder(newItems);
    setDraggedIdx(null);
  }, [draggedIdx, items, onReorder]);

  const onDragEnd = useCallback(() => {
    setDraggedIdx(null);
  }, []);

  return {
    draggedIdx,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  };
}
