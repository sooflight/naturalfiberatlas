import type { ContentStatus } from "@/types/material";
import { adminRoute, authenticatedFetch } from "@/utils/adminRoutes";

export type AdminStatusEntity = "passport" | "supplier" | "evidence";

export interface AdminStatusMutationInput {
  type: AdminStatusEntity;
  id: string;
  status: ContentStatus;
}

function resolveMutationTarget(input: AdminStatusMutationInput): {
  endpoint: string;
  payload: Record<string, string>;
} {
  if (input.type === "passport") {
    return {
      endpoint: "/__admin/update-passport-status",
      payload: { materialId: input.id, status: input.status },
    };
  }
  if (input.type === "supplier") {
    return {
      endpoint: "/__admin/update-supplier-status",
      payload: { supplierId: input.id, status: input.status },
    };
  }
  return {
    endpoint: "/__admin/update-evidence-status",
    payload: { evidenceId: input.id, status: input.status },
  };
}

export async function mutateAdminStatus(input: AdminStatusMutationInput) {
  const target = resolveMutationTarget(input);
  const response = await authenticatedFetch(adminRoute(target.endpoint), {
    method: "POST",
    body: JSON.stringify(target.payload),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response;
}

export async function readVerificationQueuePayload() {
  const response = await authenticatedFetch(adminRoute("/__admin/read-verification-queue"));
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<{
    passports?: Record<string, unknown>;
    suppliers?: Record<string, unknown>;
    evidence?: Record<string, unknown>;
  }>;
}
