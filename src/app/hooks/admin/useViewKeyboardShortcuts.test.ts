// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useViewKeyboardShortcuts } from './useViewKeyboardShortcuts';

describe('useViewKeyboardShortcuts', () => {
  it('calls onChangeView with "list" when pressing cmd+1', () => {
    const onChangeView = vi.fn();
    renderHook(() => useViewKeyboardShortcuts({ onChangeView, enabled: true }));

    const event = new KeyboardEvent('keydown', { key: '1', metaKey: true });
    document.dispatchEvent(event);

    expect(onChangeView).toHaveBeenCalledWith('list');
  });

  it('calls onChangeView with "grid" when pressing cmd+2', () => {
    const onChangeView = vi.fn();
    renderHook(() => useViewKeyboardShortcuts({ onChangeView, enabled: true }));

    const event = new KeyboardEvent('keydown', { key: '2', metaKey: true });
    document.dispatchEvent(event);

    expect(onChangeView).toHaveBeenCalledWith('grid');
  });

  it('calls onChangeView with "knowledge" when pressing cmd+3', () => {
    const onChangeView = vi.fn();
    renderHook(() => useViewKeyboardShortcuts({ onChangeView, enabled: true }));

    const event = new KeyboardEvent('keydown', { key: '3', metaKey: true });
    document.dispatchEvent(event);

    expect(onChangeView).toHaveBeenCalledWith('knowledge');
  });

  it('does nothing when disabled', () => {
    const onChangeView = vi.fn();
    renderHook(() => useViewKeyboardShortcuts({ onChangeView, enabled: false }));

    const event = new KeyboardEvent('keydown', { key: '1', metaKey: true });
    document.dispatchEvent(event);

    expect(onChangeView).not.toHaveBeenCalled();
  });
});
