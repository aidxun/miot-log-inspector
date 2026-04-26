import { parseAndExpandJson } from "../shared/json";
import type { ExtractLogsResponse, LogRow } from "../shared/types";

interface DemoLogInput {
  timestamp: string;
  messageType: string;
  body: string;
}

const demoLogs: DemoLogInput[] = [
  {
    timestamp: "2026-04-26 10:12:03.128",
    messageType: "属性上报",
    body: stringify({
      id: 6443805,
      method: "properties_changed",
      params: [
        { did: "1212651389", siid: 2, piid: 2, value: 4, room: "房间1" },
        { did: "1212651389", siid: 2, piid: 6, value: 0 },
        { did: "1212651389", siid: 3, piid: 1, value: true }
      ]
    })
  },
  {
    timestamp: "2026-04-26 10:12:06.442",
    messageType: "属性读取响应",
    body: stringify({
      id: 6443806,
      result: [
        { did: "1212651389", siid: 2, piid: 2, code: 0, value: 4 },
        { did: "1212651389", siid: 2, piid: 6, code: 0, value: 45 },
        { did: "1212651389", siid: 3, piid: 1, code: 0, value: 51 }
      ]
    })
  },
  {
    timestamp: "2026-04-26 10:12:11.090",
    messageType: "Action 下发",
    body: stringify({
      id: 6443810,
      method: "action",
      params: {
        did: "1212651389",
        siid: 2,
        aiid: 5,
        in: [
          { piid: 1, value: "房间1" },
          { piid: 2, value: "start_clean" }
        ]
      }
    })
  },
  {
    timestamp: "2026-04-26 10:12:11.236",
    messageType: "Action 响应",
    body: stringify({
      id: 6443810,
      result: {
        did: "1212651389",
        siid: 2,
        aiid: 5,
        code: 0,
        out: [{ piid: 2, value: "accepted" }]
      }
    })
  },
  {
    timestamp: "2026-04-26 10:12:17.800",
    messageType: "属性上报",
    body: stringify({
      id: 6443818,
      method: "properties_changed",
      params: [
        { did: "1212651389", siid: 2, piid: 6, value: 72, desc: "nested_payload" },
        { did: "1212651389", siid: 2, piid: 7, value: 51 }
      ],
      ext: stringify({
        nested_payload: {
          source: "scheduler",
          params: [{ siid: 2, piid: 6, value: 72 }]
        }
      })
    })
  },
  {
    timestamp: "2026-04-26 10:12:24.500",
    messageType: "属性上报",
    body: stringify({
      id: 6443824,
      method: "properties_changed",
      params: [
        { did: "1212651389", siid: 5, piid: 1, value: 28.6, unit: "celsius" },
        { did: "1212651389", siid: 5, piid: 2, value: 42, unit: "percent" }
      ]
    })
  },
  {
    timestamp: "2026-04-26 10:12:30.412",
    messageType: "错误响应",
    body: stringify({
      id: 6443830,
      result: [
        { did: "1212651389", siid: 2, piid: 3, code: -704042011, message: "property not writable" },
        { did: "1212651389", siid: 2, piid: 2, code: 0, value: 4 }
      ]
    })
  },
  {
    timestamp: "2026-04-26 10:12:41.002",
    messageType: "事件上报",
    body: stringify({
      id: 6443841,
      method: "event_occured",
      params: {
        did: "1212651389",
        siid: 6,
        eiid: 1,
        arguments: [
          { piid: 1, value: "dock" },
          { piid: 2, value: "low_power" }
        ]
      }
    })
  },
  {
    timestamp: "2026-04-26 10:12:49.331",
    messageType: "Action 下发",
    body: stringify({
      id: 6443849,
      method: "action",
      params: {
        did: "1212651389",
        siid: "3",
        aiid: "2",
        in: [{ piid: 1, value: "pause" }]
      }
    })
  },
  {
    timestamp: "2026-04-26 10:13:01.118",
    messageType: "属性读取响应",
    body: stringify({
      id: 6443861,
      result: [
        { did: "1212651389", siid: "10", piid: "5", code: 0, value: true },
        { did: "1212651389", siid: "10", piid: "6", code: 0, value: "auto" }
      ]
    })
  },
  {
    timestamp: "2026-04-26 10:13:18.774",
    messageType: "透传消息",
    body: stringify({
      id: 6443878,
      method: "raw_message",
      body: "房间1 清扫任务状态发生变化，消息内容很长，用来展示列表 body 单行省略但详情抽屉可以完整查看。",
      traceId: "demo-long-message-001"
    })
  },
  {
    timestamp: "2026-04-26 10:13:28.006",
    messageType: "异常日志",
    body: "{ invalid json from page title"
  }
];

export function createDemoLogTable(): ExtractLogsResponse {
  return {
    type: "EXTRACT_LOGS_RESPONSE",
    headers: ["时间", "消息类型", "消息内容"],
    rows: demoLogs.map(toLogRow)
  };
}

function toLogRow(input: DemoLogInput, rowIndex: number): LogRow {
  const parsed = parseAndExpandJson(input.body);

  return {
    id: `demo-log-row-${rowIndex}`,
    rowIndex,
    timestamp: input.timestamp,
    messageType: input.messageType,
    rawMessage: input.body,
    parsedMessage: parsed.value,
    parseStatus: parsed.status
  };
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}
