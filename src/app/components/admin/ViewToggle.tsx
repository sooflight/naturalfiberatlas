import { Grid3X3, IdCard, Brain } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewMode } from '../database-interface/commands/types';

interface ViewToggleProps {
  currentView: ViewMode;
  onChange: (view: ViewMode) => void;
}

const views: { id: ViewMode; label: string; icon: LucideIcon; shortcut: string }[] = [
  { id: 'list', label: 'ImageBase', icon: IdCard, shortcut: '⌘1' },
  { id: 'grid', label: 'Grid', icon: Grid3X3, shortcut: '⌘2' },
  { id: 'knowledge', label: 'Knowledge', icon: Brain, shortcut: '⌘3' },
];

export function ViewToggle({ currentView, onChange }: ViewToggleProps) {
  return (
    <div 
      className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]"
      role="radiogroup"
      aria-label="View mode"
    >
      {views.map(({ id, label, icon: Icon, shortcut }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          data-active={currentView === id}
          data-view={id}
          role="radio"
          aria-checked={currentView === id}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
            transition-all duration-200
            ${currentView === id 
              ? 'bg-white/10 text-white shadow-sm' 
              : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }
          `}
          title={`${label} (${shortcut})`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="hidden md:inline text-white/30 text-[10px]">{shortcut}</span>
        </button>
      ))}
    </div>
  );
}
