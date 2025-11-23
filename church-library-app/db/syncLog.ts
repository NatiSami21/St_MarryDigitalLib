import { db } from './sqlite';

export const addSyncLog = async (log: {
  device_id: string;
  status: string;
  details?: string;
}) => {
  const timestamp = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sync_log (device_id, status, details, timestamp)
     VALUES (?, ?, ?, ?)`,
    [log.device_id, log.status, log.details ?? '', timestamp]
  );
};

export const listSyncLogs = async () => {
  return await db.getAllAsync(
    `SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 50`
  );
};
