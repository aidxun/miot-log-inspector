import { describe, expect, test } from "vitest";
import { formatRowsAsMarkdown } from "../src/sidepanel/copy";
import type { LogRow } from "../src/shared/types";

const row: LogRow = {
  id: "log-row-7",
  rowIndex: 7,
  timestamp: "2026-04-26 09:00:00",
  messageType: "下行",
  rawMessage: '{"method":"action"}',
  parsedMessage: {
    method: "action",
    params: { siid: 2, aiid: 47, value: { command: "start" } }
  },
  parseStatus: "parsed"
};

describe("copy formatting", () => {
  test("formats selected rows as time type raw-body lines", () => {
    const text = formatRowsAsMarkdown([
      {
        row,
        matchedPointKeys: ["sa:2.47"]
      }
    ]);

    expect(text).toBe('2026-04-26 09:00:00\t下行\t{"method":"action"}');
  });
});
