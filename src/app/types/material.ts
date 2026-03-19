export type ConfidenceLevel = "verified" | "estimated" | "draft" | string;
export type ContentStatus = "draft" | "reviewed" | "verified" | string;

export interface SourcedValue<T = any> {
  value?: T;
  rating?: number;
  label?: string;
  confidence?: ConfidenceLevel;
  source?: string;
  [key: string]: any;
}

export type RatedProperty = any;

export interface TaxonomyAlias {
  canonicalId: string;
  alias: string;
  language?: string;
  [key: string]: any;
}

export interface MaterialPassport {
  materialId?: string;
  status?: ContentStatus;
  lastUpdated?: string;
  performance?: Record<string, RatedProperty>;
  process?: Record<string, RatedProperty>;
  dyeing?: Record<string, RatedProperty>;
  sustainability?: Record<string, RatedProperty>;
  sourcing?: Record<string, RatedProperty>;
  endUse?: Record<string, any>;
  [key: string]: any;
}

export type MaterialPassportRegistry = Record<string, MaterialPassport>;
export type TaxonomyAliasRegistry = Record<string, TaxonomyAlias[]>;
