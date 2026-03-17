// ── llm_rule_service 对齐格式 ──

/** 状态上报请求 — POST /api/v1/status/report */
export interface StatusReportRequest {
  deviceId: string;
  snapshots: SnapshotEntry[];       // datatray 快照数组
  statechain?: StateChainEntry[];   // 状态链数组（扩展字段）
}

export interface SnapshotEntry {
  timestamp: number;
  signals: Record<string, unknown>;
}

export interface StateChainEntry {
  timestamp: number;
  chain: Record<string, unknown>;   // chainId, transition, matchedRules, etc.
}

/** 状态上报响应 */
export interface StatusReportResponse {
  success: boolean;
  received: { snapshots: number; statechain: number };
}

/** 规则拉取响应 — GET /api/v1/rules */
export interface RulesResponse {
  rules: unknown[];
  serverTime: number;
}

/** 规则反馈请求 — POST /api/v1/rules/feedback */
export interface RuleFeedbackRequest {
  deviceId: string;
  ruleId: string;
  errorType: string;    // load_failed / condition_invalid / action_failed
  detail: string;
  timestamp: number;
}

/** 健康检查响应 — GET /api/v1/status */
export interface StatusResponse {
  status: string;
  uptime: number;
  files: Record<string, { lines: number; sizeKB: number }>;
}

// ── 内部存储类型 ──

export type StorageType = 'datatray' | 'statechain' | 'feedback';

export interface StoredRecord {
  deviceId: string;
  timestamp: number;
  receivedAt: number;
  data: Record<string, unknown>;
}
