/**
 * adminHandler.ts — 管理 API
 *
 * 规则的 CRUD 管理接口，供管理员使用。
 * 当前使用 JSONL 文件存储，后续迁移 PostgreSQL。
 */

import { Request, Response } from 'express';
import { validateRule } from './validation';

/**
 * GET /api/v1/admin/rules
 * 查看全量规则 — 占位
 */
export function handleAdminGetRules(_req: Request, res: Response): void {
  console.log(`[${new Date().toISOString()}] [admin] GET rules`);

  // TODO: 从存储读取规则列表
  res.status(200).json({
    rules: [],
    total: 0,
    message: 'Rule storage not yet implemented. Rules are currently managed in client-side default_rules.json.',
  });
}

/**
 * PUT /api/v1/admin/rules/:id
 * 修改规则 — 校验后存储
 */
export function handleAdminUpdateRule(req: Request, res: Response): void {
  const ruleId = req.params['id'];
  const now = new Date().toISOString();
  console.log(`[${now}] [admin] PUT rule ${ruleId}`);

  const body = req.body;

  // 校验规则
  const result = validateRule(body);
  if (!result.valid) {
    console.log(`[${now}] [admin] REJECTED rule ${ruleId}: ${result.errors.join('; ')}`);
    res.status(400).json({
      success: false,
      errors: result.errors,
      warnings: result.warnings,
    });
    return;
  }

  if (result.warnings.length > 0) {
    console.log(`[${now}] [admin] WARNINGS for rule ${ruleId}: ${result.warnings.join('; ')}`);
  }

  // TODO: 存储规则到持久化存储
  console.log(`[${now}] [admin] Rule ${ruleId} validated OK (storage not yet implemented)`);
  res.status(200).json({
    success: true,
    ruleId,
    validation: result,
    message: 'Rule validated successfully. Persistent storage not yet implemented.',
  });
}

/**
 * DELETE /api/v1/admin/rules/:id
 * 删除规则
 */
export function handleAdminDeleteRule(req: Request, res: Response): void {
  const ruleId = req.params['id'];
  console.log(`[${new Date().toISOString()}] [admin] DELETE rule ${ruleId}`);

  // TODO: 从存储删除规则
  res.status(200).json({
    success: true,
    ruleId,
    message: 'Rule deletion not yet implemented. Rules are currently managed in client-side default_rules.json.',
  });
}
