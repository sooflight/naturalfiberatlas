import React from "react";
import {
  ChipInput,
  RatingSlider,
  SourcedDropdown,
  TextInput,
  Toggle,
} from "./node-editor/field-editors";
import type { ConfidenceLevel } from "../../types/material";

interface InspectorFieldProps {
  field: {
    key: string;
    label?: string;
    type?: string;
    placeholder?: string;
    options?: string[];
    min?: number;
    max?: number;
  };
  value: any;
  onChange: (value: any) => void;
}

export function InspectorField({ field, value, onChange }: InspectorFieldProps) {
  const label = field.label ?? field.key;
  const type = field.type ?? "text";
  const options = Array.isArray((field as { options?: string[] }).options)
    ? (field as { options?: string[] }).options!
    : [];
  const min = (field as { min?: number }).min;
  const max = (field as { max?: number }).max;
  const confidence: ConfidenceLevel = "unverified";

  return (
    <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
      {type === "textarea" ? (
        <TextInput
          label={label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          placeholder={field.placeholder}
          multiline
        />
      ) : type === "select" ? (
        <SourcedDropdown
          label={label}
          value={typeof value === "string" ? value : ""}
          confidence={confidence}
          options={options}
          onChange={(next) => onChange(next.value)}
        />
      ) : type === "toggle" ? (
        <Toggle
          label={label}
          value={Boolean(value)}
          confidence={confidence}
          onChange={(next) => onChange(next.value)}
        />
      ) : type === "chips" ? (
        <ChipInput
          label={label}
          values={Array.isArray(value) ? value : []}
          onChange={onChange}
          placeholder={field.placeholder ?? "Add..."}
        />
      ) : type === "number" || type === "rating" ? (
        <RatingSlider
          label={label}
          rating={typeof value === "number" ? value : Number(value ?? 0)}
          ratingLabel={field.placeholder}
          confidence={confidence}
          onChange={(next) => {
            const bounded = Math.max(min ?? 1, Math.min(max ?? 5, next.rating));
            onChange(bounded);
          }}
        />
      ) : (
        <TextInput
          label={label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          placeholder={field.placeholder}
        />
      )}
    </label>
  );
}
