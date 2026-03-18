/**
 * ruleStore.ts — 规则存储
 *
 * 使用 JSONL 文件存储规则和溯源记录。
 * 后续迁移 PostgreSQL 时替换此模块。
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContextRule } from './shared/types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const RULES_FILE = path.join(DATA_DIR, 'rules.jsonl');
const TRACES_FILE = path.join(DATA_DIR, 'rule_traces.jsonl');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ── 规则存储 ──

export interface StoredRule {
  id: string;
  name: string;
  source: 'default' | 'discovered' | 'described' | 'user';
  createdBy: string;       // deviceId
  createdAt: number;
  rule: ContextRule;
}

/**
 * 保存一条规则
 */
export function saveRule(storedRule: StoredRule): void {
  ensureDataDir();
  const line = JSON.stringify(storedRule) + '\n';
  fs.appendFileSync(RULES_FILE, line, 'utf-8');
}

/**
 * 读取所有规则
 */
export function loadAllRules(): StoredRule[] {
  ensureDataDir();
  if (!fs.existsSync(RULES_FILE)) return [];

  const content = fs.readFileSync(RULES_FILE, 'utf-8').trim();
  if (!content) return [];

  const rules: StoredRule[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      rules.push(JSON.parse(line) as StoredRule);
    } catch {
      // skip malformed lines
    }
  }
  return rules;
}

/**
 * 根据 ID 查找规则
 */
export function findRuleById(id: string): StoredRule | undefined {
  const rules = loadAllRules();
  return rules.find(r => r.id === id);
}

/**
 * 删除规则（重写文件，排除指定 ID）
 */
export function deleteRule(id: string): boolean {
  const rules = loadAllRules();
  const filtered = rules.filter(r => r.id !== id);
  if (filtered.length === rules.length) return false; // not found

  ensureDataDir();
  const content = filtered.map(r => JSON.stringify(r)).join('\n') + (filtered.length > 0 ? '\n' : '');
  fs.writeFileSync(RULES_FILE, content, 'utf-8');
  return true;
}

// ── 溯源记录 ──

export interface RuleTrace {
  ruleId: string;
  sourceType: 'user_description' | 'signal_timeline';
  description?: string;     // 用户原始描述
  llmProvider: string;      // deepseek / claude
  llmModel: string;         // deepseek-chat
  promptTokens?: number;
  completionTokens?: number;
  createdAt: number;
}

/**
 * 保存溯源记录
 */
export function saveTrace(trace: RuleTrace): void {
  ensureDataDir();
  const line = JSON.stringify(trace) + '\n';
  fs.appendFileSync(TRACES_FILE, line, 'utf-8');
}
