import type { EvidenceRecord } from "../../types/evidence";
import raw from "./evidence-records.json";

export const EVIDENCE_RECORDS: Record<string, EvidenceRecord> = raw as Record<string, EvidenceRecord>;
