import { useCallback, useEffect, useRef, useState } from "react";
import { useNodeData } from "@/hooks/useNodeData";
import { MATERIAL_PASSPORTS } from "@/data/material-passports";
import {
  ATLAS_EMBEDS,
  ATLAS_IMAGES,
  ATLAS_LINKS,
  ATLAS_TAGS,
  ATLAS_VIDEOS,
  PROFILE_ERA,
  PROFILE_ORIGINS,
  SCIENTIFIC_NAMES,
} from "@/data/atlas-images";
import { seedNodes, type NodeData } from "@/hooks/useNodeData";
import { fetchNodeRevision, saveNodeBundle } from "@/utils/nodeSaveTransaction";

export interface CardEditorDraft {
  loading: boolean;
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  nodeData: Record<string, any>;
  passport: Record<string, any>;
  save: () => Promise<void>;
  getField: (source: string, key: string) => any;
  updateField: (source: string, key: string, value: any) => void;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function getIn(source: Record<string, any> | null | undefined, path: string) {
  if (!source) return undefined;
  return path.split(".").reduce<any>((acc, part) => (acc == null ? undefined : acc[part]), source);
}

function setIn(source: Record<string, any>, path: string, value: unknown) {
  const parts = path.split(".");
  let cursor: Record<string, any> = source;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = cursor[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function toAtlasPatch(nodeId: string, nodeData: Record<string, any>) {
  return {
    images: ATLAS_IMAGES[nodeId] ?? [],
    tags: ATLAS_TAGS[nodeId] ?? [],
    era: PROFILE_ERA[nodeId] ?? "",
    origins: PROFILE_ORIGINS[nodeId] ?? "",
    scientificName: nodeData.scientificName ?? SCIENTIFIC_NAMES[nodeId] ?? "",
    videos: ATLAS_VIDEOS[nodeId] ?? [],
    embeds: ATLAS_EMBEDS[nodeId] ?? [],
    links: ATLAS_LINKS[nodeId] ?? [],
  };
}

export function useCardEditorDraft(nodeId: string): CardEditorDraft {
  const { data, loading } = useNodeData(nodeId);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dirty, setDirty] = useState(false);
  const [nodeDraft, setNodeDraft] = useState<Record<string, any>>({ id: nodeId, name: nodeId });
  const [passportDraft, setPassportDraft] = useState<Record<string, any>>({ materialId: nodeId });
  const initialSnapshot = useRef<string>("");
  const revisionRef = useRef<string | null>(null);

  useEffect(() => {
    const baseNode = cloneValue((data as Record<string, any>) ?? { id: nodeId, name: nodeId });
    const basePassport = cloneValue((MATERIAL_PASSPORTS as Record<string, any>)[nodeId] ?? { materialId: nodeId });
    setNodeDraft(baseNode);
    setPassportDraft(basePassport);
    initialSnapshot.current = JSON.stringify({ nodeData: baseNode, passport: basePassport });
    setDirty(false);
    setSaveStatus("idle");
  }, [data, nodeId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const revision = await fetchNodeRevision(nodeId);
      if (mounted) revisionRef.current = revision;
    })();
    return () => {
      mounted = false;
    };
  }, [nodeId]);

  const updateField = useCallback((source: string, key: string, value: any) => {
    if (source === "passport") {
      setPassportDraft((prev) => {
        const next = cloneValue(prev);
        setIn(next, key, value);
        return next;
      });
    } else {
      setNodeDraft((prev) => {
        const next = cloneValue(prev);
        setIn(next, key, value);
        return next;
      });
    }
    setDirty(true);
    setSaveStatus("idle");
  }, []);

  const getField = useCallback((source: string, key: string) => {
    if (source === "passport") return getIn(passportDraft, key);
    return getIn(nodeDraft, key);
  }, [nodeDraft, passportDraft]);

  const save = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const bundleResult = await saveNodeBundle({
        nodeId,
        expectedRevision: revisionRef.current,
        passport: passportDraft,
        atlasPatch: toAtlasPatch(nodeId, nodeDraft),
      });
      if (!bundleResult.ok) {
        if (bundleResult.status === 409) {
          revisionRef.current = bundleResult.currentRevision || null;
        }
        throw new Error(bundleResult.error || `HTTP ${bundleResult.status}`);
      }
      if (bundleResult.revision) revisionRef.current = bundleResult.revision;
      await seedNodes({ [`node:${nodeId}`]: nodeDraft as NodeData });

      setDirty(false);
      setSaveStatus("saved");
      initialSnapshot.current = JSON.stringify({ nodeData: nodeDraft, passport: passportDraft });
    } catch {
      setSaveStatus("error");
    }
  }, [nodeDraft, nodeId, passportDraft]);

  useEffect(() => {
    const snapshot = JSON.stringify({ nodeData: nodeDraft, passport: passportDraft });
    if (!initialSnapshot.current) return;
    setDirty(snapshot !== initialSnapshot.current);
  }, [nodeDraft, passportDraft]);

  return {
    loading,
    isDirty: dirty,
    saveStatus,
    nodeData: nodeDraft,
    passport: passportDraft,
    save,
    getField,
    updateField,
  };
}
