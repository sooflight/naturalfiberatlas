export interface OpenRouterImportResult {
  normalizedJson: string;
  model: string;
}

interface OpenRouterProxySuccess {
  ok: true;
  model: string;
  data: Record<string, unknown>;
}

export async function parseImportWithOpenRouter(
  rawInput: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenRouterImportResult> {
  const response = await fetchImpl("/dev-api/openrouter/parse-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: rawInput }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter parse request failed (${response.status})${details ? `: ${details}` : ""}`,
    );
  }

  const payload = (await response.json()) as Partial<OpenRouterProxySuccess>;
  if (!payload || payload.ok !== true || typeof payload.model !== "string" || !payload.data || typeof payload.data !== "object") {
    throw new Error("OpenRouter proxy returned an invalid payload");
  }

  return {
    normalizedJson: JSON.stringify(payload.data, null, 2),
    model: payload.model,
  };
}
