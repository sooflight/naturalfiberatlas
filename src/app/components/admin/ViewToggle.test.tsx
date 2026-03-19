/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ViewToggle } from './ViewToggle';

afterEach(() => {
  cleanup();
});

describe('ViewToggle', () => {
  it('renders all three view options', () => {
    render(<ViewToggle currentView="grid" onChange={vi.fn()} />);
    
    expect(screen.getByRole('radio', { name: /imagebase/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /grid/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /knowledge/i })).toBeTruthy();
  });
  
  it('highlights the current view', () => {
    render(<ViewToggle currentView="knowledge" onChange={vi.fn()} />);
    
    const knowledgeButton = screen.getByRole('radio', { name: /knowledge/i });
    expect(knowledgeButton.getAttribute('data-active')).toBe('true');
  });
  
  it('calls onChange when clicking a different view', () => {
    const onChange = vi.fn();
    render(<ViewToggle currentView="grid" onChange={onChange} />);
    
    const imageBaseButton = screen.getByRole('radio', { name: /imagebase/i });
    imageBaseButton.click();
    expect(onChange).toHaveBeenCalledWith('list');
  });
  
  it('shows keyboard shortcuts in title attributes', () => {
    render(<ViewToggle currentView="grid" onChange={vi.fn()} />);
    
    const imageBaseButton = screen.getByRole('radio', { name: /imagebase/i });
    const gridButton = screen.getByRole('radio', { name: /grid/i });
    const knowledgeButton = screen.getByRole('radio', { name: /knowledge/i });
    
    expect(imageBaseButton.getAttribute('title')).toBe('ImageBase (⌘1)');
    expect(gridButton.getAttribute('title')).toBe('Grid (⌘2)');
    expect(knowledgeButton.getAttribute('title')).toBe('Knowledge (⌘3)');
  });
});
