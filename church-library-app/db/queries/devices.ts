// db/queries/devices.ts
import { db } from "../sqlite";
import { addCommit } from "../commits";
import { Librarian } from "./librarians";

// ------------------------------
// Types
// ------------------------------
export interface DeviceRecord {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "librarian";
  device_id: string;
}

// ------------------------------
// 1. Get all active bound devices
// ------------------------------
export async function getAllDevices(): Promise<DeviceRecord[]> {
  try {
    return await db.getAllAsync<DeviceRecord>(
      `
        SELECT id, username, full_name, role, device_id
        FROM librarians
        WHERE deleted = 0 AND device_id IS NOT NULL
        ORDER BY full_name ASC
      `
    );
  } catch (err) {
    console.log("❌ getAllDevices() error:", err);
    return [];
  }
}

// ------------------------------
// 2. Get device + librarian info by device_id
// ------------------------------
export async function getDeviceById(deviceId: string): Promise<DeviceRecord | null> {
  try {
    return await db.getFirstAsync<DeviceRecord>(
      `
        SELECT id, username, full_name, role, device_id
        FROM librarians
        WHERE device_id = ? AND deleted = 0
      `,
      [deviceId]
    );
  } catch (err) {
    console.log("❌ getDeviceById() error:", err);
    return null;
  }
}

// ------------------------------
// 3. Unbind device
// ------------------------------
export async function unbindDevice(librarianId: number): Promise<boolean> {
  try {
    await db.runAsync(
      `UPDATE librarians SET device_id = NULL WHERE id = ?`,
      [librarianId]
    );

    await addCommit("unbind_device", "librarians", { id: librarianId });

    return true;
  } catch (err) {
    console.log("❌ unbindDevice() error:", err);
    return false;
  }
}

// ------------------------------
// 4. Rebind device to librarian
// ------------------------------
export async function rebindDevice(
  librarianId: number,
  newDeviceId: string
): Promise<boolean> {
  try {
    await db.runAsync(
      `UPDATE librarians SET device_id = ? WHERE id = ?`,
      [newDeviceId, librarianId]
    );

    await addCommit("rebind_device", "librarians", {
      id: librarianId,
      device_id: newDeviceId,
    });

    return true;
  } catch (err) {
    console.log("❌ rebindDevice() error:", err);
    return false;
  }
}

// ------------------------------
// 5. Optional: Get last sync timestamp from sync_log (Phase 1 compatible)
// ------------------------------
export async function getLastSyncForDevice(deviceId: string): Promise<string | null> {
  try {
    const row = await db.getFirstAsync<{ timestamp: string }>(
      `
        SELECT timestamp
        FROM sync_log
        WHERE device_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [deviceId]
    );

    return row?.timestamp ?? null;
  } catch (err) {
    console.log("❌ getLastSyncForDevice() error:", err);
    return null;
  }
}
