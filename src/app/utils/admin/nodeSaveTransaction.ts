import { adminRoute, authenticatedFetch } from "@/utils/adminRoutes";

export interface SaveSummary {
  committed?: string[];
  failed?: string[];
  rollback?: { attempted?: boolean; succeeded?: boolean };
}

export interface SaveBundleResult {
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
  revision?: string;
  currentRevision?: string;
  summary?: SaveSummary;
}

interface SaveBundleInput {
  nodeId: string;
  expectedRevision?: string | null;
  passport: Record<string, unknown>;
  atlasPatch: Record<string, unknown>;
  injectFailure?: string | null;
}

async function postJson(path: string, payload: unknown) {
  const response = await authenticatedFetch(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({} as Record<string, unknown>));
  return { response, body };
}

export async function fetchNodeRevision(nodeId: string): Promise<string | null> {
  const path = adminRoute(`/__admin/read-node-revision?nodeId=${encodeURIComponent(nodeId)}`);
  const res = await authenticatedFetch(path);
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({} as { revision?: string }))) as {
    revision?: string;
  };
  return body.revision ?? null;
}

export async function saveNodeBundle(input: SaveBundleInput): Promise<SaveBundleResult> {
  const { response, body } = await postJson(adminRoute("/__admin/save-node-bundle"), input);
  return {
    ok: response.ok,
    status: response.status,
    error: typeof body.error === "string" ? body.error : undefined,
    code: typeof body.code === "string" ? body.code : undefined,
    revision: typeof body.revision === "string" ? body.revision : undefined,
    currentRevision: typeof body.currentRevision === "string" ? body.currentRevision : undefined,
    summary: typeof body.summary === "object" && body.summary ? (body.summary as SaveSummary) : undefined,
  };
}

export async function revertNodeBundle(input: {
  nodeId: string;
  passport: Record<string, unknown>;
  atlasPatch: Record<string, unknown>;
}) {
  const { response, body } = await postJson(adminRoute("/__admin/revert-node-bundle"), input);
  return {
    ok: response.ok,
    status: response.status,
    error: typeof body.error === "string" ? body.error : undefined,
    summary: typeof body.summary === "object" && body.summary ? (body.summary as SaveSummary) : undefined,
  };
}
