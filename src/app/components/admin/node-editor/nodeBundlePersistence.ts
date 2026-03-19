import type { NodeData } from "@/hooks/useNodeData";
import type { EditorState } from "./PlateEditor";
import { revertNodeBundle, saveNodeBundle } from "@/utils/nodeSaveTransaction";
import { toAtlasPatch, saveConflictMessage } from "./nodeBundleState";

interface SaveNodeBundleEditorArgs {
  nodeId: string;
  editorState: EditorState;
  kvLoadFailed?: boolean;
  revisionRef: { current: string | null };
  initialRef: { current: string | null };
  seedNode: (nodeId: string, nodeData: NodeData) => Promise<void>;
}

interface SaveNodeBundleEditorResult {
  ok: boolean;
  persistedTargets: string[];
  failedTargets: string[];
  nextRevision: string | null;
}

export async function saveNodeBundleEditor({
  nodeId,
  editorState,
  kvLoadFailed,
  revisionRef,
  initialRef,
  seedNode,
}: SaveNodeBundleEditorArgs): Promise<SaveNodeBundleEditorResult> {
  if (!editorState || !nodeId || kvLoadFailed) {
    return { ok: false, persistedTargets: [], failedTargets: ["invalid-save-state"], nextRevision: revisionRef.current };
  }

  const persistedTargets: string[] = [];
  const failedTargets: string[] = [];
  let bundleCommitted = false;

  const recordFailure = (scope: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    failedTargets.push(`${scope}: ${message}`);
  };

  try {
    const result = await saveNodeBundle({
      nodeId,
      expectedRevision: revisionRef.current,
      passport: editorState.passport as Record<string, unknown>,
      atlasPatch: toAtlasPatch(editorState),
      injectFailure: typeof window !== "undefined" ? window.localStorage.getItem("atlas:inject-bundle-fail") : null,
    });
    if (!result.ok) {
      const conflictMessage = saveConflictMessage(result.status);
      if (conflictMessage) {
        revisionRef.current = result.currentRevision || null;
        throw new Error(conflictMessage);
      }
      if (result.summary?.committed?.length) persistedTargets.push(...result.summary.committed);
      if (result.summary?.failed?.length) failedTargets.push(...result.summary.failed);
      if (result.summary?.rollback?.attempted && result.summary.rollback.succeeded === false) {
        failedTargets.push("rollback: failed");
      }
      throw new Error(result.error || `HTTP ${result.status}`);
    }

    if (result.revision) revisionRef.current = result.revision;
    persistedTargets.push(...(result.summary?.committed || ["atlas-data", "passport"]));
    bundleCommitted = true;
  } catch (error: unknown) {
    recordFailure("bundle", error);
  }

  try {
    if (failedTargets.length > 0) throw new Error("Skipped because bundle save failed");
    if (typeof window !== "undefined" && window.localStorage.getItem("atlas:inject-kv-fail") === "1") {
      throw new Error("Injected KV failure");
    }
    const nd = editorState.nodeData as NodeData;
    if (nd.name || nd.summary) {
      await seedNode(nodeId, nd);
    }
    persistedTargets.push("kv-node");
  } catch (error: unknown) {
    recordFailure("kv-node", error);
    if (bundleCommitted && initialRef.current) {
      try {
        const prev = JSON.parse(initialRef.current) as EditorState;
        const rollbackResult = await revertNodeBundle({
          nodeId,
          passport: prev.passport as Record<string, unknown>,
          atlasPatch: toAtlasPatch(prev),
        });
        if (!rollbackResult.ok) throw new Error(rollbackResult.error || `HTTP ${rollbackResult.status}`);
        failedTargets.push("rollback: restored previous bundle state");
      } catch (rollbackError: unknown) {
        const message = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        failedTargets.push(`rollback: failed (${message})`);
      }
    }
  }

  return {
    ok: failedTargets.length === 0,
    persistedTargets,
    failedTargets,
    nextRevision: revisionRef.current,
  };
}
