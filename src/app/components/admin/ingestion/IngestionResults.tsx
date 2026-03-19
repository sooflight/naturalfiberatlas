import React, { useEffect, useMemo, useState } from 'react';
import type { IngestionAudit } from './IngestionPanel';

interface IngestionResultsProps {
    result: {
        batchId: string;
        status: 'review' | 'completed';
        entitiesExtracted: number;
        entitiesForReview: number;
        costUsd: number;
    };
    onReset: () => void;
    onViewDatabase?: () => void;
    onRequestAudit?: () => void;
    onApplyToDatabase?: () => Promise<void> | void;
    audit?: IngestionAudit | null;
    isAuditLoading?: boolean;
    auditError?: string | null;
    isApplying?: boolean;
    applyError?: string | null;
}

type AuditTab = 'summary' | 'review' | 'raw';

function formatDate(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function IngestionResults({
    result,
    onReset,
    onViewDatabase,
    onRequestAudit,
    onApplyToDatabase,
    audit,
    isAuditLoading = false,
    auditError = null,
    isApplying = false,
    applyError = null,
}: IngestionResultsProps) {
    const [activeTab, setActiveTab] = useState<AuditTab>('summary');
    const [showApplyPreview, setShowApplyPreview] = useState(false);

    useEffect(() => {
        if (activeTab !== 'summary' && !audit && !isAuditLoading) {
            onRequestAudit?.();
        }
    }, [activeTab, audit, isAuditLoading, onRequestAudit]);

    const rawPreview = useMemo(() => {
        if (!audit?.payloadPreview?.length) return 'No payload preview available for this batch.';
        return JSON.stringify(audit.payloadPreview, null, 2);
    }, [audit]);

    const pendingReviewItems = useMemo(
        () => (audit?.reviewQueue || []).filter((item) => !item.reviewerDecision).length,
        [audit],
    );

    const readyToApplyCount = useMemo(() => {
        const total = audit?.summary?.totalEntities ?? result.entitiesExtracted;
        return Math.max(0, total - pendingReviewItems);
    }, [audit, result.entitiesExtracted, pendingReviewItems]);

    const canApply = result.status === 'completed';

    const handleConfirmApply = async () => {
        if (!onApplyToDatabase || isApplying || !canApply) return;
        await onApplyToDatabase();
        setShowApplyPreview(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    result.status === 'completed' ? 'bg-green-500/20' : 'bg-blue-500/20'
                }`}>
                    {result.status === 'completed' ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                </div>
                <div>
                    <h3 className="font-medium text-white">
                        {result.status === 'completed' ? 'Ingestion Complete' : 'Review Required'}
                    </h3>
                    <p className="text-sm text-neutral-400">
                        {result.entitiesExtracted} entities extracted
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 uppercase">Extracted</p>
                    <p className="text-xl font-semibold text-white">{result.entitiesExtracted}</p>
                </div>
                <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 uppercase">For Review</p>
                    <p className={`text-xl font-semibold ${result.entitiesForReview > 0 ? 'text-blue-400' : 'text-green-400'}`}>
                        {result.entitiesForReview}
                    </p>
                </div>
                <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 uppercase">Cost</p>
                    <p className="text-xl font-semibold text-white">${result.costUsd.toFixed(4)}</p>
                </div>
            </div>
            
            {result.status === 'review' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-200">
                        {result.entitiesForReview} items require manual review before they can be applied to the database. Use the Review Queue tab below.
                    </p>
                </div>
            )}
            
            <div className="flex gap-2">
                <button
                    onClick={onReset}
                    className="flex-1 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Process Another
                </button>
                {onApplyToDatabase && (
                    <button
                        type="button"
                        onClick={() => {
                            setShowApplyPreview(true);
                            onRequestAudit?.();
                        }}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Preview Apply
                    </button>
                )}
                {result.status === 'completed' && (
                    <button
                        onClick={() => {
                            setActiveTab('review');
                            onViewDatabase?.();
                        }}
                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        View in Database
                    </button>
                )}
            </div>

            {showApplyPreview && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                    <h4 className="text-sm font-medium text-white">Apply Preview</h4>
                    <p className="text-xs text-neutral-300">
                        Review predicted impact before committing this batch to canonical tables.
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-black/30 p-2">
                            <div className="text-neutral-500 uppercase">Ready</div>
                            <div className="text-white font-semibold">{readyToApplyCount}</div>
                        </div>
                        <div className="rounded bg-black/30 p-2">
                            <div className="text-neutral-500 uppercase">Pending Review</div>
                            <div className={`font-semibold ${pendingReviewItems > 0 ? 'text-blue-300' : 'text-emerald-300'}`}>
                                {pendingReviewItems}
                            </div>
                        </div>
                        <div className="rounded bg-black/30 p-2">
                            <div className="text-neutral-500 uppercase">Target Tables</div>
                            <div className="text-white font-semibold">{audit?.storageTargets.length || 0}</div>
                        </div>
                    </div>
                    <div className="rounded bg-black/30 p-2">
                        <div className="text-[11px] uppercase text-neutral-500 mb-1">Predicted writes</div>
                        {audit?.storageTargets?.length ? (
                            <div className="space-y-1">
                                {audit.storageTargets.map((target) => (
                                    <div key={target.table} className="flex items-center justify-between text-xs text-neutral-200">
                                        <span>{target.table}</span>
                                        <span>{target.count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-neutral-400">Load audit details to inspect predicted writes.</div>
                        )}
                    </div>
                    {!canApply && (
                        <p className="text-xs text-blue-300">
                            Batch must be in completed state before apply is enabled.
                        </p>
                    )}
                    {applyError && (
                        <p className="text-xs text-red-400">{applyError}</p>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowApplyPreview(false)}
                            className="flex-1 px-3 py-2 rounded bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleConfirmApply()}
                            disabled={!canApply || isApplying}
                            className="flex-1 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900/40 text-xs text-white font-medium"
                        >
                            {isApplying ? 'Applying...' : 'Confirm Apply'}
                        </button>
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">Batch Audit</h4>
                    <div className="text-xs text-neutral-500">Batch: {result.batchId}</div>
                </div>

                <div className="flex gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('summary')}
                        className={`px-2 py-1 rounded ${activeTab === 'summary' ? 'bg-white/[0.14] text-white' : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1]'}`}
                    >
                        Summary
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('review');
                            onRequestAudit?.();
                        }}
                        className={`px-2 py-1 rounded ${activeTab === 'review' ? 'bg-white/[0.14] text-white' : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1]'}`}
                    >
                        Review Queue
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('raw');
                            onRequestAudit?.();
                        }}
                        className={`px-2 py-1 rounded ${activeTab === 'raw' ? 'bg-white/[0.14] text-white' : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.1]'}`}
                    >
                        Raw Payload
                    </button>
                </div>

                {isAuditLoading && (
                    <div className="text-sm text-neutral-400">Loading in-depth audit data...</div>
                )}
                {!isAuditLoading && auditError && (
                    <div className="text-sm text-red-400">{auditError}</div>
                )}
                {!isAuditLoading && !auditError && !audit && (
                    <div className="text-sm text-neutral-400">Open a tab to load batch audit details.</div>
                )}

                {!isAuditLoading && !auditError && audit && activeTab === 'summary' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded bg-black/30 p-2">
                                <div className="text-[11px] uppercase text-neutral-500">Entities</div>
                                <div className="text-white font-semibold">{audit.summary.totalEntities}</div>
                            </div>
                            <div className="rounded bg-black/30 p-2">
                                <div className="text-[11px] uppercase text-neutral-500">Evidence Rows</div>
                                <div className="text-white font-semibold">{audit.summary.totalEvidence}</div>
                            </div>
                            <div className="rounded bg-black/30 p-2">
                                <div className="text-[11px] uppercase text-neutral-500">Review Items</div>
                                <div className="text-white font-semibold">{audit.summary.totalReviewItems}</div>
                            </div>
                        </div>

                        <div className="text-xs text-neutral-300 space-y-1">
                            <div>Status: <span className="text-white">{audit.batch.status}</span></div>
                            <div>Source: <span className="text-white">{audit.batch.sourceType || 'unknown'}</span></div>
                            <div>Model: <span className="text-white">{audit.batch.modelName || 'n/a'}</span></div>
                            <div>Extraction: <span className="text-white">{audit.batch.extractionMethod || 'n/a'}</span></div>
                            <div>Created: <span className="text-white">{formatDate(audit.batch.createdAt)}</span></div>
                            <div>Updated: <span className="text-white">{formatDate(audit.batch.updatedAt)}</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded bg-black/30 p-2">
                                <div className="text-[11px] uppercase text-neutral-500 mb-1">Entity Types</div>
                                {Object.keys(audit.entityCountsByType).length === 0 ? (
                                    <div className="text-xs text-neutral-400">No entities found.</div>
                                ) : (
                                    <div className="space-y-1">
                                        {Object.entries(audit.entityCountsByType).map(([type, count]) => (
                                            <div key={type} className="flex items-center justify-between text-xs text-neutral-200">
                                                <span>{type}</span>
                                                <span>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="rounded bg-black/30 p-2">
                                <div className="text-[11px] uppercase text-neutral-500 mb-1">Where Data Was Added</div>
                                {audit.storageTargets.length === 0 ? (
                                    <div className="text-xs text-neutral-400">No storage target data.</div>
                                ) : (
                                    <div className="space-y-1">
                                        {audit.storageTargets.map((target) => (
                                            <div key={target.table} className="flex items-center justify-between text-xs text-neutral-200">
                                                <span>{target.table}</span>
                                                <span>{target.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!isAuditLoading && !auditError && audit && activeTab === 'review' && (
                    <div className="space-y-2">
                        {audit.reviewQueue.length === 0 ? (
                            <div className="text-sm text-neutral-300">No review queue items for this batch.</div>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {audit.reviewQueue.map((item) => (
                                    <div key={item.reviewId} className="rounded border border-white/[0.08] bg-black/30 p-2">
                                        <div className="text-xs text-neutral-200">
                                            <span className="text-neutral-400">Entity:</span> {item.entityId}
                                        </div>
                                        <div className="text-xs text-neutral-200">
                                            <span className="text-neutral-400">Field:</span> {item.fieldName}
                                        </div>
                                        <div className="text-xs text-neutral-200">
                                            <span className="text-neutral-400">Reason:</span> {item.reason || 'n/a'}
                                        </div>
                                        <div className="text-xs text-neutral-200">
                                            <span className="text-neutral-400">Decision:</span> {item.reviewerDecision || 'pending'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!isAuditLoading && !auditError && audit && activeTab === 'raw' && (
                    <pre className="text-[11px] leading-relaxed bg-black/40 border border-white/[0.08] rounded p-3 text-neutral-200 overflow-auto max-h-64">
                        {rawPreview}
                    </pre>
                )}
            </div>
        </div>
    );
}
