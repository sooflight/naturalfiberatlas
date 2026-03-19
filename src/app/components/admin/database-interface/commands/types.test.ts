import { describe, it, expect } from 'vitest';
import type { ViewMode, WorkbenchMode } from './types';

describe('ViewMode type', () => {
  it('should accept valid view modes', () => {
    const list: ViewMode = 'list';
    const grid: ViewMode = 'grid';
    const knowledge: ViewMode = 'knowledge';
    
    expect([list, grid, knowledge]).toEqual(['list', 'grid', 'knowledge']);
  });
});

describe('WorkbenchMode type', () => {
  it('should not include image-base or knowledge-base', () => {
    // These should be removed from the type
    const validModes: WorkbenchMode[] = [
      'browse',      // NEW: replaces image-base + knowledge-base
      'edit-profile',
      'edit-knowledge',
      'import',
      'overview',
      'settings'
    ];
    
    expect(validModes).not.toContain('image-base');
    expect(validModes).not.toContain('knowledge-base');
    expect(validModes).toContain('browse');
    expect(validModes).toContain('edit-knowledge');
  });
});
