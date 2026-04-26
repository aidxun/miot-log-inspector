export type ParseStatus = "parsed" | "invalid" | "empty";

export interface LogRow {
  id: string;
  rowIndex: number;
  timestamp: string;
  messageType: string;
  rawMessage: string;
  parsedMessage: unknown;
  parseStatus: ParseStatus;
}

export interface ExtractLogsRequest {
  type: "EXTRACT_LOGS";
}

export interface ExtractLogsResponse {
  type: "EXTRACT_LOGS_RESPONSE";
  headers: string[];
  rows: LogRow[];
  error?: string;
}

export interface FocusLogRowRequest {
  type: "FOCUS_LOG_ROW";
  rowIndex: number;
}

export interface FocusLogRowResponse {
  type: "FOCUS_LOG_ROW_RESPONSE";
  ok: boolean;
  error?: string;
}

export type ExtensionRequest = ExtractLogsRequest | FocusLogRowRequest;
export type ExtensionResponse = ExtractLogsResponse | FocusLogRowResponse;
