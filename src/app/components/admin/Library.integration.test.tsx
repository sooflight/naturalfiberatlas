/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Library from './Library';

const mockSetFiberOrder = vi.fn();

// Mock view components for clean integration testing
vi.mock('./views/GridView', () => ({
  GridView: ({ onReorder }: { onReorder?: (draggedId: string, targetId: string) => void }) => (
    <div data-testid="grid-view">
      Grid Content
      <button
        type="button"
        data-testid="grid-reorder-trigger"
        onClick={() => onReorder?.('alpaca', 'hemp')}
      >
        Reorder
      </button>
    </div>
  )
}));

// Mock other dependencies
vi.mock('@/hooks/domains/useProfiles', () => ({
  useProfiles: () => ({
    profiles: [
      { id: 'alpaca', node: null, passport: null, status: 'archived' },
      { id: 'hemp', node: null, passport: null, status: 'archived' },
      { id: 'flax', node: null, passport: null, status: 'archived' },
    ],
    unifiedProfile: null,
    loading: false,
    refreshProfiles: vi.fn()
  })
}));

vi.mock('./node-editor/NodeSidebar', () => ({
  NodeSidebar: () => <div data-testid="node-sidebar">Sidebar</div>
}));

vi.mock('./ingestion/IngestionPanel', () => ({
  default: () => null
}));

vi.mock('./database-interface/domains/ReviewDomain', () => ({
  default: () => null
}));

vi.mock('./database-interface/domains/OperationsDomain', () => ({
  default: () => null
}));

vi.mock('./database-interface/domains/UnifiedEditorDomain', () => ({
  default: () => <div data-testid="knowledge-editor">Knowledge Editor</div>,
}));

vi.mock('./NodeEditorTab', () => ({
  default: () => null
}));

vi.mock('./ImageDatabaseManager', () => ({
  default: ({ viewMode }: { viewMode?: string }) => {
    const [scoutOpened, setScoutOpened] = React.useState(false);
    React.useEffect(() => {
      const onOpenScout = () => setScoutOpened(true);
      window.addEventListener('admin:open-image-scout', onOpenScout);
      return () => window.removeEventListener('admin:open-image-scout', onOpenScout);
    }, []);

    return (
      <div>
        <div data-testid={viewMode === 'list' ? 'list-view' : 'image-db-view'} />
        {scoutOpened ? <div data-testid="image-scout-opened">Image Scout Opened</div> : null}
      </div>
    );
  }
}));

vi.mock('../../../../src/app/context/atlas-data-context', () => ({
  useAtlasData: () => ({
    fibers: [
      { id: "alpaca", name: "Alpaca", category: "animal" },
      { id: "hemp", name: "Hemp", category: "plant" },
    ],
  }),
}));

vi.mock('../../../../src/app/data/data-provider', () => ({
  dataSource: {
    setFiberOrder: (...args: unknown[]) => mockSetFiberOrder(...args),
    subscribe: () => () => {},
    getVersion: () => 0,
    isFiberDeleted: () => false,
    getFiberById: (id: string) => ({ id, image: '', galleryImages: [] }),
  },
}));

// Mock framer-motion to disable animations in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
      const domProps = props as React.HTMLAttributes<HTMLDivElement>;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => {
    const childArray = React.Children.toArray(children);
    return <>{childArray[0]}</>;
  },
}));

// localStorage mock
let localStorageMock: Record<string, string> = {};

beforeEach(() => {
  mockSetFiberOrder.mockReset();
  localStorageMock = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
    },
    writable: true,
  });
  cleanup();
});

describe('Library Integration', () => {
  it('complete user flow: switch views and verify persistence', async () => {
    render(<Library />);
    
    // Initial state: profiles list view (default)
    await waitFor(() => {
      expect(screen.getByTestId('list-view')).toBeTruthy();
    });
    
    // Switch to grid view
    fireEvent.click(screen.getByRole('radio', { name: /grid/i }));
    await waitFor(() => {
      expect(screen.getByTestId('grid-view')).toBeTruthy();
    });
    
    // Use keyboard shortcut to go back to profiles (Cmd+1)
    const event = new KeyboardEvent('keydown', { key: '1', metaKey: true });
    document.dispatchEvent(event);
    
    await waitFor(() => {
      expect(screen.getByTestId('list-view')).toBeTruthy();
    });

    // Switch to knowledge editor via the Knowledge toggle
    fireEvent.click(screen.getByRole('radio', { name: /knowledge/i }));
    await waitFor(() => {
      expect(screen.getByTestId('knowledge-editor')).toBeTruthy();
    });
    expect(screen.getByRole('radiogroup', { name: /view mode/i })).toBeTruthy();
  });
  
  it('view toggle is accessible in browse mode', () => {
    render(<Library />);
    
    // ViewToggle should be present with correct ARIA attributes
    const viewToggle = screen.getByRole('radiogroup', { name: /view mode/i });
    expect(viewToggle).toBeTruthy();
    
    // All three view options should be available
    expect(screen.getByRole('radio', { name: /imagebase|profiles/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /grid/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /knowledge/i })).toBeTruthy();
  });

  it('opens ImageScout when clicking magnifier icon', async () => {
    render(<Library />);

    const magnifier = screen.getByRole('button', { name: /open image scout/i });
    fireEvent.click(magnifier);

    await waitFor(() => {
      expect(screen.getByTestId('image-scout-opened')).toBeTruthy();
    });
  });

  it('writes global order when grid reorder is triggered', async () => {
    render(<Library />);

    fireEvent.click(screen.getByRole('radio', { name: /grid/i }));

    await waitFor(() => {
      expect(screen.getByTestId('grid-view')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('grid-reorder-trigger'));

    expect(mockSetFiberOrder).toHaveBeenCalled();
    const [nextOrder] = mockSetFiberOrder.mock.calls.at(-1) as [string[]];
    expect(nextOrder.slice(0, 3)).toEqual(['hemp', 'alpaca', 'flax']);
  });
});
