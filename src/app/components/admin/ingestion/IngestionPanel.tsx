import React, { useState, useCallback, useEffect } from 'react';
import { IngestionDropZone } from './IngestionDropZone';
import { IngestionResults } from './IngestionResults';
import { apiClient } from '@/utils/api/client';
import { apiKey, getApiUrl } from '@/utils/api/info';

interface IngestionPanelProps {
    onClose: () => void;
    onFlash: (message: string) => void;
}

interface IngestionResult {
    batchId: string;
    status: 'review' | 'completed';
    entitiesExtracted: number;
    entitiesForReview: number;
    costUsd: number;
}

export interface IngestionAudit {
    batch: {
        batchId: string;
        status: string;
        sourceType: string | null;
        sourceFilename: string | null;
        sourceMimeType: string | null;
        extractionMethod: string | null;
        modelName: string | null;
        createdAt: string;
        updatedAt: string;
        totalTokensInput: number | null;
        totalTokensOutput: number | null;
        totalCostUsd: number | null;
        errorMessage: string | null;
    };
    summary: {
        totalEntities: number;
        totalEvidence: number;
        totalReviewItems: number;
    };
    entityCountsByType: Record<string, number>;
    entityCountsByStatus: Record<string, number>;
    storageTargets: Array<{ table: string; count: number }>;
    reviewQueue: Array<{
        reviewId: string;
        entityId: string;
        fieldName: string;
        reason: string | null;
        reviewerDecision: string | null;
        createdAt: string;
    }>;
    payloadPreview: Array<{
        entityType: string;
        status: string;
        targetTable: string;
        confidence: number;
        raw: unknown;
    }>;
}

interface ApplyResponse {
    success: boolean;
    applied: number;
    failed: number;
    skipped: number;
}

const BYPASS_INGESTION_AUTH = (import.meta.env.VITE_BYPASS_INGESTION_AUTH || 'true').toLowerCase() === 'true';
const INGEST_ENDPOINT = 'ingestion-orchestrator/ingest';

function getIngestionUrl(path: string): string {
    return getApiUrl(path);
}

async function parseInvokeError(error: unknown): Promise<string> {
    const invokeError = error as { context?: Response; message?: string } | null;
    const response = invokeError?.context;
    if (!response) {
        return invokeError?.message || 'Request failed';
    }

    let payload: Record<string, unknown> | null = null;
    try {
        payload = await response.clone().json();
    } catch {
        // Ignore parse failure and fall back to plain text/status.
    }

    const detail = payload?.details || payload?.message;
    const reason = payload?.error || detail || response.statusText || 'Request failed';

    if (typeof detail === 'string' && detail.toLowerCase().includes('invalid jwt')) {
        return 'Session token is invalid for the configured API. Please sign in again.';
    }

    return `Edge Function error (${response.status}): ${reason}`;
}

async function parseEdgeResponseError(response: Response): Promise<string> {
    let payload: Record<string, unknown> | null = null;
    try {
        payload = await response.clone().json();
    } catch {
        // Fall back to status text.
    }

    const detail = payload?.details || payload?.message;
    const reason = payload?.error || detail || response.statusText || 'Request failed';
    return `Edge Function error (${response.status}): ${reason}`;
}

async function getAccessTokenOrThrow(): Promise<string> {
    const initial = await apiClient.auth.getSession();
    if (initial.data.session?.access_token) return initial.data.session.access_token;
    throw new Error('Not authenticated. Please sign in with your admin account and retry.');
}

async function fetchBatchAudit(batchId: string): Promise<IngestionAudit> {
    const headers: Record<string, string> = {
        ...(apiKey ? { apikey: apiKey } : {}),
    };

    if (!BYPASS_INGESTION_AUTH) {
        const token = await getAccessTokenOrThrow();
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(getIngestionUrl(`ingestion-orchestrator/batch/${encodeURIComponent(batchId)}`), {
        method: 'GET',
        headers,
    });
    if (!response.ok) {
        throw new Error(await parseEdgeResponseError(response));
    }

    return await response.json() as IngestionAudit;
}

async function applyBatch(batchId: string): Promise<ApplyResponse> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(apiKey ? { apikey: apiKey } : {}),
    };
    if (!BYPASS_INGESTION_AUTH) {
        const token = await getAccessTokenOrThrow();
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(getIngestionUrl('ingestion-apply/apply'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ batchId, overwriteExisting: false }),
    });
    if (!response.ok) {
        throw new Error(await parseEdgeResponseError(response));
    }

    return await response.json() as ApplyResponse;
}

