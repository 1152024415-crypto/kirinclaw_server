export type UploadType = 'datatray' | 'statechain' | 'suggestion';

export const VALID_TYPES: UploadType[] = ['datatray', 'statechain', 'suggestion'];

export interface UploadRecord {
  uploadId: string;
  deviceId: string;
  timestamp: number;
  type: UploadType;
  payload: Record<string, unknown>;
}

export interface StoredRecord {
  uploadId: string;
  deviceId: string;
  timestamp: number;
  receivedAt: number;
  payload: Record<string, unknown>;
}

export interface UploadResponse {
  success: boolean;
  received: number;
  breakdown: Record<UploadType, number>;
}

export interface StatusResponse {
  status: string;
  uptime: number;
  files: Record<string, { lines: number; sizeKB: number }>;
}
