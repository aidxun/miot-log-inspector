import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { extractLogsFromDocument, extractLogTableFromDocument } from "../src/content/extractLogs";

describe("extractLogsFromDocument", () => {
  test("extracts all rows from the saved iot.mi.com sample page", () => {
    document.documentElement.innerHTML = readFileSync(
      resolve(__dirname, "../logpage.html"),
      "utf8"
    );

    const rows = extractLogsFromDocument(document);

    expect(rows).toHaveLength(605);
    expect(rows[0]).toMatchObject({
      rowIndex: 0,
      timestamp: "2026-04-26 09:00:00",
      messageType: "下行",
      parseStatus: "parsed"
    });
    expect(rows[0].rawMessage).toContain('"method":"action"');
    expect((rows[0].parsedMessage as { params: { in: Array<{ value: unknown }> } }).params.in[0].value).toEqual(
      expect.any(Object)
    );
  });

  test("extracts table headers from the saved iot.mi.com sample page", () => {
    document.documentElement.innerHTML = readFileSync(
      resolve(__dirname, "../logpage.html"),
      "utf8"
    );

    const table = extractLogTableFromDocument(document);

    expect(table.headers.slice(0, 4)).toEqual(["时间", "消息类型", "消息内容", "操作"]);
    expect(table.rows).toHaveLength(605);
  });

  test("prefers the full title attribute over truncated visible cell text", () => {
    document.body.innerHTML = `
      <section class="device-log-main-log">
        <table>
          <tbody>
            <tr>
              <td>2026-04-26 09:00:00</td>
              <td>上行</td>
              <td><div class="multiLineHide" title="{&quot;full&quot;:true}">{"full":f...</div></td>
              <td>详情</td>
            </tr>
          </tbody>
        </table>
      </section>
    `;

    const [row] = extractLogsFromDocument(document);

    expect(row.rawMessage).toBe('{"full":true}');
    expect(row.parsedMessage).toEqual({ full: true });
  });

  test("falls back to visible message text when title is missing", () => {
    document.body.innerHTML = `
      <section class="device-log-main-log">
        <table>
          <tbody>
            <tr>
              <td>2026-04-26 09:00:00</td>
              <td>下行</td>
              <td><div class="multiLineHide">{"fallback":true}</div></td>
              <td>详情</td>
            </tr>
          </tbody>
        </table>
      </section>
    `;

    const [row] = extractLogsFromDocument(document);

    expect(row.rawMessage).toBe('{"fallback":true}');
    expect(row.parsedMessage).toEqual({ fallback: true });
  });
});
