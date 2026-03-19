import { createContext, useContext, useMemo, useState } from "react";

type NavFilterContextValue = {
  committedPath: string[];
  hoverPath: string[];
  isHovering: boolean;
  searchQuery: string;
  setCommittedPath: (path: string[]) => void;
  setHoverPath: (path: string[]) => void;
  setIsHovering: (hovering: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearFilter: () => void;
};

const NavFilterContext = createContext<NavFilterContextValue | null>(null);

export function NavFilterProvider({ children }: { children: React.ReactNode }) {
  const [committedPath, setCommittedPath] = useState<string[]>([]);
  const [hoverPath, setHoverPath] = useState<string[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const clearFilter = () => {
    setCommittedPath([]);
    setHoverPath([]);
    setIsHovering(false);
    setSearchQuery("");
  };

  const value = useMemo<NavFilterContextValue>(
    () => ({
      committedPath,
      hoverPath,
      isHovering,
      searchQuery,
      setCommittedPath,
      setHoverPath,
      setIsHovering,
      setSearchQuery,
      clearFilter,
    }),
    [committedPath, hoverPath, isHovering, searchQuery],
  );

  return <NavFilterContext.Provider value={value}>{children}</NavFilterContext.Provider>;
}

export function useNavFilter() {
  const ctx = useContext(NavFilterContext);
  if (!ctx) {
    throw new Error("useNavFilter must be used within NavFilterProvider");
  }
  return ctx;
}
