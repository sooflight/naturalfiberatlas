import { describe, it, expect } from 'vitest';
import { GridView } from './index';

describe('View exports', () => {
  it('exports active view components', () => {
    expect(GridView).toBeDefined();
  });
});
