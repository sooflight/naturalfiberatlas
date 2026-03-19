// AI Content Generation — provider abstraction, key management, prompt builders

import { authenticatedFetch } from "./adminRoutes";

export type AiProvider = "openai" | "claude" | "gemini" | "openrouter" | "ollama";

export interface AiApiKeys {
  openai: string;
  claude: string;
  gemini: string;
  openrouter: string;
  ollama: string;
}

export interface AiGenerateResult {
  content: string;
  model: string;
  provider: string;
  usage: { input: number; output: number };
}

export interface AiProviderMeta {
  id: AiProvider;
  label: string;
  defaultModel: string;
  models: string[];
  configUrl: string;
  description: string;
  keyRequired?: boolean;
}

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: "openai",
    label: "ChatGPT",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    configUrl: "https://platform.openai.com/api-keys",
    description: "OpenAI — broad knowledge, strong structured output",
  },
  {
    id: "claude",
    label: "Claude",
    defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
    configUrl: "https://console.anthropic.com/settings/keys",
    description: "Anthropic — precise, follows instructions closely",
  },
  {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"],
    configUrl: "https://aistudio.google.com/apikey",
    description: "Google — fast, multilingual, large context window",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openai/gpt-4o-mini",
    models: [
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.5-flash",
    ],
    configUrl: "https://openrouter.ai/keys",
    description: "OpenRouter — unified model gateway with provider fallback",
  },
  {
    id: "ollama",
    label: "Ollama",
    defaultModel: "llama3.1",
    models: [],
    configUrl: "https://ollama.com/download",
    description: "Local models — private, no API costs, requires Ollama running",
    keyRequired: false,
  },
];

const STORAGE_KEY = "atlas-ai-api-keys";

export function loadAiKeys(): AiApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        openai: parsed.openai || "",
        claude: parsed.claude || "",
        gemini: parsed.gemini || "",
        openrouter: parsed.openrouter || "",
        ollama: parsed.ollama || "http://localhost:11434",
      };
    }
  } catch { /* ignore */ }
  return { openai: "", claude: "", gemini: "", openrouter: "", ollama: "http://localhost:11434" };
}

