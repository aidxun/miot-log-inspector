import type { ParseStatus } from "../shared/types";

interface ParsedJson {
  status: ParseStatus;
  value: unknown;
}

const JSON_STARTS = new Set(["{", "["]);

export function parseAndExpandContentJson(raw: string): ParsedJson {
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

function expandNestedJson(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!JSON_STARTS.has(trimmed[0] ?? "")) {
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
