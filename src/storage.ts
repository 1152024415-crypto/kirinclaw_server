import * as fs from 'fs';
import * as path from 'path';
import { StoredRecord, UploadType } from './types';

export const DATA_DIR = path.join(__dirname, '..', 'data');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getFileName(type: UploadType): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${type}-${yyyy}-${mm}-${dd}.jsonl`;
}

export function appendRecords(type: UploadType, records: StoredRecord[]): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, getFileName(type));
  const lines = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(filePath, lines, 'utf-8');
}

export function getDataFiles(): Record<string, { lines: number; sizeKB: number }> {
  ensureDataDir();
  const result: Record<string, { lines: number; sizeKB: number }> = {};
  const files = fs.readdirSync(DATA_DIR);
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim() === '' ? 0 : content.trim().split('\n').length;
    const sizeKB = Math.round((stat.size / 1024) * 100) / 100;
    result[file] = { lines, sizeKB };
  }
  return result;
}
