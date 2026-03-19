import type { ContentItem } from '../../../types/content';
import { useRef, useState } from 'react';
import { LazyImage } from './components/LazyImage';
import type { ViewProps } from './types';
import { ProfileStatusCircle } from '../ProfileStatusCircle';

type GridViewProps = ViewProps;
type GridViewZoomProps = GridViewProps & { zoomScale?: number };

// Compact tile component adapted from ImageDatabaseManager's CompactProfileTile
interface CompactTileProps {
  item: ContentItem;
  isSelected: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  draggable?: boolean;
  onClick: () => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onToggleStatus?: (id: string) => void;
  statusSaving?: boolean;
  statusError?: string | null;
}

function CompactTile({
  item,
  isSelected,
  isDragging = false,
  isDropTarget = false,
  draggable = false,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggleSelect,
  onToggleStatus,
  statusSaving = false,
  statusError,
}: CompactTileProps) {
  const previewUrl = item.heroImage?.url;

  return (
    <div
      data-testid="compact-profile-tile"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group relative rounded-xl overflow-hidden border transition-all aspect-[5/7] flex flex-col ${
        isSelected
          ? 'border-blue-400/50 ring-1 ring-blue-400/35 bg-blue-500/[0.03]'
          : 'border-white/[0.08] hover:border-white/[0.2] bg-white/[0.02]'
      } ${isDragging ? 'opacity-55' : ''} ${isDropTarget ? 'ring-2 ring-blue-300/60' : ''}`}
      style={{ aspectRatio: '5 / 7' }}
    >
      <div className="relative flex-1 min-h-0">
        {previewUrl ? (
          <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onClick();
            }}
            className="block w-full h-full"
            title={`Open ${item.id} preview`}
          >
            <LazyImage
              src={previewUrl}
              alt={`${item.id} preview`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              draggable={false}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs bg-black/30">
            No image
          </div>
        )}

        {/* Selection checkbox */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <button
            role="checkbox"
            aria-checked={isSelected}
            aria-label={isSelected ? 'Deselect item' : 'Select item'}
            onClick={onToggleSelect}
            className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] transition-colors ${
              isSelected
                ? 'border-blue-300/80 bg-blue-400/20 text-blue-100'
                : 'border-white/35 bg-black/25 text-transparent hover:text-white/70'
            }`}
          >
            ✓
          </button>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <ProfileStatusCircle
            status={item.status}
            onToggle={() => onToggleStatus?.(item.id)}
            disabled={statusSaving || !onToggleStatus}
            dataTestId={`grid-status-circle-${item.id}`}
          />
        </div>
      </div>

      <div className="basis-[27%] shrink-0 p-2.5 md:p-3 space-y-1.5 overflow-hidden">
        <div className="min-w-0">
          <h4 className="truncate text-white/95 text-[11px] font-semibold">
            {item.id}
          </h4>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {item.imageCount} image{item.imageCount === 1 ? '' : 's'}
          </p>
        </div>
        {statusError ? (
          <p className="text-[10px] text-red-300 truncate" role="alert">
            {statusError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function GridView({
  items,
  selectedId,
  onSelect,
  zoomScale = 1,
  onReorder,
  onToggleStatus,
  statusSavingById,
  statusErrorById,
}: GridViewZoomProps & {
  onReorder?: (draggedId: string, targetId: string) => void;
  onToggleStatus?: (id: string) => void;
  statusSavingById?: Record<string, boolean>;
  statusErrorById?: Record<string, string>;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleDragStart = (id: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!onReorder) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    draggedIdRef.current = id;
    setDraggedId(id);
    setDropTargetId(null);
  };

  const handleDragOver = (id: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!onReorder) return;
    event.preventDefault();
    if (draggedId && draggedId !== id) {
      setDropTargetId(id);
    }
  };

  const handleDrop = (targetId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!onReorder) return;
    event.preventDefault();
    const sourceId = draggedIdRef.current || event.dataTransfer.getData('text/plain') || draggedId;
    if (sourceId && sourceId !== targetId) {
      onReorder(sourceId, targetId);
    }
    draggedIdRef.current = null;
    setDraggedId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDropTargetId(null);
  };

  const tileMinWidth = Math.max(140, Math.min(360, Math.round(190 * zoomScale)));

  return (
    <div
      data-testid="grid-view"
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tileMinWidth}px, 1fr))` }}
    >
      {items.map(item => (
        <CompactTile
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          isDragging={draggedId === item.id}
          isDropTarget={dropTargetId === item.id}
          draggable={!!onReorder}
          onClick={() => onSelect(item.id)}
          onDragStart={(event) => handleDragStart(item.id, event)}
          onDragEnd={handleDragEnd}
          onDragOver={(event) => handleDragOver(item.id, event)}
          onDrop={(event) => handleDrop(item.id, event)}
          onToggleSelect={(e) => handleToggleSelect(e, item.id)}
          onToggleStatus={onToggleStatus}
          statusSaving={statusSavingById?.[item.id] === true}
          statusError={statusErrorById?.[item.id] ?? null}
        />
      ))}
    </div>
  );
}
