import { useContext } from "react";
import { AdminHostContext } from "../providers/AdminHostProvider";

export function useAdminHost() {
  const context = useContext(AdminHostContext);
  if (!context) {
    throw new Error("useAdminHost must be used within AdminHostProvider");
  }
  return context;
}
