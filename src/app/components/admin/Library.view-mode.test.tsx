/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import LibraryDefault, { useLibraryState } from './Library';

// Mock lazy-loaded components to avoid provider dependencies
vi.mock('./ingestion/IngestionPanel', () => ({
  default: () => null
}));
vi.mock('../database-interface/domains/ReviewDomain', () => ({
  default: () => null
}));
vi.mock('../database-interface/domains/OperationsDomain', () => ({
  default: () => null
}));
vi.mock('./NodeEditorTab', () => ({
  default: () => null
}));
vi.mock('./ImageDatabaseManager', () => ({
  default: () => null
}));

vi.mock('../../../../src/app/context/atlas-data-context', () => ({
  useAtlasData: () => ({
    fibers: [
      { id: "alpaca", name: "Alpaca", category: "animal" },
      { id: "hemp", name: "Hemp", category: "plant" },
    ],
  }),
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
    // Only render the first child (current mode), filtering out exiting children
    const childArray = React.Children.toArray(children);
    return <>{childArray[0]}</>;
  },
}));

describe('Library ViewMode state', () => {
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
  });

  it('should initialize with profiles list as default view', () => {
    const { result } = renderHook(() => useLibraryState());
    
    expect(result.current.viewMode).toBe('list');
  });
  
  it('should change view mode', () => {
    const { result } = renderHook(() => useLibraryState());
    
    act(() => {
      result.current.setViewMode('knowledge');
    });
    
    expect(result.current.viewMode).toBe('knowledge');
  });
  
  it('should persist selection across view changes', () => {
    const { result } = renderHook(() => useLibraryState());
    
    act(() => {
      result.current.selectItem('item-123');
    });
    
    act(() => {
      result.current.setViewMode('list');
    });
    
    expect(result.current.selectedItemId).toBe('item-123');
  });

  it('should read view mode from localStorage on init', () => {
    localStorage.setItem('atlas-view-mode', 'knowledge');
    const { result } = renderHook(() => useLibraryState());
    
    expect(result.current.viewMode).toBe('knowledge');
  });

  it('should persist view mode to localStorage', () => {
    const { result } = renderHook(() => useLibraryState());
    
    act(() => {
      result.current.setViewMode('list');
    });
    
    expect(localStorage.getItem('atlas-view-mode')).toBe('list');
  });

  it('should handle invalid stored view mode gracefully', () => {
    localStorage.setItem('atlas-view-mode', 'invalid-mode');
    const { result } = renderHook(() => useLibraryState());
    
    expect(result.current.viewMode).toBe('list'); // Should fall back to default
  });
});

describe('Library ViewToggle integration', () => {
  it('renders ViewToggle in browse mode', () => {
    render(<LibraryDefault />);
    
    // Should show the view toggle buttons (using getAllByRole since there may be multiple)
    const profileButtons = screen.getAllByRole('radio', { name: /image\s*base/i });
    const gridButtons = screen.getAllByRole('radio', { name: /grid/i });
    const knowledgeButtons = screen.getAllByRole('radio', { name: /knowledge/i });
    
    expect(profileButtons.length).toBeGreaterThan(0);
    expect(gridButtons.length).toBeGreaterThan(0);
    expect(knowledgeButtons.length).toBeGreaterThan(0);
  });
  
  it('renders ViewToggle in browse mode when forced', () => {
    render(<LibraryDefault forcedMode="browse" />);
    
    // Should show the view toggle buttons
    const profileButtons = screen.getAllByRole('radio', { name: /image\s*base/i });
    const gridButtons = screen.getAllByRole('radio', { name: /grid/i });
    const knowledgeButtons = screen.getAllByRole('radio', { name: /knowledge/i });
    
    expect(profileButtons.length).toBeGreaterThan(0);
    expect(gridButtons.length).toBeGreaterThan(0);
    expect(knowledgeButtons.length).toBeGreaterThan(0);
  });

  it('hides ViewToggle in edit-profile mode', async () => {
    // First verify browse mode HAS ViewToggle
    render(<LibraryDefault forcedMode="browse" />);
    
    await waitFor(() => {
      const viewToggles = screen.queryAllByRole('radiogroup', { name: /view mode/i });
      expect(viewToggles.length).toBeGreaterThanOrEqual(1);
    });
    
    // Clean up and render fresh in edit-profile mode
    cleanup();
    render(<LibraryDefault forcedMode="edit-profile" />);
    
    // Wait for state update and verify NO ViewToggle in edit-profile mode
    await waitFor(() => {
      const viewToggles = screen.queryAllByRole('radiogroup', { name: /view mode/i });
      expect(viewToggles).toHaveLength(0);
    });
    
    // Verify individual view buttons are also not present
    expect(screen.queryByRole('radio', { name: /image\s*base/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /grid/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /knowledge/i })).toBeNull();
  });
});
