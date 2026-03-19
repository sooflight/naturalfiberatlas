import type { ValidationRule } from "./types";

export const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: "about-min-length",
    field: "about",
    severity: "warning",
    message: "About text should be at least 100 characters for completeness",
    validate: (v) => typeof v === "string" && v.trim().length >= 100,
  },
  {
    id: "gallery-min-images",
    field: "galleryImages",
    severity: "error",
    message: "Gallery must have at least 1 image",
    validate: (v) => Array.isArray(v) && v.length >= 1,
  },
  {
    id: "subtitle-required",
    field: "subtitle",
    severity: "error",
    message: "Subtitle is required",
    validate: (v) => typeof v === "string" && v.trim().length > 0,
  },
  {
    id: "hero-image-required",
    field: "image",
    severity: "error",
    message: "Hero image is required",
    validate: (v) => typeof v === "string" && v.trim().length > 0,
  },
  {
    id: "tags-recommended",
    field: "tags",
    severity: "warning",
    message: "At least one tag is recommended",
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
  {
    id: "regions-recommended",
    field: "regions",
    severity: "info",
    message: "Region information helps users find this fiber",
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
  {
    id: "seeAlso-recommended",
    field: "seeAlso",
    severity: "info",
    message: "Cross-references help users discover related fibers",
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
];
