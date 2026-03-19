import { describe, it, expect } from 'vitest';
import type { ContentItem } from './content';

describe('ContentItem', () => {
  it('should have all required fields for unified views', () => {
    const item: ContentItem = {
      id: 'test-123',
      heroImage: undefined,
      imageCount: 5,
      passport: undefined,
      completeness: 75,
      mappedFields: 15,
      totalFields: 20,
      status: 'published',
      lastModified: new Date()
    };

    expect(item.id).toBe('test-123');
    expect(item.completeness).toBe(75);
    expect(item.imageCount).toBe(5);
  });
});
