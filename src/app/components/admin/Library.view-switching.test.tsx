/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Library from './Library';

// Mock the view components
vi.mock('./views/GridView', () => ({
  GridView: () => <div data-testid="grid-view">Grid</div>
}));

// Mock other dependencies
vi.mock('@/hooks/domains/useProfiles', () => ({
  useProfiles: () => ({
    profiles: [],
    unifiedProfile: null,
    loading: false,
    refreshProfiles: vi.fn()
  })
}));

vi.mock('./node-editor/NodeSidebar', () => ({
  NodeSidebar: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <div data-testid="node-sidebar">
      Sidebar
      <button type="button" onClick={() => onSelect("alpaca")}>
        Sidebar Select Alpaca
      </button>
    </div>
  )
}));

vi.mock('./ingestion/IngestionPanel', () => ({
  default: () => null
}));

vi.mock('../database-interface/domains/ReviewDomain', () => ({
  default: () => null
}));

vi.mock('../database-interface/domains/OperationsDomain', () => ({
  default: () => null
}));

vi.mock('./database-interface/domains/UnifiedEditorDomain', () => ({
  default: () => <div data-testid="knowledge-editor">Knowledge Editor</div>,
}));

vi.mock('./NodeEditorTab', () => ({
  default: () => null
}));

vi.mock('./ImageDatabaseManager', () => ({
  default: ({ viewMode }: { viewMode?: string }) => (
    <div data-testid={viewMode === 'list' ? 'list-view' : 'image-db-view'} />
  )
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
    setFiberOrder: vi.fn(),
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

// Mock ViewToggle
vi.mock('./ViewToggle', () => ({
  ViewToggle: ({ currentView, onChange }: { currentView: string; onChange: (view: string) => void }) => (
    <div data-testid="view-toggle" role="radiogroup" aria-label="view mode">
      <button role="radio" aria-checked={currentView === 'grid'} onClick={() => onChange('grid')}>Grid</button>
      <button role="radio" aria-checked={currentView === 'list'} onClick={() => onChange('list')}>Profiles</button>
      <button role="radio" aria-checked={currentView === 'knowledge'} onClick={() => onChange('knowledge')}>Knowledge</button>
    </div>
  )
}));

// localStorage mock
let localStorageMock: Record<string, string> = {};

beforeEach(() => {
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

describe('Library view switching', () => {
  it('shows Profiles view by default', async () => {
    render(<Library />);

    await waitFor(() => {
      expect(screen.getByTestId('list-view')).toBeTruthy();
    });
  });

  it('switches to Profiles view when clicking Profiles', async () => {
    render(<Library />);

    fireEvent.click(screen.getByRole('radio', { name: /profiles/i }));

    await waitFor(() => {
      expect(screen.getByTestId('list-view')).toBeTruthy();
    });
  });

  it('switches to the unified knowledge editor when selecting Knowledge view', async () => {
    render(<Library />);

    fireEvent.click(screen.getByRole('radio', { name: /knowledge/i }));

    await waitFor(() => {
      expect(screen.getByTestId('knowledge-editor')).toBeTruthy();
    });
  });

  it("returns to ImageBase when selecting a profile from sidebar", async () => {
    render(<Library />);

    fireEvent.click(screen.getByRole('radio', { name: /knowledge/i }));

    await waitFor(() => {
      expect(screen.getByTestId('knowledge-editor')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /sidebar select alpaca/i }));

    await waitFor(() => {
      expect(screen.getByTestId("list-view")).toBeTruthy();
    });
  });
});
