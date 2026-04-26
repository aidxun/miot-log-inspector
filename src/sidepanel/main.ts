import "./styles.css";
import { formatRowsAsMarkdown } from "./copy";
import { createDemoLogTable } from "./demoData";
import { shouldDeferSearchRender } from "./inputComposition";
import { renderJsonWithStructuredMatches } from "./jsonRenderer";
import { prettyPrintJson } from "../shared/json";
import type { ExtractLogsResponse, LogRow } from "../shared/types";
import {
  createSearchIndex,
  getSearchMatches,
  parseSearchFields,
  type ParsedSearchQuery,
  type SearchIndexItem,
  type SearchMatch
} from "./search";
import { getResultViewModel } from "./viewModel";

interface AppState {
  rows: LogRow[];
  searchIndex: SearchIndexItem[];
  tableHeaders: string[];
  keywordQuery: string;
  propertyQuery: string;
  actionQuery: string;
  detailDrawerRowId: string | null;
  selectedRowIds: Set<string>;
  isComposingSearch: boolean;
  status: string;
  copyStatus: string;
}

interface SearchFocusRequest {
  action: string;
  start: number | null;
  end: number | null;
}

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Missing #app root.");
}

const app = appElement;
const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "1";

const state: AppState = {
  rows: [],
  searchIndex: [],
  tableHeaders: [],
  keywordQuery: "",
  propertyQuery: "",
  actionQuery: "",
  detailDrawerRowId: null,
  selectedRowIds: new Set(),
  isComposingSearch: false,
  status: "点击刷新读取当前页面表格",
  copyStatus: ""
};

render();
void refreshRows();

async function refreshRows(): Promise<void> {
  if (isDemoMode) {
    const response = createDemoLogTable();

    state.rows = response.rows;
    state.searchIndex = createSearchIndex(response.rows);
    state.tableHeaders = response.headers;
    state.detailDrawerRowId = null;
    state.selectedRowIds.clear();
    state.status = "演示模式：已加载 Chrome Web Store 截图用 mock 日志";
    state.copyStatus = "";
    render();
    return;
  }

  state.status = "读取当前页面...";
  render();

  const tab = await getActiveTab();

  if (!tab?.id || !isSupportedUrl(tab.url)) {
    state.rows = [];
    state.searchIndex = [];
    state.tableHeaders = [];
    state.detailDrawerRowId = null;
    state.selectedRowIds.clear();
    state.status = "仅支持 https://iot.mi.com/* 页面";
    render();
    return;
  }

  try {
    const response = await extractLogsFromTab(tab.id);

    state.rows = response.rows;
    state.searchIndex = createSearchIndex(response.rows);
    state.tableHeaders = response.headers ?? [];
    state.detailDrawerRowId = null;
    state.selectedRowIds.clear();
    state.status = response.rows.length ? "已读取当前页面表格" : "未找到 device-log-main-log 表格";
    state.copyStatus = "";
  } catch (error) {
    state.rows = [];
    state.searchIndex = [];
    state.tableHeaders = [];
    state.detailDrawerRowId = null;
    state.selectedRowIds.clear();
    state.status =
      error instanceof Error ? `读取失败：${error.message}` : "读取失败：无法连接内容脚本";
  }

  render();
}

function render(): void {
  const parsedQuery = getParsedSearchQuery();
  const queryHasValue = hasSearchValue();
  const matches = getSearchMatches(state.searchIndex, parsedQuery);
  const resultView = getResultViewModel(state.rows, matches, queryHasValue ? "1" : "");
  const rowsToDisplay = resultView.rowsToDisplay;
  const detailRow = state.rows.find((row) => row.id === state.detailDrawerRowId) ?? null;

  app.innerHTML = `
    <main class="app">
      <section class="toolbar">
        <div class="title-row">
          <div class="title">MIoT Log Inspector</div>
          <div class="count">${state.rows.length} rows</div>
        </div>
        <div class="search-row">
          ${renderSearchInput("keyword-search", "全文搜索", state.keywordQuery)}
          ${renderSearchInput("property-search", "sp: 2.2 2.3", state.propertyQuery)}
          ${renderSearchInput("action-search", "sa: 2.5 2.6", state.actionQuery)}
        </div>
        <div class="copy-row">
          <span>${state.selectedRowIds.size} selected</span>
          <span class="copy-actions">
            <button class="button compact" data-action="refresh">刷新</button>
            <button class="button compact" data-action="select-results">选择当前结果</button>
            <button class="button compact" data-action="clear-selection">清空</button>
            <button class="button primary compact" data-action="copy-selected">复制</button>
          </span>
        </div>
        <div class="search-meta">
          <span>${escapeHtml(state.status)}</span>
        </div>
        ${state.copyStatus ? `<div class="copy-status">${escapeHtml(state.copyStatus)}</div>` : ""}
      </section>

      <section class="row-list">
        ${renderResultArea(resultView.emptyState, rowsToDisplay, detailRow, state.keywordQuery, matches)}
      </section>

      ${detailRow ? renderDetailDrawer(detailRow, matches, parsedQuery) : ""}
    </main>
  `;

  bindEvents(matches);
}

