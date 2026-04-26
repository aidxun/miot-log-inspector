import { describe, expect, test } from "vitest";
import { flattenForSearch, parseAndExpandJson, prettyPrintJson } from "../src/shared/json";

describe("JSON utilities", () => {
  test("expands JSON strings nested inside parsed JSON", () => {
    const result = parseAndExpandJson(
      '{"params":{"in":[{"value":"{\\"command\\":\\"start\\"}"}]}}'
    );

    expect(result.status).toBe("parsed");
    expect(result.value).toEqual({
      params: {
        in: [
          {
            value: {
              command: "start"
            }
          }
        ]
      }
    });
  });

  test("keeps invalid JSON as raw text", () => {
    const result = parseAndExpandJson("{bad json");

    expect(result.status).toBe("invalid");
    expect(result.value).toBe("{bad json");
  });

  test("flattens nested values for keyword search", () => {
    const text = flattenForSearch({
      method: "action",
      params: { value: { command: "start" } }
    });

    expect(text).toContain("method");
    expect(text).toContain("action");
    expect(text).toContain("command");
    expect(text).toContain("start");
  });

  test("pretty prints expanded JSON", () => {
    expect(prettyPrintJson({ a: 1, b: { c: true } })).toContain('\n  "b":');
  });
});
