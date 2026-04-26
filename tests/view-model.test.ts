import { describe, expect, test } from "vitest";
import { getResultViewModel } from "../src/sidepanel/viewModel";
import type { LogRow } from "../src/shared/types";
import type { SearchMatch } from "../src/sidepanel/search";

const row: LogRow = {
  id: "log-row-0",
  rowIndex: 0,
  timestamp: "2026-04-26 09:00:00",
  messageType: "下行",
  rawMessage: "{}",
  parsedMessage: {},
  parseStatus: "parsed"
};

const match: SearchMatch = {
  row,
  ranges: [],
  matchedPointKeys: ["sp:2.24"]
};

describe("side panel result view model", () => {
  test("empty query displays all rows", () => {
    expect(getResultViewModel([row], [match], "")).toEqual({
      rowsToDisplay: [row],
      emptyState: null
    });
  });

  test("non-empty query displays matching rows", () => {
    expect(getResultViewModel([row], [match], "sp:2.24")).toEqual({
      rowsToDisplay: [row],
      emptyState: null
    });
  });

  test("non-empty query with no matches shows no-results state", () => {
    expect(getResultViewModel([row], [], "sp:10.5")).toEqual({
      rowsToDisplay: [],
      emptyState: "no-results"
    });
  });
});
