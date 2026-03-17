import express from 'express';
import { handleStatusReport, handleGetRules, handleRuleFeedback } from './uploadHandler';
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

// ── llm_rule_service API (v1) ──
app.post('/api/v1/status/report', handleStatusReport);    // 状态上报 (datatray + statechain)
app.get('/api/v1/rules', handleGetRules);                  // 规则拉取 (占位)
app.post('/api/v1/rules/feedback', handleRuleFeedback);    // 规则反馈 (占位)

// ── 健康检查 ──
app.get('/api/v1/status', handleStatus);

ensureDataDir();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KirinClaw server running on port ${PORT} (all interfaces)`);
  console.log(`  POST /api/v1/status/report   — 状态上报`);
  console.log(`  GET  /api/v1/rules           — 规则拉取`);
  console.log(`  POST /api/v1/rules/feedback  — 规则反馈`);
  console.log(`  GET  /api/v1/status          — 健康检查`);
});
