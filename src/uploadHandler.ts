import { Request, Response } from 'express';
import { UploadRecord, UploadType, VALID_TYPES, StoredRecord, UploadResponse } from './types';
import { appendRecords } from './storage';

export function handleUpload(req: Request, res: Response): void {
  const body = req.body;

  if (!Array.isArray(body) || body.length === 0) {
    res.status(400).json({ success: false, error: 'Body must be a non-empty array' });
    return;
  }

  const grouped: Partial<Record<UploadType, StoredRecord[]>> = {};
  let received = 0;

  for (const record of body as UploadRecord[]) {
    if (!VALID_TYPES.includes(record.type)) {
      continue;
    }

    const stored: StoredRecord = {
      uploadId: record.uploadId,
      deviceId: record.deviceId,
      timestamp: record.timestamp,
      receivedAt: Date.now(),
      payload: record.payload,
    };

    if (!grouped[record.type]) {
      grouped[record.type] = [];
    }
    grouped[record.type]!.push(stored);
    received++;
  }

  const breakdown = {} as Record<UploadType, number>;

  for (const type of VALID_TYPES) {
    const records = grouped[type];
    if (records && records.length > 0) {
      appendRecords(type, records);
      breakdown[type] = records.length;
    } else {
      breakdown[type] = 0;
    }
  }

  const response: UploadResponse = { success: true, received, breakdown };

  console.log(`[upload] received=${received} breakdown=${JSON.stringify(breakdown)}`);
  res.status(200).json(response);
}
