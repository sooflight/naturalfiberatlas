const LEGACY_PROFILE_ID_ALIASES: Record<string, string> = {
  "coir-coconut": "coir",
  "lyocell-tencel": "lyocell",
  "pineapple-pina": "pineapple",
  cotton: "organic-cotton",
};

const REVERSE_PROFILE_ID_ALIASES: Record<string, string[]> = Object.entries(
  LEGACY_PROFILE_ID_ALIASES,
).reduce<Record<string, string[]>>((acc, [legacyId, canonicalId]) => {
  const existing = acc[canonicalId] ?? [];
  existing.push(legacyId);
  acc[canonicalId] = existing;
  return acc;
}, {});

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

export function getProfileImageCandidateIds(profileId: string): string[] {
  const canonical = LEGACY_PROFILE_ID_ALIASES[profileId];
  const reverse = REVERSE_PROFILE_ID_ALIASES[profileId] ?? [];
  return unique([profileId, canonical ?? "", ...reverse]);
}

export interface ProfileImageFetchPlan {
  requestedIds: string[];
  candidateIdsByRequestedId: Record<string, string[]>;
  requestIds: string[];
}

export function buildProfileImageFetchPlan(requestedIds: string[]): ProfileImageFetchPlan {
  const candidateIdsByRequestedId: Record<string, string[]> = {};

  for (const requestedId of requestedIds) {
    candidateIdsByRequestedId[requestedId] = getProfileImageCandidateIds(requestedId);
  }

  const requestIds = unique(
    requestedIds.flatMap((requestedId) => candidateIdsByRequestedId[requestedId] ?? []),
  );

  return { requestedIds: [...requestedIds], candidateIdsByRequestedId, requestIds };
}

export function resolveFetchedImagesForRequestedIds(
  requestedIds: string[],
  fetchedById: Record<string, string[]>,
): Record<string, string[]> {
  const resolved: Record<string, string[]> = {};

  for (const requestedId of requestedIds) {
    const candidates = getProfileImageCandidateIds(requestedId);
    const match = candidates.find((candidateId) => (fetchedById[candidateId] ?? []).length > 0);
    if (!match) continue;
    resolved[requestedId] = fetchedById[match];
  }

  return resolved;
}
