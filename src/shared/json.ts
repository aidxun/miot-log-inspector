import type { ParseStatus } from "./types";

export interface ParsedJson {
  status: ParseStatus;
  value: unknown;
}

const JSON_STARTS = new Set(["{", "["]);

export function parseAndExpandJson(raw: string): ParsedJson {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { status: "empty", value: "" };
  }

  try {
    return { status: "parsed", value: expandNestedJson(JSON.parse(trimmed)) };
  } catch {
    return { status: "invalid", value: raw };
  }
}

export function expandNestedJson(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const startsLikeJson = JSON_STARTS.has(trimmed[0] ?? "");

    if (!startsLikeJson) {
      return value;
    }

    try {
      return expandNestedJson(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => expandNestedJson(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, expandNestedJson(nestedValue)])
    );
  }

  return value;
}

export function flattenForSearch(value: unknown): string {
  const parts: string[] = [];
  collectSearchParts(value, parts);
  return parts.join(" ").toLowerCase();
}

export function prettyPrintJson(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function collectSearchParts(value: unknown, parts: string[]): void {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSearchParts(item, parts));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, nestedValue]) => {
      parts.push(key);
      collectSearchParts(nestedValue, parts);
    });
    return;
  }

  parts.push(String(value));
}
