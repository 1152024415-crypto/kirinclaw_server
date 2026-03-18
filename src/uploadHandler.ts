import { Request, Response } from 'express';
import {
  StatusReportRequest, StatusReportResponse,
  RuleFeedbackRequest, RulesResponse,
  SnapshotEntry, StateChainEntry, StoredRecord,
} from './types';
import { ContextRule } from './shared/types';
import { appendRecords } from './storage';
import { generateJson } from './llm/llmClient';
import { buildSystemPrompt, buildUserPrompt } from './llm/promptTemplate';
import { validateRule } from './validation';
import { saveRule, loadAllRules, saveTrace } from './ruleStore';

/**
 * POST /api/v1/status/report
 * 接收状态上报 — 对齐 llm_rule_service 格式
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
 * 拉取规则 — 返回已存储的规则列表
 */
export function handleGetRules(req: Request, res: Response): void {
  const deviceId = req.query['deviceId'] || 'unknown';
  const now = new Date().toISOString();

  const storedRules = loadAllRules();
  const rules = storedRules.map(sr => sr.rule);

  console.log(`[${now}] [rules] GET rules for deviceId=${deviceId}, returning ${rules.length} rules`);

  const response: RulesResponse = {
    rules,
    serverTime: Date.now(),
  };
  res.status(200).json(response);
}

/**
 * POST /api/v1/rules/feedback
 * 规则反馈 — 记录到 feedback JSONL
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
 * 自然语言→规则 — 调用 DeepSeek LLM 生成规则
 */
export async function handleDescribeRule(req: Request, res: Response): Promise<void> {
  const now = new Date().toISOString();
  const body = req.body as { deviceId?: string; description?: string };
  const deviceId = body.deviceId || 'unknown';
  const description = body.description || '';

  console.log(`[${now}] [describe] START deviceId=${deviceId} description="${description}"`);

  if (!description) {
    res.status(400).json({ success: false, error: 'Missing description' });
    return;
  }

  // 1. Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(description);

  // 2. Call LLM
  let llmContent: string;
  let llmModel = '';
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    console.log(`[${now}] [describe] calling DeepSeek LLM...`);
    const llmResponse = await generateJson(systemPrompt, userPrompt);
    llmContent = llmResponse.content;
    llmModel = llmResponse.model;
    if (llmResponse.usage) {
      promptTokens = llmResponse.usage.promptTokens;
      completionTokens = llmResponse.usage.completionTokens;
    }
    console.log(`[${now}] [describe] LLM responded: model=${llmModel} tokens=${promptTokens}+${completionTokens} content_length=${llmContent.length}`);
  } catch (err) {
    const errMsg = (err as Error).message;
    console.log(`[${now}] [describe] LLM ERROR: ${errMsg}`);
    res.status(500).json({ success: false, error: `LLM request failed: ${errMsg}` });
    return;
  }

  // 3. Parse JSON
  let ruleData: Record<string, unknown>;
  try {
    ruleData = JSON.parse(llmContent) as Record<string, unknown>;
  } catch {
    console.log(`[${now}] [describe] JSON parse failed: ${llmContent.substring(0, 200)}`);
    res.status(500).json({ success: false, error: 'LLM returned invalid JSON', raw: llmContent.substring(0, 500) });
    return;
  }

  // 4. Inject required fields
  const ruleId = `desc_${Date.now()}`;
  ruleData['id'] = ruleId;
  if (!ruleData['enabled']) ruleData['enabled'] = true;
  if (!ruleData['cooldownMs']) ruleData['cooldownMs'] = 3600000;
  if (!ruleData['priority']) ruleData['priority'] = 3;

  // 5. Validate
  const validation = validateRule(ruleData);
  if (!validation.valid) {
    console.log(`[${now}] [describe] VALIDATION FAILED: ${validation.errors.join('; ')}`);
    res.status(400).json({
      success: false,
      error: 'LLM generated invalid rule',
      validation,
      raw: ruleData,
    });
    return;
  }

  if (validation.warnings.length > 0) {
    console.log(`[${now}] [describe] WARNINGS: ${validation.warnings.join('; ')}`);
  }

  // 6. Store rule
  const rule = ruleData as unknown as ContextRule;
  saveRule({
    id: ruleId,
    name: (rule.name || description),
    source: 'described',
    createdBy: deviceId,
    createdAt: Date.now(),
    rule,
  });

  // 7. Store trace
  saveTrace({
    ruleId,
    sourceType: 'user_description',
    description,
    llmProvider: 'deepseek',
    llmModel,
    promptTokens,
    completionTokens,
    createdAt: Date.now(),
  });

  console.log(`[${now}] [describe] OK: ruleId=${ruleId} name="${rule.name}" conditions=${rule.conditions?.length || 0}`);

  // 8. Return
  res.status(200).json({
    success: true,
    rule,
    validation,
  });
}
