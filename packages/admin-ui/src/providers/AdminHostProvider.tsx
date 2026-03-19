import { createContext, useEffect, type ReactNode } from "react";
import type { AdminHostConfig } from "../contracts/AdminHostConfig";

export const AdminHostContext = createContext<AdminHostConfig | null>(null);

interface AdminHostProviderProps {
  config: AdminHostConfig;
  children: ReactNode;
}

export function AdminHostProvider({ config, children }: AdminHostProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as { __NFA_ADMIN_HOST_CONFIG?: AdminHostConfig }).__NFA_ADMIN_HOST_CONFIG = config;
    return () => {
      delete (window as unknown as { __NFA_ADMIN_HOST_CONFIG?: AdminHostConfig }).__NFA_ADMIN_HOST_CONFIG;
    };
  }, [config]);

  return (
    <AdminHostContext.Provider value={config}>{children}</AdminHostContext.Provider>
  );
}