function renderSearchInput(action: string, placeholder: string, value: string): string {
  return `
    <span class="search-field">
      <input class="search-input" data-action="${action}" value="${escapeAttribute(value)}" placeholder="${escapeAttribute(placeholder)}" />
      ${
        value
          ? `<button class="clear-search-button" type="button" data-clear-search="${action}" aria-label="清空${escapeAttribute(placeholder)}"></button>`
          : ""
      }
    </span>
  `;
}

function renderResultArea(
  emptyState: ReturnType<typeof getResultViewModel>["emptyState"],
  rows: LogRow[],
  detailRow: LogRow | null,
  query: string,
  matches: SearchMatch[]
): string {
  if (emptyState) {
    return renderEmptyState(emptyState);
  }

  return renderRows(rows, detailRow, query, matches);
}

function renderRows(
  rows: LogRow[],
  detailRow: LogRow | null,
  query: string,
  matches: SearchMatch[]
): string {
  return `
    <div class="row-heading">
      <span></span>
      ${renderHeaderCell(0, "时间")}
      ${renderHeaderCell(1, "类型")}
      ${renderHeaderCell(2, "摘要")}
    </div>
    ${rows
      .map(
        (row) => {
          const matchedPointKeys = getMatchedPointKeysForRow(matches, row);

          return `
          <div class="log-row ${row.id === detailRow?.id ? "selected" : ""}" data-row-id="${row.id}" role="button" tabindex="0">
            <span class="cell checkbox-cell">
              <input type="checkbox" data-row-checkbox="${row.id}" ${state.selectedRowIds.has(row.id) ? "checked" : ""} />
            </span>
            <span class="cell">${escapeHtml(row.timestamp)}</span>
            <span class="cell">${escapeHtml(row.messageType)}</span>
            <span class="cell summary">
              ${renderMatchedPointBadges(matchedPointKeys)}
              ${highlightText(escapeHtml(makeSummary(row)), query)}
            </span>
          </div>
        `;
        }
      )
      .join("")}
  `;
}

function renderHeaderCell(index: number, fallback: string): string {
  return `<span>${escapeHtml(state.tableHeaders[index] || fallback)}</span>`;
}

function renderEmptyState(emptyState: NonNullable<ReturnType<typeof getResultViewModel>["emptyState"]>): string {
  if (emptyState === "no-rows") {
    return `<div class="empty-state"><h2>未读取到日志</h2><p>${escapeHtml(state.status)}</p></div>`;
  }

  if (emptyState === "no-results") {
    return `<div class="empty-state"><h2>没有匹配结果</h2><p>换一个 ` +
      `sp:/sa: 条件或普通关键词试试。</p></div>`;
  }

  return "";
}

function renderDetailDrawer(row: LogRow, matches: SearchMatch[], query: ParsedSearchQuery): string {
  const matchedPointKeys = getMatchedPointKeysForRow(matches, row);

  return `
    <aside class="detail-drawer" aria-label="格式化 JSON 详情">
      <div class="drawer-header">
        <div>
          <div class="drawer-title">${escapeHtml(row.messageType)} · ${escapeHtml(row.timestamp)}</div>
          <div class="drawer-subtitle">Row #${row.rowIndex} · ${row.parseStatus}</div>
        </div>
        <button class="button" data-action="close-drawer">关闭</button>
      </div>
      <div class="drawer-actions">
        ${renderMatchedPointBadges(matchedPointKeys)}
        <button class="button primary" data-action="copy-current">复制当前</button>
      </div>
      <pre class="json-view">${highlightJsonDetail(row, query)}</pre>
    </aside>
  `;
}

