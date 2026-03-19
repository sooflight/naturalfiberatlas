import { useMemo } from "react";
import { useMaterialPassportDb } from "@/hooks/useMaterialPassportDb";
import { useUnifiedNodeData } from "@/hooks/useUnifiedNodeData";
import type { NodeData } from "@/hooks/useNodeData";
import { useRealtimeProfiles } from "@/hooks/useRealtimeProfiles";
import { useProfileImagesDb } from "@/hooks/useProfileImagesDb";
import type { RecordDetails } from "@/database-interface/domains/records/types";

interface UseProfilesOptions {
  nodeId?: string;
  realtime?: boolean;
  includeMedia?: boolean;
}

export interface UnifiedProfile {
  id: string;
  node: NodeData | null;
  passport: Record<string, unknown> | null;
  status: string;
  aliases: string[];
  images: string[];
  loading: boolean;
  error: string | null;
}

export function useProfiles(options: UseProfilesOptions = {}) {
  const { nodeId, realtime = true, includeMedia = false } = options;
  const node = useUnifiedNodeData(nodeId);
  const passport = useMaterialPassportDb(nodeId);
  const liveProfiles = useRealtimeProfiles({ enabled: realtime });
  
  // Conditionally fetch media if nodeId is provided
  const mediaRequests = useMemo(() => 
    nodeId ? [{ id: nodeId, label: node.node?.name || nodeId, sectionId: "" }] : [],
    [nodeId, node.node?.name]
  );
  const media = useProfileImagesDb(includeMedia ? mediaRequests : []);

  const details = useMemo<RecordDetails>(
    () => ({
      node: node.node,
      passport: passport.passport as Record<string, unknown> | null,
      status: passport.status,
      aliases: passport.aliases as string[],
    }),
    [node.node, passport.aliases, passport.passport, passport.status]
  );

  const unifiedProfile = useMemo<UnifiedProfile>(() => ({
    id: nodeId ?? "",
    node: node.node,
    passport: passport.passport as Record<string, unknown> | null,
    status: passport.status,
    aliases: passport.aliases as string[],
    images: nodeId ? (media.images[nodeId] ?? []) : [],
    loading: node.loading || passport.loading || (includeMedia && media.loading),
    error: node.error?.message ?? passport.error?.message ?? null,
  }), [nodeId, node.node, node.loading, node.error, passport.passport, passport.status, passport.aliases, passport.loading, passport.error, media.images, media.loading, includeMedia]);

  return {
    details,
    unifiedProfile,
    loading: node.loading || passport.loading || (includeMedia && media.loading),
    error: node.error?.message ?? passport.error?.message ?? null,
    profiles: liveProfiles.profiles,
    realtimeStatus: liveProfiles.subscriptionStatus,
    refreshProfiles: liveProfiles.refresh,
  };
}
