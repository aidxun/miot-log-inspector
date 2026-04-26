import type { LogRow } from "../shared/types";

export interface CopyableLogRow {
  row: LogRow;
  matchedPointKeys: string[];
}

export function formatRowsAsMarkdown(rows: CopyableLogRow[]): string {
  return rows.map(({ row }) => `${row.timestamp}\t${row.messageType}\t${row.rawMessage}`).join("\n");
}