export function IngestionPanel({ onClose, onFlash }: IngestionPanelProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<IngestionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
    const [authEmail, setAuthEmail] = useState<string>(import.meta.env.VITE_ADMIN_EMAIL || '');
    const [authPassword, setAuthPassword] = useState<string>('');
    const [audit, setAudit] = useState<IngestionAudit | null>(null);
    const [auditLoading, setAuditLoading] = useState<boolean>(false);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState<boolean>(false);
    const [applyError, setApplyError] = useState<string | null>(null);
    const needsReauth = !BYPASS_INGESTION_AUTH && (!isAuthenticated || (error?.toLowerCase().includes('session token is invalid') ?? false));

    const refreshAuthState = useCallback(async () => {
        const { data: { session } } = await apiClient.auth.getSession();
        setIsAuthenticated(Boolean(session?.access_token));
    }, []);

    useEffect(() => {
        if (BYPASS_INGESTION_AUTH) {
            setIsAuthenticated(true);
            setIsAuthLoading(false);
            return;
        }

        let mounted = true;
        (async () => {
            await refreshAuthState();
            if (mounted) setIsAuthLoading(false);
        })();

        const { data: { subscription } } = apiClient.auth.onAuthStateChange(() => {
            void refreshAuthState();
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [refreshAuthState]);

    const handleSignIn = useCallback(async () => {
        if (!authEmail || !authPassword) {
            setError('Please enter email and password.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            await apiClient.auth.signOut();

            const { error: signInError } = await apiClient.auth.signInWithPassword({
                email: authEmail.trim(),
                password: authPassword,
            });
            if (signInError) throw signInError;
            await refreshAuthState();
            setAuthPassword('');
            onFlash('Signed in. You can now ingest.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Sign in failed';
            setError(message);
            onFlash(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [authEmail, authPassword, onFlash, refreshAuthState]);

    const handleSendMagicLink = useCallback(async () => {
        if (!authEmail) {
            setError('Please enter your admin email.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            const { error: otpError } = await apiClient.auth.signInWithOtp({
                email: authEmail.trim(),
                options: { emailRedirectTo: window.location.origin },
            });
            if (otpError) throw otpError;
            onFlash('Magic link sent. Check your email and open it in this browser.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send magic link';
            setError(message);
            onFlash(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [authEmail, onFlash]);

    const loadBatchAudit = useCallback(async (batchId: string) => {
        setAuditLoading(true);
        setAuditError(null);
        try {
            const details = await fetchBatchAudit(batchId);
            setAudit(details);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load ingestion audit details';
            setAuditError(message);
        } finally {
            setAuditLoading(false);
        }
    }, []);

    const submitContent = useCallback(async (body: {
        sourceType: 'paste' | 'file';
        content: string;
        mimeType: string;
        filename: string | null;
        options: { autoApplyThreshold: number; reviewThreshold: number };
    }): Promise<IngestionResult> => {
        if (BYPASS_INGESTION_AUTH) {
            const response = await fetch(getIngestionUrl(INGEST_ENDPOINT), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { apikey: apiKey } : {}),
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error(await parseEdgeResponseError(response));
            }
            return await response.json();
        }
        const { data: invokeData, error: invokeError } = await apiClient.functions.invoke(INGEST_ENDPOINT, {
            body,
        });
        if (invokeError) {
            throw new Error(await parseInvokeError(invokeError));
        }
        return invokeData as IngestionResult;
    }, []);
    
    const handlePaste = useCallback(async (text: string) => {
        setIsProcessing(true);
        setError(null);
        
        try {
            if (!BYPASS_INGESTION_AUTH) {
                await getAccessTokenOrThrow();
            }
            const body = {
                sourceType: 'paste' as const,
                content: text,
                mimeType: 'text/plain',
                filename: null,
                options: {
                    autoApplyThreshold: 0.8,
                    reviewThreshold: 0.7,
                },
            };

            const data = await submitContent(body);

            setResult(data);
            setAudit(null);
            setAuditError(null);
            setApplyError(null);
            void loadBatchAudit(data.batchId);
            onFlash(`Ingested ${data.entitiesExtracted} entities${data.entitiesForReview > 0 ? ` (${data.entitiesForReview} for review)` : ''}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Ingestion failed';
            if (!BYPASS_INGESTION_AUTH && message.toLowerCase().includes('session token is invalid')) {
                setIsAuthenticated(false);
            }
            setError(message);
            onFlash(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [loadBatchAudit, onFlash, submitContent]);
    
    const handleFileDrop = useCallback(async (file: File) => {
        setIsProcessing(true);
        setError(null);
        
        try {
            const text = await file.text();
            if (!BYPASS_INGESTION_AUTH) {
                await getAccessTokenOrThrow();
            }
            const body = {
                sourceType: 'file' as const,
                content: text,
                mimeType: file.type || 'text/plain',
                filename: file.name,
                options: {
                    autoApplyThreshold: 0.8,
                    reviewThreshold: 0.7,
                },
            };

            const data = await submitContent(body);

            setResult(data);
            setAudit(null);
            setAuditError(null);
            setApplyError(null);
            void loadBatchAudit(data.batchId);
            onFlash(`Ingested ${file.name}: ${data.entitiesExtracted} entities`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Ingestion failed';
            if (!BYPASS_INGESTION_AUTH && message.toLowerCase().includes('session token is invalid')) {
                setIsAuthenticated(false);
            }
            setError(message);
            onFlash(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [loadBatchAudit, onFlash, submitContent]);
    
    const handleApplyToDatabase = useCallback(async () => {
        if (!result?.batchId) return;
        setIsApplying(true);
        setApplyError(null);
        try {
            const applyResult = await applyBatch(result.batchId);
            onFlash(`Applied ${applyResult.applied} entities (${applyResult.failed} failed, ${applyResult.skipped} skipped)`);
            void loadBatchAudit(result.batchId);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Apply failed';
            setApplyError(message);
            onFlash(`Error: ${message}`);
        } finally {
            setIsApplying(false);
        }
    }, [loadBatchAudit, onFlash, result?.batchId]);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-neutral-900 border border-white/[0.08] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <h2 className="text-lg font-semibold text-white">Ingest from Text or Files</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-neutral-500 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-5 space-y-4 overflow-y-auto">
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                            <p className="text-neutral-400">Processing with LLM...</p>
                        </div>
                    ) : result ? (
                        <IngestionResults
                            result={result}
                            onReset={() => {
                                setResult(null);
                                setAudit(null);
                                setAuditError(null);
                                setApplyError(null);
                            }}
                            onViewDatabase={() => void loadBatchAudit(result.batchId)}
                            onRequestAudit={() => void loadBatchAudit(result.batchId)}
                            onApplyToDatabase={handleApplyToDatabase}
                            audit={audit}
                            isAuditLoading={auditLoading}
                            auditError={auditError}
                            isApplying={isApplying}
                            applyError={applyError}
                        />
                    ) : isAuthLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                            <p className="text-neutral-400">Checking auth session...</p>
                        </div>
                    ) : needsReauth ? (
                        <div className="space-y-4 rounded-lg border border-white/[0.08] bg-black/20 p-4">
                            <p className="text-sm text-neutral-300">
                                Sign in with your admin account to use ingestion.
                            </p>
                            <div className="space-y-2">
                                <input
                                    className="w-full rounded-lg border border-white/[0.12] bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                                    type="email"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    placeholder="Admin email"
                                />
                                <input
                                    className="w-full rounded-lg border border-white/[0.12] bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                                    type="password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    placeholder="Password"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleSignIn()}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleSendMagicLink()}
                                    className="rounded-lg border border-white/[0.2] px-3 py-2 text-sm text-neutral-200 hover:bg-white/[0.06]"
                                >
                                    Send Magic Link
                                </button>
                            </div>
                            <p className="text-xs text-neutral-500">
                                Password is entered at runtime and is not stored in `.env`.
                            </p>
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <IngestionDropZone 
                                onPaste={handlePaste}
                                onFileDrop={handleFileDrop}
                                supportedTypes={['text/plain', 'text/markdown', 'text/csv']}
                            />
                            
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
