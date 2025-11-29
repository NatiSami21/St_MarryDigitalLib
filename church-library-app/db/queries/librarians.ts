// db/queries/librarians.ts
import { getOneAsync } from "../sqlite";

export async function getLibrarianByUsername(username: string) {
  return await getOneAsync(
    `SELECT * FROM librarians WHERE username = ? AND deleted = 0 LIMIT 1`,
    [username]
  );
}
