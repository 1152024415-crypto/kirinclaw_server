import express from 'express';
import { handleUpload } from './uploadHandler';
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

app.post('/api/upload', handleUpload);
app.get('/api/status', handleStatus);

ensureDataDir();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KirinClaw server running on port ${PORT} (all interfaces)`);
  console.log(`  POST /api/upload`);
  console.log(`  GET  /api/status`);
});
