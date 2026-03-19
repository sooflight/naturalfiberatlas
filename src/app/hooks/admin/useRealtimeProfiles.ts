import { useCallback, useState } from "react";

interface Profile {
  profile_id: string;
  atlas_node_id: string | null;
  era: string | null;
  origins: string | null;
  scientific_name: string | null;
  revision: string;
  updated_at: string;
}

interface UseRealtimeProfilesOptions {
  enabled?: boolean;
  onInsert?: (profile: Profile) => void;
  onUpdate?: (profile: Profile) => void;
  onDelete?: (profileId: string) => void;
}

/**
 * Hook to subscribe to real-time profile changes
 * Useful for admin dashboard to see live updates
 */
export function useRealtimeProfiles(options: UseRealtimeProfilesOptions = {}) {
  const { enabled = true } = options;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);
  const [subscriptionStatus] = useState<string>(enabled ? "disabled" : "off");

  // Initial fetch of profiles
  const fetchProfiles = useCallback(async () => {
    setProfiles([]);
  }, []);

  return {
    profiles,
    loading,
    error,
    subscriptionStatus,
    refresh: fetchProfiles,
  };
}

/**
 * Hook to subscribe to a single profile's changes
 */
export function useRealtimeProfile(profileId: string | undefined) {
  return { profile: null as Profile | null, loading: !!profileId, error: null as Error | null };
}
