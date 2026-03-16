import express from 'express';
import { handleUpload } from './uploadHandler';
import { handleStatus } from './statusHandler';
import { ensureDataDir } from './storage';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

app.post('/api/upload', handleUpload);
app.get('/api/status', handleStatus);

ensureDataDir();

app.listen(PORT, () => {
  console.log(`KirinClaw server running at http://localhost:${PORT}`);
  console.log(`  POST /api/upload`);
  console.log(`  GET  /api/status`);
});
