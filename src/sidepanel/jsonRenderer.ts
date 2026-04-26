import {
  getStructuredHighlightPairs,
  type ParsedSearchQuery,
  type StructuredHighlightPair
} from "./search";

const INDENT = "  ";

export function renderJsonWithStructuredMatches(value: unknown, query: string | ParsedSearchQuery): string {
  return renderValue(value, getStructuredHighlightPairs(query), 0);
}

function renderValue(value: unknown, pairs: StructuredHighlightPair[], depth: number): string {
  if (Array.isArray(value)) {
    return renderArray(value, pairs, depth);
  }

  if (value && typeof value === "object") {
    return renderObject(value as Record<string, unknown>, pairs, depth);
  }

  return escapeHtml(JSON.stringify(value));
}

function renderArray(values: unknown[], pairs: StructuredHighlightPair[], depth: number): string {
  if (!values.length) {
    return "[]";
  }

  const nextDepth = depth + 1;
  const lines = values.map((value, index) => {
    const comma = index === values.length - 1 ? "" : ",";
    const indent = INDENT.repeat(nextDepth);
    const renderedValue = renderValue(value, pairs, nextDepth);

    if (renderedValue.startsWith('<span class="json-object-match">')) {
      const highlightedValue = renderedValue.replace(
        '<span class="json-object-match">',
        `<span class="json-object-match">${indent}`
      );
      return comma ? highlightedValue.replace("</span>", `${comma}</span>`) : highlightedValue;
    }

    return `${indent}${renderedValue}${comma}`;
  });

  return `[\n${lines.join("\n")}\n${INDENT.repeat(depth)}]`;
}

function renderObject(
  objectValue: Record<string, unknown>,
  pairs: StructuredHighlightPair[],
  depth: number
): string {
  const entries = Object.entries(objectValue);

  if (!entries.length) {
    return "{}";
  }

  const nextDepth = depth + 1;
  const lines = entries.map(([key, value], index) => {
    const comma = index === entries.length - 1 ? "" : ",";
    return `${INDENT.repeat(nextDepth)}${escapeHtml(JSON.stringify(key))}: ${renderValue(value, pairs, nextDepth)}${comma}`;
  });
  const rendered = `{\n${lines.join("\n")}\n${INDENT.repeat(depth)}}`;

  if (!isStructuredMatch(objectValue, pairs)) {
    return rendered;
  }

  return `<span class="json-object-match">${rendered}</span>`;
}

function isStructuredMatch(
  objectValue: Record<string, unknown>,
  pairs: StructuredHighlightPair[]
): boolean {
  if (!pairs.length) {
    return false;
  }

  const siid = getNumericString(objectValue.siid);

  if (siid === null) {
    return false;
  }

  return pairs.some((pair) => {
    const idValue = getNumericString(objectValue[pair.idKey]);
    return siid === pair.siid && idValue === pair.idValue;
  });
}

function getNumericString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return value.trim();
  }

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
