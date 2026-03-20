function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    Boolean(element?.isContentEditable)
  );
}

export function shouldToggleInspectorShortcut(event: KeyboardEvent): boolean {
  if (event.repeat) return false;
  if (isTypingTarget(event.target)) return false;
  return event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "i";
}

export function shouldHandleHistoryShortcut(event: KeyboardEvent): "undo" | "redo" | null {
  if (isTypingTarget(event.target)) return null;
  const isMeta = event.metaKey || event.ctrlKey;
  if (!isMeta) return null;

  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) return "undo";
  if ((key === "z" && event.shiftKey) || key === "y") return "redo";
  return null;
}
