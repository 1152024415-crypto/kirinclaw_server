import express from 'express';
import { handleStatusReport, handleGetRules, handleRuleFeedback, handleDescribeRule } from './uploadHandler';
import { handleAdminGetRules, handleAdminUpdateRule, handleAdminDeleteRule } from './adminHandler';
import { handleStatus } from './statusHandler';
import { ensureDataDir } from './storage';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

// Log all incoming requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip || req.socket.remoteAddress}`);
  next();
});

// ── App API (v1) ──
app.post('/api/v1/status/report', handleStatusReport);     // 状态上报 (datatray + statechain)
app.get('/api/v1/rules', handleGetRules);                   // 规则拉取
app.post('/api/v1/rules/feedback', handleRuleFeedback);     // 规则异常反馈
app.post('/api/v1/rules/describe', handleDescribeRule);     // 自然语言→规则 (Phase 2 占位)

// ── Admin API (v1) ──
app.get('/api/v1/admin/rules', handleAdminGetRules);        // 查看全量规则
app.put('/api/v1/admin/rules/:id', handleAdminUpdateRule);  // 修改规则
app.delete('/api/v1/admin/rules/:id', handleAdminDeleteRule); // 删除规则

// ── 健康检查 ──
app.get('/api/v1/status', handleStatus);

ensureDataDir();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KirinClaw server running on port ${PORT} (all interfaces)`);
  console.log(`  App API:`);
  console.log(`    POST /api/v1/status/report   — 状态上报`);
  console.log(`    GET  /api/v1/rules           — 规则拉取`);
  console.log(`    POST /api/v1/rules/feedback  — 规则异常反馈`);
  console.log(`    POST /api/v1/rules/describe  — 自然语言→规则 (Phase 2)`);
  console.log(`  Admin API:`);
  console.log(`    GET    /api/v1/admin/rules        — 查看全量规则`);
  console.log(`    PUT    /api/v1/admin/rules/:id    — 修改规则`);
  console.log(`    DELETE /api/v1/admin/rules/:id    — 删除规则`);
  console.log(`  Health:`);
  console.log(`    GET  /api/v1/status          — 健康检查`);
});
