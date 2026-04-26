import { extractLogTableFromDocument } from "./extractLogs";
import type { ExtensionRequest, ExtensionResponse } from "../shared/types";

const HIGHLIGHT_CLASS = "miot-log-inspector-highlight";
const STYLE_ID = "miot-log-inspector-style";
const CONTENT_MARKER = "__miotLogInspectorContentLoaded";

declare global {
  interface Window {
    [CONTENT_MARKER]?: boolean;
  }
}

if (!window[CONTENT_MARKER]) {
  window[CONTENT_MARKER] = true;
  installHighlightStyle();

  chrome.runtime.onMessage.addListener(
    (
      request: ExtensionRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: ExtensionResponse) => void
    ) => {
      if (request.type === "EXTRACT_LOGS") {
        const table = extractLogTableFromDocument(document);
        sendResponse({
          type: "EXTRACT_LOGS_RESPONSE",
          headers: table.headers,
          rows: table.rows
        });
        return false;
      }

      if (request.type === "FOCUS_LOG_ROW") {
        sendResponse(focusLogRow(request.rowIndex));
        return false;
      }

      return false;
    }
  );
}

function focusLogRow(rowIndex: number): ExtensionResponse {
  const rows = Array.from(
    document.querySelectorAll<HTMLTableRowElement>(".device-log-main-log tbody tr")
  );
  const row = rows[rowIndex];

  if (!row) {
    return {
      type: "FOCUS_LOG_ROW_RESPONSE",
      ok: false,
      error: `Row ${rowIndex} was not found.`
    };
  }

  rows.forEach((candidate) => candidate.classList.remove(HIGHLIGHT_CLASS));
  row.classList.add(HIGHLIGHT_CLASS);
  row.scrollIntoView({ block: "center", behavior: "smooth" });

  return {
    type: "FOCUS_LOG_ROW_RESPONSE",
    ok: true
  };
}

function installHighlightStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} > td {
      background: #fff7cc !important;
      box-shadow: inset 3px 0 0 #f59e0b;
    }
  `;
  document.documentElement.append(style);
}
