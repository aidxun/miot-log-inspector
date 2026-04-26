import { parseAndExpandContentJson } from "./json";
import type { LogRow } from "../shared/types";

const TABLE_SELECTOR = ".device-log-main-log";
const ROW_SELECTOR = `${TABLE_SELECTOR} tbody tr`;
const MESSAGE_SELECTOR = ".multiLineHide";

export interface ExtractedLogTable {
  headers: string[];
  rows: LogRow[];
}

export function extractLogTableFromDocument(sourceDocument: Document = document): ExtractedLogTable {
  return {
    headers: extractTableHeaders(sourceDocument),
    rows: extractLogsFromDocument(sourceDocument)
  };
}

export function extractLogsFromDocument(sourceDocument: Document = document): LogRow[] {
  return Array.from(sourceDocument.querySelectorAll<HTMLTableRowElement>(ROW_SELECTOR))
    .map((row, rowIndex) => extractLogRow(row, rowIndex))
    .filter((row): row is LogRow => row !== null);
}

function extractTableHeaders(sourceDocument: Document): string[] {
  const tableRoot = sourceDocument.querySelector<HTMLElement>(TABLE_SELECTOR);

  if (!tableRoot) {
    return [];
  }

  return Array.from(tableRoot.querySelectorAll<HTMLTableCellElement>("thead th"))
    .map((headerCell) => {
      const titleElement = headerCell.querySelector<HTMLElement>(".ant-table-column-title");
      return normalizeText(titleElement?.textContent ?? headerCell.textContent);
    })
    .filter(Boolean);
}

function extractLogRow(row: HTMLTableRowElement, rowIndex: number): LogRow | null {
  const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td"));

  if (cells.length < 3) {
    return null;
  }

  const timestamp = normalizeText(cells[0].textContent);
  const messageType = normalizeText(cells[1].textContent);
  const messageElement = cells[2].querySelector<HTMLElement>(MESSAGE_SELECTOR);
  const rawMessage =
    messageElement?.getAttribute("title")?.trim() ||
    normalizeText(messageElement?.textContent ?? cells[2].textContent);
  const parsed = parseAndExpandContentJson(rawMessage);

  return {
    id: `log-row-${rowIndex}`,
    rowIndex,
    timestamp,
    messageType,
    rawMessage,
    parsedMessage: parsed.value,
    parseStatus: parsed.status
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
