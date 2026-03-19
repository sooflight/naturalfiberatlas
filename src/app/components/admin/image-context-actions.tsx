import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUp, Copy, Link2, Replace, type LucideIcon } from "lucide-react";

interface ActionButtonProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void | Promise<void>;
  tone?: "default" | "accent";
}

function ActionButton({ title, icon: Icon, onClick, tone = "default" }: ActionButtonProps) {
  const cls =
    tone === "accent"
      ? "p-1 rounded bg-black/40 text-blue-400/60 hover:text-blue-400 transition-colors cursor-pointer"
      : "p-1 rounded bg-black/40 text-white/50 hover:text-white/90 transition-colors cursor-pointer";

  return (
    <button onClick={onClick} className={cls} title={title}>
      <Icon size={12} />
    </button>
  );
}

interface ImageContextActionsProps {
  url: string;
  onPromoteHero: () => void;
  onSendFront: () => void;
  onSendBack: () => void;
  onReplaceUrl: (nextUrl: string) => void;
  onCopyUrl?: () => void;
}

export function ImageContextActions({
  url,
  onPromoteHero,
  onSendFront,
  onSendBack,
  onReplaceUrl,
  onCopyUrl,
}: ImageContextActionsProps) {
  const [replacing, setReplacing] = useState(false);
  const [value, setValue] = useState(url);

  return (
    <div className="flex items-center gap-1">
      <ActionButton title="Promote hero" icon={ChevronsUp} onClick={onPromoteHero} tone="accent" />
      <ActionButton title="Send to front" icon={ArrowUp} onClick={onSendFront} />
      <ActionButton title="Send to back" icon={ArrowDown} onClick={onSendBack} />
      <ActionButton
        title="Copy image URL"
        icon={Link2}
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          onCopyUrl?.();
        }}
      />
      <ActionButton
        title="Replace URL from clipboard"
        icon={Replace}
        onClick={async () => {
          const next = (await navigator.clipboard.readText()).trim();
          if (!next || !/^https?:\/\//i.test(next)) return;
          setValue(next);
          onReplaceUrl(next);
        }}
      />
      <ActionButton
        title={replacing ? "Apply URL" : "Quick replace URL"}
        icon={Copy}
        onClick={() => {
          if (!replacing) {
            setReplacing(true);
            return;
          }
          const next = value.trim();
          if (!next || !/^https?:\/\//i.test(next)) return;
          onReplaceUrl(next);
          setReplacing(false);
        }}
      />
      {replacing && (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="ml-1 w-40 px-1.5 py-0.5 rounded bg-black/50 border border-white/[0.16] text-white/80 focus:outline-none"
          style={{ fontSize: "10px" }}
          placeholder="https://..."
        />
      )}
    </div>
  );
}

