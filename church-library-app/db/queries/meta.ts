// db/queries/meta.ts
import { getOneAsync } from "../sqlite";

export async function getMetaValue(key: string) {
  const row = await getOneAsync(`SELECT value FROM meta WHERE key = ?`, [key]);
  return row ? row.value : null;
}