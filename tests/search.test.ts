import { describe, expect, test } from "vitest";
import {
  createSearchIndex,
  getSearchMatches,
  parseSearchQuery,
  parseSearchFields,
  getStructuredHighlightPairs
} from "../src/sidepanel/search";
import type { LogRow } from "../src/shared/types";

const rows: LogRow[] = [
  {
    id: "log-row-0",
    rowIndex: 0,
    timestamp: "2026-04-26 09:00:00",
    messageType: "下行",
    rawMessage: '{"method":"action"}',
    parsedMessage: { method: "action", params: { siid: 2, aiid: 47, value: { command: "start" } } },
    parseStatus: "parsed"
  },
  {
    id: "log-row-1",
    rowIndex: 1,
    timestamp: "2026-04-26 09:00:01",
    messageType: "上行",
    rawMessage: '{"method":"event"}',
    parsedMessage: {
      method: "event",
      result: [
        { siid: 2, piid: 24, value: 45 },
        { siid: "10", piid: "5", value: true }
      ]
    },
    parseStatus: "parsed"
  }
];

describe("side panel search", () => {
  test("parses structured sp and sa tokens separately from keyword text", () => {
    expect(parseSearchQuery("sp:2.24,10.5 sa:2.47,2.48 房间1")).toEqual({
      keyword: "房间1",
      propertyFilters: ["sp:2.24", "sp:10.5"],
      actionFilters: ["sa:2.47", "sa:2.48"]
    });
  });

  test("parses split search fields with literal keyword text", () => {
    expect(
      parseSearchFields({
        keyword: "sp:2.24 房间1",
        propertyPoints: "2.24 10.5",
        actionPoints: "sa:2.47 2.48"
      })
    ).toEqual({
      keyword: "sp:2.24 房间1",
      propertyFilters: ["sp:2.24", "sp:10.5"],
      actionFilters: ["sa:2.47", "sa:2.48"]
    });
  });

  test("matches against timestamp, message type, raw JSON, and expanded JSON", () => {
    const index = createSearchIndex(rows);

    expect(getSearchMatches(index, "command").map((match) => match.row.id)).toEqual([
      "log-row-0"
    ]);
    expect(getSearchMatches(index, "上行").map((match) => match.row.id)).toEqual([
      "log-row-1"
    ]);
  });

  test("empty query returns all rows without match ranges", () => {
    const matches = getSearchMatches(createSearchIndex(rows), "");

    expect(matches).toHaveLength(2);
    expect(matches[0].ranges).toEqual([]);
  });

  test("matches structured property keys from siid and piid", () => {
    const matches = getSearchMatches(createSearchIndex(rows), "sp:2.24");

    expect(matches.map((match) => match.row.id)).toEqual(["log-row-1"]);
    expect(matches[0].matchedPointKeys).toEqual(["sp:2.24"]);
  });

  test("matches using split search fields", () => {
    const matches = getSearchMatches(
      createSearchIndex(rows),
      parseSearchFields({
        keyword: "event",
        propertyPoints: "2.24 10.5",
        actionPoints: ""
      })
    );

    expect(matches.map((match) => match.row.id)).toEqual(["log-row-1"]);
  });

  test("matches structured action keys from siid and aiid", () => {
    const matches = getSearchMatches(createSearchIndex(rows), "sa:2.47");

    expect(matches.map((match) => match.row.id)).toEqual(["log-row-0"]);
    expect(matches[0].matchedPointKeys).toEqual(["sa:2.47"]);
  });

  test("matches any structured token in a multi-token query", () => {
    expect(getSearchMatches(createSearchIndex(rows), "sp:10.5 sa:2.47,2.48").map((match) => match.row.id)).toEqual([
      "log-row-0",
      "log-row-1"
    ]);
  });

  test("requires keyword and structured filters when both are present", () => {
    expect(getSearchMatches(createSearchIndex(rows), "sp:2.24 command")).toEqual([]);
    expect(getSearchMatches(createSearchIndex(rows), "sa:2.47 command").map((match) => match.row.id)).toEqual([
      "log-row-0"
    ]);
  });

  test("builds structured JSON highlight pairs from sp and sa query tokens", () => {
    expect(getStructuredHighlightPairs("sp:2.2 sa:2.3")).toEqual([
      { idKey: "piid", idValue: "2", siid: "2" },
      { idKey: "aiid", idValue: "3", siid: "2" }
    ]);
  });
});
