// db/syncLog.ts

import { db } from './sqlite';

export const addSyncLog = (log: {
  device_id: string;
  status: string;
  details?: string;
}) => {
  const timestamp = new Date().toISOString();

  try {
    db.execSync(`
      INSERT INTO sync_log (device_id, status, details, timestamp)
      VALUES ('${log.device_id}', '${log.status}', '${log.details ?? ''}', '${timestamp}');
    `);
  } catch (error) {
    console.error('❌ Error adding sync log:', error);
  }
};

export const listSyncLogs = () => {
  try {
    return db.getAllSync(`SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 50;`);
  } catch (error) {
    console.error('❌ Error listing sync logs:', error);
    return [];
  }
};
