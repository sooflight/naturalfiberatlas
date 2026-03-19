import type { ContentItem } from '../../../types/content';

export interface ViewProps {
  items: ContentItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}
