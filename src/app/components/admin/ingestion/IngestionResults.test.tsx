/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IngestionResults } from './IngestionResults';

afterEach(() => {
  cleanup();
});

const baseResult = {
  batchId: 'batch_123',
  status: 'completed' as const,
  entitiesExtracted: 5,
  entitiesForReview: 2,
  costUsd: 0.0123,
};

const baseAudit = {
  batch: {
    batchId: 'batch_123',
    status: 'review',
    sourceType: 'paste',
    sourceFilename: null,
    sourceMimeType: null,
    extractionMethod: 'text',
    modelName: 'anthropic/claude-3.5-sonnet',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:01:00.000Z',
    totalTokensInput: 1234,
    totalTokensOutput: 456,
    totalCostUsd: 0.0123,
    errorMessage: null,
  },
  summary: {
    totalEntities: 5,
    totalEvidence: 7,
    totalReviewItems: 2,
  },
  entityCountsByType: {
    profile: 2,
    supplier: 1,
    media: 2,
  },
  entityCountsByStatus: {
    valid: 3,
    review: 2,
  },
  storageTargets: [
    { table: 'ingestion_entities', count: 5 },
    { table: 'ingestion_review_queue', count: 2 },
  ],
  reviewQueue: [
    {
      reviewId: 'r1',
      entityId: 'e1',
      fieldName: 'confidence',
      reason: 'low_confidence',
      reviewerDecision: null,
      createdAt: '2026-03-01T00:01:00.000Z',
    },
  ],
  payloadPreview: [
    {
      entityType: 'profile',
      status: 'review',
      targetTable: 'profiles',
      confidence: 0.61,
      raw: { profileId: 'ramie', label: 'Ramie' },
    },
  ],
};

describe('IngestionResults', () => {
  it('invokes view database callback', async () => {
    const onViewDatabase = vi.fn();
    const user = userEvent.setup();

    render(
      <IngestionResults
        result={baseResult}
        onReset={vi.fn()}
        onViewDatabase={onViewDatabase}
        onRequestAudit={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /view in database/i }));
    expect(onViewDatabase).toHaveBeenCalledTimes(1);
  });

  it('shows review queue and raw payload sections when selected', async () => {
    const user = userEvent.setup();

    render(
      <IngestionResults
        result={baseResult}
        onReset={vi.fn()}
        onViewDatabase={vi.fn()}
        onRequestAudit={vi.fn()}
        audit={baseAudit}
      />
    );

    await user.click(screen.getByRole('button', { name: /review queue/i }));
    expect(screen.getByText(/low_confidence/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /raw payload/i }));
    expect(screen.getByText(/"profileId": "ramie"/i)).toBeTruthy();
  });

  it('gates apply behind a preview confirmation', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(
      <IngestionResults
        result={baseResult}
        onReset={vi.fn()}
        onViewDatabase={vi.fn()}
        onRequestAudit={vi.fn()}
        onApplyToDatabase={onApply}
        audit={baseAudit}
      />
    );

    await user.click(screen.getByRole('button', { name: /preview apply/i }));
    expect(screen.getByText(/apply preview/i)).toBeTruthy();
    expect(screen.getAllByText(/ingestion_entities/i).length).toBeGreaterThan(0);

    expect(onApply).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /confirm apply/i }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
