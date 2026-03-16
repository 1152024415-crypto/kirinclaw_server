import { Request, Response } from 'express';
import { StatusResponse } from './types';
import { getDataFiles } from './storage';

export function handleStatus(_req: Request, res: Response): void {
  const response: StatusResponse = {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    files: getDataFiles(),
  };

  res.status(200).json(response);
}
