/**
 * validation.ts — 规则静态校验模块
 *
 * 在规则入库/分发前校验合法性。四个维度：
 * 1. 结构校验 — 必填字段、类型
 * 2. 语义校验 — condition key 是否合法、op 是否合法
 * 3. 安全校验 — priority/cooldown/timeout 范围
 * 4. 共享检测 — 是否含个人标识 (wifiSsid 等)
 */

import {
  ContextRule, ContextCondition,
  KNOWN_SIGNAL_KEYS, VALID_OPS, VALID_ACTION_TYPES, VALID_CATEGORIES,
} from './shared/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];     // 阻断性错误 (不合法，不能入库)
  warnings: string[];   // 非阻断警告 (可入库，但需关注)
}

/**
 * 校验一条规则
 */
export function validateRule(rule: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rule || typeof rule !== 'object') {
    return { valid: false, errors: ['Rule must be a non-null object'], warnings };
  }

  const r = rule as Record<string, unknown>;

  // ── 1. 结构校验 ──

  // id: 必填 string
  if (typeof r['id'] !== 'string' || (r['id'] as string).length === 0) {
    errors.push('Missing or empty "id"');
  }

  // name: 必填 string
  if (typeof r['name'] !== 'string' || (r['name'] as string).length === 0) {
    errors.push('Missing or empty "name"');
  }

  // conditions: 必填 array, 至少一个条件
  if (!Array.isArray(r['conditions'])) {
    errors.push('"conditions" must be an array');
  } else if ((r['conditions'] as unknown[]).length === 0) {
    errors.push('"conditions" must have at least one condition');
  }

  // priority: 必填 number
  if (typeof r['priority'] !== 'number') {
    errors.push('"priority" must be a number');
  }

  // cooldownMs: 必填 number
  if (typeof r['cooldownMs'] !== 'number') {
    errors.push('"cooldownMs" must be a number');
  }

  // enabled: 必填 boolean
  if (typeof r['enabled'] !== 'boolean') {
    errors.push('"enabled" must be a boolean');
  }

  // action 或 suggestions 至少有一个
  if (!r['action'] && !r['suggestions']) {
    errors.push('Must have either "action" or "suggestions"');
  }

  // 如果有结构性错误，后续校验跳过
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // ── 2. 语义校验 ──

  const conditions = r['conditions'] as ContextCondition[];
  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];

    // condition 必须有 key, op, value
    if (!cond.key || !cond.op || cond.value === undefined) {
      errors.push(`conditions[${i}]: missing key, op, or value`);
      continue;
    }

    // key 必须是已知信号
    if (!KNOWN_SIGNAL_KEYS.includes(cond.key)) {
      warnings.push(`conditions[${i}]: unknown signal key "${cond.key}"`);
    }

    // op 必须合法
    if (!VALID_OPS.includes(cond.op)) {
      errors.push(`conditions[${i}]: invalid op "${cond.op}", must be one of: ${VALID_OPS.join(', ')}`);
    }
  }

  // excludeConditions 校验
  if (Array.isArray(r['excludeConditions'])) {
    const groups = r['excludeConditions'] as ContextCondition[][];
    for (let g = 0; g < groups.length; g++) {
      if (!Array.isArray(groups[g])) {
        errors.push(`excludeConditions[${g}]: must be an array of conditions`);
        continue;
      }
      for (let c = 0; c < groups[g].length; c++) {
        const cond = groups[g][c];
        if (cond.key && !KNOWN_SIGNAL_KEYS.includes(cond.key)) {
          warnings.push(`excludeConditions[${g}][${c}]: unknown signal key "${cond.key}"`);
        }
      }
    }
  }

  // action type 校验
  if (r['action']) {
    const action = r['action'] as Record<string, unknown>;
    if (action['type'] && !VALID_ACTION_TYPES.includes(action['type'] as string)) {
      warnings.push(`action.type "${action['type']}" not in known types: ${VALID_ACTION_TYPES.join(', ')}`);
    }
  }

  // suggestions type 校验
  if (Array.isArray(r['suggestions'])) {
    const suggestions = r['suggestions'] as Array<Record<string, unknown>>;
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      if (s['type'] && !VALID_ACTION_TYPES.includes(s['type'] as string)) {
        warnings.push(`suggestions[${i}].type "${s['type']}" not in known types`);
      }
    }
  }

  // category 校验
  if (r['category'] && !VALID_CATEGORIES.includes(r['category'] as string)) {
    warnings.push(`category "${r['category']}" not in known categories: ${VALID_CATEGORIES.join(', ')}`);
  }

  // ── 3. 安全校验 ──

  const priority = r['priority'] as number;
  if (priority < 0 || priority > 10) {
    errors.push(`priority ${priority} out of range [0, 10]`);
  }

  const cooldownMs = r['cooldownMs'] as number;
  if (cooldownMs < 0) {
    errors.push(`cooldownMs ${cooldownMs} must not be negative`);
  }
  if (cooldownMs > 86400000) { // 24 hours
    warnings.push(`cooldownMs ${cooldownMs}ms (${Math.round(cooldownMs / 3600000)}h) is very long`);
  }

  if (r['timeoutMs'] !== undefined) {
    const timeoutMs = r['timeoutMs'] as number;
    if (timeoutMs < 0) {
      errors.push(`timeoutMs ${timeoutMs} must not be negative`);
    }
    if (timeoutMs > 86400000) {
      warnings.push(`timeoutMs ${timeoutMs}ms (${Math.round(timeoutMs / 3600000)}h) is very long`);
    }
  }

  // ── 4. 共享检测 ──

  // 检查条件中是否包含个人标识 (具体 wifiSsid、地名等)
  const personalKeys = ['wifiSsid', 'cellId', 'bt_device_names', 'latitude', 'longitude'];
  for (const cond of conditions) {
    if (personalKeys.includes(cond.key)) {
      warnings.push(`Contains personal identifier "${cond.key}" in conditions — should be marked as personal rule, not shared`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 批量校验规则数组
 */
export function validateRules(rules: unknown[]): { valid: ContextRule[]; invalid: Array<{ rule: unknown; result: ValidationResult }> } {
  const valid: ContextRule[] = [];
  const invalid: Array<{ rule: unknown; result: ValidationResult }> = [];

  for (const rule of rules) {
    const result = validateRule(rule);
    if (result.valid) {
      valid.push(rule as ContextRule);
    } else {
      invalid.push({ rule, result });
    }
  }

  return { valid, invalid };
}
