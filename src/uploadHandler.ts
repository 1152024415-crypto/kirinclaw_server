import { Request, Response } from 'express';
import {
  StatusReportRequest, StatusReportResponse,
  RuleFeedbackRequest, RulesResponse,
  SnapshotEntry, StateChainEntry, StoredRecord
} from './types';
import { appendRecords } from './storage';

/**
 * POST /api/v1/status/report
 * 接收状态上报 — 对齐 llm_rule_service 格式
 *
 * Body: { deviceId, snapshots: [{timestamp, signals}], statechain?: [{timestamp, chain}] }
 */
export function handleStatusReport(req: Request, res: Response): void {
  const now = new Date().toISOString();
  const body = req.body as StatusReportRequest;

  if (!body.deviceId || !body.snapshots) {
    console.log(`[${now}] [report] REJECTED: missing deviceId or snapshots`);
    res.status(400).json({ success: false, error: 'Missing deviceId or snapshots' });
    return;
  }

  const deviceId = body.deviceId;
  const receivedAt = Date.now();

  // Store snapshots → datatray JSONL
  let snapshotCount = 0;
  if (Array.isArray(body.snapshots) && body.snapshots.length > 0) {
    const records: StoredRecord[] = body.snapshots.map((s: SnapshotEntry) => ({
      deviceId,
      timestamp: s.timestamp,
      receivedAt,
      data: s.signals,
    }));
    appendRecords('datatray', records);
    snapshotCount = records.length;

    const firstKeys = Object.keys(body.snapshots[0].signals || {});
    console.log(`[${now}] [report] datatray: ${snapshotCount} snapshots, first keys=[${firstKeys.slice(0, 10).join(',')}${firstKeys.length > 10 ? ',...' : ''}]`);
  }

  // Store statechain → statechain JSONL
  let statechainCount = 0;
  if (Array.isArray(body.statechain) && body.statechain.length > 0) {
    const records: StoredRecord[] = body.statechain.map((s: StateChainEntry) => ({
      deviceId,
      timestamp: s.timestamp,
      receivedAt,
      data: s.chain,
    }));
    appendRecords('statechain', records);
    statechainCount = records.length;

    const firstChain = body.statechain[0].chain || {};
    console.log(`[${now}] [report] statechain: ${statechainCount} entries, first chainId=${(firstChain as Record<string, unknown>)['chainId'] ?? '?'}`);
  }

  const response: StatusReportResponse = {
    success: true,
    received: { snapshots: snapshotCount, statechain: statechainCount },
  };

  console.log(`[${now}] [report] OK: deviceId=${deviceId} snapshots=${snapshotCount} statechain=${statechainCount}`);
  res.status(200).json(response);
}

/**
 * GET /api/v1/rules?deviceId=xxx
 * 拉取规则 — 占位，返回空列表
 */
export function handleGetRules(req: Request, res: Response): void {
  const deviceId = req.query['deviceId'] || 'unknown';
  console.log(`[${new Date().toISOString()}] [rules] GET rules for deviceId=${deviceId} (placeholder, returning empty)`);

  const response: RulesResponse = {
    rules: [],
    serverTime: Date.now(),
  };
  res.status(200).json(response);
}

/**
 * POST /api/v1/rules/feedback
 * 规则反馈 — 占位，记录到 feedback JSONL
 */
export function handleRuleFeedback(req: Request, res: Response): void {
  const now = new Date().toISOString();
  const body = req.body as RuleFeedbackRequest;

  if (!body.deviceId || !body.ruleId) {
    res.status(400).json({ success: false, error: 'Missing deviceId or ruleId' });
    return;
  }

  const record: StoredRecord = {
    deviceId: body.deviceId,
    timestamp: body.timestamp || Date.now(),
    receivedAt: Date.now(),
    data: {
      ruleId: body.ruleId,
      errorType: body.errorType,
      detail: body.detail,
    },
  };

  appendRecords('feedback', [record]);
  console.log(`[${now}] [feedback] ruleId=${body.ruleId} errorType=${body.errorType} deviceId=${body.deviceId}`);
  res.status(200).json({ success: true });
}

/**
 * POST /api/v1/rules/describe
 * 自然语言→规则 — Phase 2 占位
 */
export function handleDescribeRule(req: Request, res: Response): void {
  const body = req.body as { deviceId?: string; description?: string };
  console.log(`[${new Date().toISOString()}] [describe] deviceId=${body.deviceId || '?'} description="${body.description || ''}"`);

  res.status(501).json({
    success: false,
    error: 'Not implemented — Phase 2 feature. Requires LLM integration.',
  });
}
