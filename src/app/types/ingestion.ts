// Ingestion domain types
export type SourceType = 'paste' | 'file' | 'api';
export type BatchStatus = 'pending' | 'extracting' | 'structuring' | 'validating' | 'review' | 'applying' | 'completed' | 'failed';
export type EntityType = 'profile' | 'passport' | 'media' | 'supplier' | 'tag' | 'relation';
export type EntityStatus = 'pending' | 'valid' | 'invalid' | 'review' | 'applied' | 'rejected';
export type EvidenceType = 'explicit' | 'inferred' | 'hallucinated' | 'uncertain';
export type ReviewReason = 'low_confidence' | 'conflict' | 'missing_required' | 'validation_failed' | 'ambiguous_reference';

export interface IngestionBatch {
    batchId: string;
    actorId: string;
    sourceType: SourceType;
    sourceFilename: string | null;
    sourceMimeType: string | null;
    rawContentHash: string;
    rawSizeBytes: number;
    extractionMethod: string;
    modelName: string | null;
    promptVersion: string | null;
    status: BatchStatus;
    errorMessage: string | null;
    totalTokensInput: number | null;
    totalTokensOutput: number | null;
    totalCostUsd: number | null;
    createdAt: string;
    updatedAt: string;
}

// Canonical intermediate model - what LLM outputs
export interface IntermediateEntity {
    entityType: EntityType;
    // For profiles
    profileId?: string;
    label?: string;
    description?: string;
    era?: string;
    origins?: string;
    scientificName?: string;
    // For passport data
    passportPayload?: Record<string, unknown>;
    // For media
    url?: string;
    thumbUrl?: string;
    provider?: string;
    title?: string;
    width?: number;
    height?: number;
    position?: number;
    // For suppliers
    supplierId?: string;
    name?: string;
    relationship?: string;
    // For tags
    tagSlug?: string;
    tagLabel?: string;
    // Confidence
    confidence: number;
    evidence: Array<{
        evidenceType: EvidenceType;
        sourceSnippet: string;
        sourceLocation?: string;
        confidence: number;
    }>;
}

export interface IngestionPayload {
    entities: IntermediateEntity[];
    decisions: Array<{
        field: string;
        decision: 'auto' | 'review' | 'skip';
        reason: string;
    }>;
}
