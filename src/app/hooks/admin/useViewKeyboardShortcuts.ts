import { useEffect, useCallback } from 'react';

type ViewMode = 'list' | 'grid' | 'knowledge';

interface UseViewKeyboardShortcutsOptions {
  onChangeView: (view: ViewMode) => void;
  enabled: boolean;
}

export function useViewKeyboardShortcuts({ onChangeView, enabled }: UseViewKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Only trigger on cmd/ctrl + number (not when typing in inputs)
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    switch (event.key) {
      case '1':
        event.preventDefault();
        onChangeView('list');
        break;
      case '2':
        event.preventDefault();
        onChangeView('grid');
        break;
      case '3':
        event.preventDefault();
        onChangeView('knowledge');
        break;
    }
  }, [onChangeView, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
