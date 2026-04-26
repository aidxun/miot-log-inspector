import { describe, expect, test } from "vitest";
import { createDemoLogTable } from "../src/sidepanel/demoData";
import { createSearchIndex, getSearchMatches, parseSearchFields } from "../src/sidepanel/search";

describe("side panel demo data", () => {
  test("covers the core screenshot scenarios", () => {
    const table = createDemoLogTable();
    const index = createSearchIndex(table.rows);

    expect(table.headers).toEqual(["时间", "消息类型", "消息内容"]);
    expect(table.rows.length).toBeGreaterThanOrEqual(10);
    expect(getSearchMatches(index, parseSearchFields({
      keyword: "房间1",
      propertyPoints: "2.2",
      actionPoints: ""
    })).length).toBeGreaterThan(0);
    expect(getSearchMatches(index, parseSearchFields({
      keyword: "",
      propertyPoints: "",
      actionPoints: "2.5"
    })).length).toBeGreaterThan(0);
    expect(getSearchMatches(index, parseSearchFields({
      keyword: "nested_payload",
      propertyPoints: "2.6",
      actionPoints: ""
    })).length).toBeGreaterThan(0);
    expect(table.rows.some((row) => row.parseStatus === "invalid")).toBe(true);
  });
});