export function saveAiKeys(keys: AiApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getConfiguredProviders(keys: AiApiKeys): AiProviderMeta[] {
  return AI_PROVIDERS.filter((p) => p.keyRequired === false || !!keys[p.id]);
}

export const OLLAMA_STORAGE_MODELS_KEY = "atlas-ollama-models";

export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const res = await authenticatedFetch("/__admin/ollama-models", {
      method: "POST",
      body: JSON.stringify({ baseUrl }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []) as string[];
  } catch {
    return [];
  }
}

// ── Generate call ──

export async function generate(
  provider: AiProvider,
  apiKey: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<AiGenerateResult> {
  const payload: Record<string, unknown> = {
    provider,
    apiKey,
    messages,
    model: opts?.model,
    temperature: opts?.temperature ?? 0.7,
    maxTokens: opts?.maxTokens ?? 4096,
  };
  if (provider === "ollama") {
    payload.baseUrl = apiKey || "http://localhost:11434";
    payload.apiKey = "_ollama_";
  }
  const res = await authenticatedFetch("/__admin/ai-generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((errBody as { error?: string }).error || `AI generation failed (${res.status})`);
  }
  return res.json();
}

// ── Prompt Builders ──

const SYSTEM_PREAMBLE = `You are an expert researcher specializing in natural fibers, textiles, dyes, and sustainable materials.
You produce accurate, well-sourced data for the Natural Fiber Atlas — a comprehensive encyclopedia.
Respond ONLY with valid JSON (no markdown fences, no commentary). Every string value should be informative and well-written.`;

const NODE_DATA_SCHEMA = `{
  "name": "string — common name",
  "tagline": "string — one-sentence description",
  "summary": "string — 2-3 paragraph overview (markdown OK)",
  "type": "string — fiber | textile | dye | technique",
  "category": "string — e.g. plant-cellulose, animal-protein",
  "subcategory": "string — e.g. bast-fibers, leaf-fibers",
  "portal": "string — top-level portal: fiber, textile, dyes",
  "culturalSignificance": "string — cultural/historical context",
  "processing": ["string — ordered processing steps"],
  "applications": ["string — common applications"],
  "properties": { "key": "value — physical/chemical properties" },
  "environmental": { "key": "value — environmental impact data" },
  "dyeCompatibility": { "dyeType": "compatibility notes" },
  "varieties": [{ "name": "string", "traits": "string", "uses": "string" }],
  "crossReferences": { "category": ["related-node-ids"] }
}`;

const PASSPORT_SCHEMA = `{
  "performance": {
    "strength": { "rating": 1-5, "label": "Low|Moderate|High|Very High|Exceptional", "confidence": "verified|estimated|unverified" },
    "breathability": { "rating": 1-5, "label": "...", "confidence": "..." },
    "drape": { ... }, "absorbency": { ... }, "thermalRegulation": { ... },
    "durability": { ... }, "elasticity": { ... }, "uvResistance": { ... }, "moistureWicking": { ... }
  },
  "process": {
    "spinning": { "value": "excellent|good|fair|poor|not-applicable", "confidence": "..." },
    "weaving": { ... }, "knitting": { ... }, "finishing": { ... },
    "blending": { "value": "string description", "confidence": "..." }
  },
  "dyeing": {
    "compatibility": { "value": "excellent|good|fair|poor", "confidence": "..." },
    "fastness": { ... }, "naturalDyeAffinity": { "value": "high|moderate|low", "confidence": "..." },
    "recommendedMethods": { "value": ["string array of methods"], "confidence": "..." },
    "notes": "string"
  },
  "sustainability": {
    "waterUsage": { "rating": 1-5, "label": "...", "confidence": "..." },
    "carbonFootprint": { ... }, "chemicalProcessing": { ... }, "circularity": { ... },
    "biodegradable": { "value": true|false, "confidence": "..." },
    "recyclable": { "value": true|false, "confidence": "..." },
    "certifications": { "value": ["GOTS", "OEKO-TEX", ...], "confidence": "..." }
  },
  "sourcing": {
    "primaryRegions": { "value": ["string regions"], "confidence": "..." },
    "seasonality": { "value": "string", "confidence": "..." },
    "priceRange": { "value": "low|moderate|high|premium", "confidence": "..." },
    "typicalMOQ": "string", "leadTime": "string"
  },
  "endUse": {
    "apparel": { "value": true|false, "confidence": "..." },
    "interiors": { ... }, "technical": { ... }, "accessories": { ... }, "industrial": { ... },
    "bestFor": ["string"]
  }
}`;

export type SectionId =
  | "identity" | "origin" | "fiber" | "processing"
  | "dyeColor" | "sustainability" | "source" | "connections";

const SECTION_SCHEMAS: Record<SectionId, string> = {
  identity: `Generate: name, tagline, type, category, subcategory, portal. Also suggest tags (string array) and a scientificName if applicable.`,
  origin: `Generate: summary (2-3 paragraphs), culturalSignificance, and sourcing.primaryRegions, sourcing.seasonality, sourcing.priceRange from the passport schema.`,
  fiber: `Generate all performance ratings (strength, breathability, drape, absorbency, thermalRegulation, durability, elasticity, uvResistance, moistureWicking) with rating 1-5, label, and confidence. Also generate properties as key-value pairs.`,
  processing: `Generate process compatibility (spinning, weaving, knitting, finishing, blending) from passport schema, plus processing steps as an ordered string array.`,
  dyeColor: `Generate dyeing data (compatibility, fastness, naturalDyeAffinity, recommendedMethods, notes) from the passport schema, plus dyeCompatibility key-value pairs.`,
  sustainability: `Generate sustainability data (waterUsage, carbonFootprint, chemicalProcessing, circularity ratings, biodegradable, recyclable booleans, certifications) from the passport schema, plus environmental key-value pairs.`,
  source: `Generate sourcing data (typicalMOQ, leadTime) and endUse toggles (apparel, interiors, technical, accessories, industrial, bestFor) from the passport schema.`,
  connections: `Generate crossReferences (category → related node IDs), applications list, and varieties array.`,
};

export function buildFullNodePrompt(
  nodeId: string,
  existingData?: { nodeData?: any; passport?: any },
): { role: "system" | "user"; content: string }[] {
  const system = `${SYSTEM_PREAMBLE}

Generate a complete data record for the material/topic "${nodeId.replace(/-/g, " ")}".

Return a single JSON object with two top-level keys:
- "nodeData": matching this schema: ${NODE_DATA_SCHEMA}
- "passport": matching this schema: ${PASSPORT_SCHEMA}

Also include these top-level keys:
- "era": string (historical era of first known use)
- "origins": string (geographic origin)
- "scientificName": string (if applicable)
- "tags": string[] (relevant classification tags)

Use "estimated" for confidence on all AI-generated values.
All ratings should be realistic and well-reasoned for this specific material.`;

  let userContent = `Generate complete data for: "${nodeId.replace(/-/g, " ")}"`;
  if (existingData) {
    const existing = JSON.stringify(existingData, null, 2);
    userContent += `\n\nExisting data to refine and fill gaps (keep verified values, improve estimated ones):\n${existing}`;
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
}

export function buildSectionPrompt(
  section: SectionId,
  nodeId: string,
  existingContext?: any,
): { role: "system" | "user"; content: string }[] {
  const sectionInstruction = SECTION_SCHEMAS[section];

  const system = `${SYSTEM_PREAMBLE}

You are filling in the "${section}" section for the material/topic "${nodeId.replace(/-/g, " ")}".

${sectionInstruction}

Return a single JSON object with the requested fields. Use "estimated" for confidence.
Match the exact field names and value formats described above.`;

  let userContent = `Generate ${section} data for: "${nodeId.replace(/-/g, " ")}"`;
  if (existingContext) {
    userContent += `\n\nContext from other sections:\n${JSON.stringify(existingContext, null, 2)}`;
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
}

// ── Response Parser ──

export function parseAiResponse(raw: string): Record<string, any> | null {
  let cleaned = raw.trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  // Strip leading/trailing non-JSON characters
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
