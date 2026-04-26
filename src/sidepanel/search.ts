import { flattenForSearch } from "../shared/json";
import type { LogRow } from "../shared/types";

export interface SearchIndexItem {
  row: LogRow;
  text: string;
  propertyKeys: string[];
  actionKeys: string[];
}

export interface SearchMatch {
  row: LogRow;
  ranges: Array<[number, number]>;
  matchedPointKeys: string[];
}

export interface ParsedSearchQuery {
  keyword: string;
  propertyFilters: string[];
  actionFilters: string[];
}

export interface SearchFields {
  keyword: string;
  propertyPoints: string;
  actionPoints: string;
}

export interface StructuredHighlightPair {
  siid: string;
  idKey: "piid" | "aiid";
  idValue: string;
}

export function createSearchIndex(rows: LogRow[]): SearchIndexItem[] {
  return rows.map((row) => {
    const pointKeys = extractPointKeys(row.parsedMessage);

    return {
      row,
      text: [
        row.timestamp,
        row.messageType,
        row.rawMessage,
        flattenForSearch(row.parsedMessage),
        ...pointKeys.propertyKeys,
        ...pointKeys.actionKeys
      ]
        .join(" ")
        .toLowerCase(),
      propertyKeys: pointKeys.propertyKeys,
      actionKeys: pointKeys.actionKeys
    };
  });
}

export function getSearchMatches(
  index: SearchIndexItem[],
  query: string | ParsedSearchQuery
): SearchMatch[] {
  const parsedQuery = typeof query === "string" ? parseSearchQuery(query) : query;
  const normalizedKeyword = parsedQuery.keyword.toLowerCase();
  const structuredFilters = [...parsedQuery.propertyFilters, ...parsedQuery.actionFilters];

  if (!normalizedKeyword && !structuredFilters.length) {
    return index.map((item) => ({ row: item.row, ranges: [], matchedPointKeys: [] }));
  }

  return index
    .map((item) => ({
      item,
      keywordMatched: !normalizedKeyword || item.text.includes(normalizedKeyword),
      matchedPointKeys: getMatchedPointKeys(item, parsedQuery)
    }))
    .filter(({ keywordMatched, matchedPointKeys }) => {
      const structuredMatched = !structuredFilters.length || matchedPointKeys.length > 0;
      return keywordMatched && structuredMatched;
    })
    .map((item) => ({
      row: item.item.row,
      ranges: normalizedKeyword ? findRanges(item.item.text, normalizedKeyword) : [],
      matchedPointKeys: item.matchedPointKeys
    }));
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const keywordParts: string[] = [];
  const propertyFilters: string[] = [];
  const actionFilters: string[] = [];

  query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((token) => {
      const normalizedToken = token.toLowerCase();
      const propertyMatch = normalizedToken.match(/^sp:(\d+)\.(\d+(?:,\d+\.\d+)*)$/);
      const actionMatch = normalizedToken.match(/^sa:(\d+)\.(\d+(?:,\d+\.\d+)*)$/);

      if (propertyMatch) {
        propertyFilters.push(...expandPointFilters("sp", propertyMatch[1], propertyMatch[2]));
        return;
      }

      if (actionMatch) {
        actionFilters.push(...expandPointFilters("sa", actionMatch[1], actionMatch[2]));
        return;
      }

      keywordParts.push(token);
    });

  return {
    keyword: keywordParts.join(" "),
    propertyFilters: unique(propertyFilters),
    actionFilters: unique(actionFilters)
  };
}

export function parseSearchFields(fields: SearchFields): ParsedSearchQuery {
  return {
    keyword: fields.keyword.trim(),
    propertyFilters: parsePointInput("sp", fields.propertyPoints),
    actionFilters: parsePointInput("sa", fields.actionPoints)
  };
}

export function extractPointKeys(value: unknown): Pick<SearchIndexItem, "propertyKeys" | "actionKeys"> {
  const propertyKeys = new Set<string>();
  const actionKeys = new Set<string>();

  walkJson(value, (candidate) => {
    const siid = getPointValue(candidate, "siid");
    const piid = getPointValue(candidate, "piid");
    const aiid = getPointValue(candidate, "aiid");

    if (siid !== null && piid !== null) {
      propertyKeys.add(`sp:${siid}.${piid}`);
    }

    if (siid !== null && aiid !== null) {
      actionKeys.add(`sa:${siid}.${aiid}`);
    }
  });

  return {
    propertyKeys: Array.from(propertyKeys).sort(comparePointKeys),
    actionKeys: Array.from(actionKeys).sort(comparePointKeys)
  };
}

export function getStructuredHighlightPairs(query: string | ParsedSearchQuery): StructuredHighlightPair[] {
  const parsedQuery = typeof query === "string" ? parseSearchQuery(query) : query;

  return [
    ...parsedQuery.propertyFilters.map((filter) => pointFilterToHighlightPair(filter, "piid")),
    ...parsedQuery.actionFilters.map((filter) => pointFilterToHighlightPair(filter, "aiid"))
  ];
}

function getMatchedPointKeys(item: SearchIndexItem, query: ParsedSearchQuery): string[] {
  return [
    ...item.propertyKeys.filter((key) => query.propertyFilters.includes(key)),
    ...item.actionKeys.filter((key) => query.actionFilters.includes(key))
  ];
}

function pointFilterToHighlightPair(filter: string, idKey: "piid" | "aiid"): StructuredHighlightPair {
  const [, pair] = filter.split(":");
  const [siid, idValue] = pair.split(".");

  return {
    siid,
    idKey,
    idValue
  };
}

function findRanges(text: string, query: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let index = text.indexOf(query);

  while (index !== -1) {
    ranges.push([index, index + query.length]);
    index = text.indexOf(query, index + query.length);
  }

  return ranges;
}

function walkJson(value: unknown, visit: (candidate: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visit));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const candidate = value as Record<string, unknown>;
  visit(candidate);

  Object.values(candidate).forEach((nestedValue) => walkJson(nestedValue, visit));
}

function getPointValue(candidate: Record<string, unknown>, key: string): string | null {
  const value = candidate[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return value.trim();
  }

  return null;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function parsePointInput(prefix: "sp" | "sa", value: string): string[] {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(new RegExp(`^${prefix}:`), "");

  if (!normalizedValue) {
    return [];
  }

  return unique(
    normalizedValue
      .split(/\s+/)
      .filter(Boolean)
      .filter((pair) => /^\d+\.\d+$/.test(pair))
      .map((pair) => `${prefix}:${pair}`)
  );
}

function expandPointFilters(prefix: "sp" | "sa", firstSiid: string, pairList: string): string[] {
  return pairList.split(",").map((pair, index) => {
    if (index === 0) {
      return `${prefix}:${firstSiid}.${pair}`;
    }

    const [siid, id] = pair.split(".");
    return `${prefix}:${siid}.${id}`;
  });
}

function comparePointKeys(left: string, right: string): number {
  const [leftPrefix, leftPair] = left.split(":");
  const [rightPrefix, rightPair] = right.split(":");

  if (leftPrefix !== rightPrefix) {
    return leftPrefix.localeCompare(rightPrefix);
  }

  const [leftSiid, leftId] = leftPair.split(".").map(Number);
  const [rightSiid, rightId] = rightPair.split(".").map(Number);

  return leftSiid - rightSiid || leftId - rightId;
}
