/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { AdminHostProvider } from "./AdminHostProvider";
import { useAdminHost } from "../hooks/useAdminHost";
import type { AdminHostConfig } from "../contracts/AdminHostConfig";

describe("AdminHostProvider", () => {
  it("throws when hook is used without provider", () => {
    expect(() => renderHook(() => useAdminHost())).toThrowError(
      "useAdminHost must be used within AdminHostProvider",
    );
  });

  it("returns provided host config", async () => {
    const config: AdminHostConfig = {
      auth: {
        getAccessToken: () => "token-123",
      },
      runtime: {
        apiBaseUrl: "/api/admin",
      },
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AdminHostProvider config={config}>{children}</AdminHostProvider>
    );

    const { result } = renderHook(() => useAdminHost(), { wrapper });
    const token = await result.current.auth.getAccessToken();

    expect(token).toBe("token-123");
    expect(result.current.runtime?.apiBaseUrl).toBe("/api/admin");
  });
});
