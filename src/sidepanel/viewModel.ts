import type { LogRow } from "../shared/types";
import type { SearchMatch } from "./search";

export interface ResultViewModel {
  rowsToDisplay: LogRow[];
  emptyState: "no-results" | "no-rows" | null;
}

export function getResultViewModel(rows: LogRow[], matches: SearchMatch[], query: string): ResultViewModel {
  const hasQuery = Boolean(query.trim());

  if (!rows.length) {
    return {
      rowsToDisplay: [],
      emptyState: "no-rows"
    };
  }

  if (!hasQuery) {
    return {
      rowsToDisplay: rows,
      emptyState: null
    };
  }

  if (!matches.length) {
    return {
      rowsToDisplay: [],
      emptyState: "no-results"
    };
  }

  return {
    rowsToDisplay: matches.map((match) => match.row),
    emptyState: null
  };
}