function bindEvents(matches: ReturnType<typeof getSearchMatches>): void {
  bindSearchInput("keyword-search", "keywordQuery");
  bindSearchInput("property-search", "propertyQuery");
  bindSearchInput("action-search", "actionQuery");

  function bindSearchInput(action: string, field: "keywordQuery" | "propertyQuery" | "actionQuery"): void {
    const searchInput = app.querySelector<HTMLInputElement>(`[data-action="${action}"]`);
    const clearButton = app.querySelector<HTMLButtonElement>(`[data-clear-search="${action}"]`);

    searchInput?.addEventListener("compositionstart", () => {
      state.isComposingSearch = true;
    });

    searchInput?.addEventListener("compositionend", (event) => {
      state.isComposingSearch = false;
      const input = event.currentTarget as HTMLInputElement;
      applySearchValue(field, input.value, {
        action,
        start: input.selectionStart,
        end: input.selectionEnd
      });
    });

    searchInput?.addEventListener("input", (event) => {
      const input = event.currentTarget as HTMLInputElement;

      if (shouldDeferSearchRender(event, state.isComposingSearch)) {
        state[field] = input.value;
        return;
      }

      applySearchValue(field, input.value, {
        action,
        start: input.selectionStart,
        end: input.selectionEnd
      });
    });

    clearButton?.addEventListener("click", () => {
      state.isComposingSearch = false;
      applySearchValue(field, "", {
        action,
        start: 0,
        end: 0
      });
    });
  }

  app.querySelector<HTMLButtonElement>('[data-action="refresh"]')?.addEventListener("click", () => {
    void refreshRows();
  });

  app.querySelectorAll<HTMLElement>("[data-row-id]").forEach((rowElement) => {
    const activateRow = () => {
      const row = state.rows.find((candidate) => candidate.id === rowElement.dataset.rowId);
      if (row) {
        openDetailDrawer(row, matches);
      }
    };

    rowElement.addEventListener("click", (event) => {
      if (isSelectionControlEvent(event)) {
        return;
      }

      activateRow();
    });
    rowElement.addEventListener("keydown", (event) => {
      if (isSelectionControlEvent(event)) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateRow();
      }
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-example-query]").forEach((button) => {
    button.addEventListener("click", () => {
      state.keywordQuery = button.dataset.exampleQuery ?? "";
      state.detailDrawerRowId = null;
      state.selectedRowIds.clear();
      state.copyStatus = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>('[data-action="close-drawer"]')?.addEventListener("click", () => {
    state.detailDrawerRowId = null;
    renderPreservingRowListScroll();
  });

  app.querySelector<HTMLButtonElement>('[data-action="copy-current"]')?.addEventListener("click", () => {
    void copyCurrentDrawerRow(matches);
  });

  app.querySelectorAll<HTMLInputElement>("[data-row-checkbox]").forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      const rowId = checkbox.dataset.rowCheckbox;

      if (!rowId) {
        return;
      }

      if (checkbox.checked) {
        state.selectedRowIds.add(rowId);
      } else {
        state.selectedRowIds.delete(rowId);
      }

      state.copyStatus = "";
      renderPreservingRowListScroll();
    });
  });

  app.querySelector<HTMLButtonElement>('[data-action="select-results"]')?.addEventListener("click", () => {
    const rowsToSelect = getVisibleRows(matches);
    rowsToSelect.forEach((row) => state.selectedRowIds.add(row.id));
    state.copyStatus = `${rowsToSelect.length} rows selected`;
    renderPreservingRowListScroll();
  });

  app.querySelector<HTMLButtonElement>('[data-action="clear-selection"]')?.addEventListener("click", () => {
    state.selectedRowIds.clear();
    state.copyStatus = "";
    renderPreservingRowListScroll();
  });

  app.querySelector<HTMLButtonElement>('[data-action="copy-selected"]')?.addEventListener("click", () => {
    void copySelectedRows(matches);
  });
}

function isSelectionControlEvent(event: Event): boolean {
  return (
    event.target instanceof Element &&
    Boolean(event.target.closest("[data-row-checkbox]"))
  );
}

function openDetailDrawer(row: LogRow, matches: SearchMatch[] = getSearchMatches(state.searchIndex, getParsedSearchQuery())): void {
  state.detailDrawerRowId = row.id;
  renderPreservingRowListScroll();
}

function renderPreservingRowListScroll(): void {
  const rowList = app.querySelector<HTMLElement>(".row-list");
  const scrollTop = rowList?.scrollTop ?? 0;

  render();

  const nextRowList = app.querySelector<HTMLElement>(".row-list");

  if (nextRowList) {
    nextRowList.scrollTop = scrollTop;
  }
}

function applySearchValue(
  field: "keywordQuery" | "propertyQuery" | "actionQuery",
  query: string,
  searchFocus: SearchFocusRequest
): void {
  state[field] = query;
  state.copyStatus = "";
  state.detailDrawerRowId = null;
  state.selectedRowIds.clear();
  render();
  restoreSearchFocus(searchFocus);
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isSupportedUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith("https://iot.mi.com/"));
}

async function extractLogsFromTab(tabId: number): Promise<ExtractLogsResponse> {
  try {
    return await sendExtractLogs(tabId);
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw error;
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["assets/content.js"]
  });

  return sendExtractLogs(tabId);
}

async function sendExtractLogs(tabId: number): Promise<ExtractLogsResponse> {
  return chrome.tabs.sendMessage<unknown, ExtractLogsResponse>(tabId, {
    type: "EXTRACT_LOGS"
  });
}

function isMissingContentScriptError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Receiving end does not exist");
}

function restoreSearchFocus(request: SearchFocusRequest): void {
  const input = app.querySelector<HTMLInputElement>(`[data-action="${request.action}"]`);

  if (!input) {
    return;
  }

  input.focus();

  if (request.start !== null && request.end !== null) {
    input.setSelectionRange(request.start, request.end);
  }
}

function makeSummary(row: LogRow): string {
  const source = row.rawMessage.replace(/\s+/g, " ");
  return source.length > 220 ? `${source.slice(0, 220)}...` : source;
}

function getVisibleRows(matches: SearchMatch[]): LogRow[] {
  const resultView = getResultViewModel(state.rows, matches, hasSearchValue() ? "1" : "");
  return resultView.rowsToDisplay;
}

async function copySelectedRows(matches: SearchMatch[]): Promise<void> {
  const selectedRows = getVisibleRows(matches).filter((row) => state.selectedRowIds.has(row.id));
  const fallbackRow = state.rows.find((row) => row.id === state.detailDrawerRowId);
  const rowsToCopy = selectedRows.length ? selectedRows : fallbackRow ? [fallbackRow] : [];

  if (!rowsToCopy.length) {
    state.copyStatus = "没有可复制的日志";
    renderPreservingRowListScroll();
    return;
  }

  const markdown = formatRowsAsMarkdown(
    rowsToCopy.map((row) => ({
      row,
      matchedPointKeys: getMatchedPointKeysForRow(matches, row)
    }))
  );

  try {
    await navigator.clipboard.writeText(markdown);
    state.copyStatus = `已复制 ${rowsToCopy.length} 条日志`;
  } catch (error) {
    state.copyStatus = error instanceof Error ? `复制失败：${error.message}` : "复制失败";
  }

  renderPreservingRowListScroll();
}

async function copyCurrentDrawerRow(matches: SearchMatch[]): Promise<void> {
  const row = state.rows.find((candidate) => candidate.id === state.detailDrawerRowId);

  if (!row) {
    state.copyStatus = "没有打开的日志详情";
    renderPreservingRowListScroll();
    return;
  }

  const markdown = formatRowsAsMarkdown([
    {
      row,
      matchedPointKeys: getMatchedPointKeysForRow(matches, row)
    }
  ]);

  try {
    await navigator.clipboard.writeText(markdown);
    state.copyStatus = "已复制当前日志";
  } catch (error) {
    state.copyStatus = error instanceof Error ? `复制失败：${error.message}` : "复制失败";
  }

  renderPreservingRowListScroll();
}

function getMatchedPointKeysForRow(matches: SearchMatch[], row: LogRow): string[] {
  return matches.find((match) => match.row.id === row.id)?.matchedPointKeys ?? [];
}

function renderMatchedPointBadges(keys: string[]): string {
  if (!keys.length) {
    return "";
  }

  return `<span class="point-badges">${keys.map((key) => `<span class="point-badge">${escapeHtml(key)}</span>`).join("")}</span>`;
}

function highlightText(escapedText: string, query: string): string {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return escapedText;
  }

  const escapedQuery = escapeRegExp(escapeHtml(normalizedQuery));
  return escapedText.replace(new RegExp(escapedQuery, "gi"), (match) => `<mark>${match}</mark>`);
}

function highlightJsonDetail(row: LogRow, query: ParsedSearchQuery): string {
  return renderJsonWithStructuredMatches(row.parsedMessage, query);
}

function getParsedSearchQuery(): ParsedSearchQuery {
  return parseSearchFields({
    keyword: state.keywordQuery,
    propertyPoints: state.propertyQuery,
    actionPoints: state.actionQuery
  });
}

function hasSearchValue(): boolean {
  return Boolean(
    state.keywordQuery.trim() ||
      state.propertyQuery.trim() ||
      state.actionQuery.trim()
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
