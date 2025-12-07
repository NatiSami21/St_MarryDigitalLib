import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { getSession } from "../../../lib/session";
import { getShiftsByDate } from "../../../db/queries/shifts";
import {
  getAttendanceForShift,
  createAttendanceRecord,
  clockIn,
  clockOut,
} from "../../../db/queries/attendance";

import { events } from "../../../utils/events";

const COLORS = {
  info: "#0ea5e9",
  warning: "#f59e0b",
  success: "#16a34a",
  danger: "#dc2626",
  purple: "#7c3aed",
};

export default function MyShiftsToday() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) return;

      setUsername(session.username);

      const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

      const rows = await getShiftsByDate(today);
      const myShifts = rows.filter((s) => s.librarian_username === session.username);
      setShifts(myShifts);

      const attMap: any = {};
      for (const shift of myShifts) {
        let att = await getAttendanceForShift(shift.id, session.username);

        if (!att) {
          await createAttendanceRecord(shift.id, session.username);
          att = await getAttendanceForShift(shift.id, session.username);
        }

        attMap[shift.id] = att;
      }

      setAttendanceMap(attMap);
    } catch (e) {
      console.log("Shift load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const sub = events.listen("refresh-attendance", load);
    return () => sub.remove();
  }, []);

  const doClockIn = async (shift_id: number) => {
    if (!username) return;
    await clockIn(shift_id, username);
    events.emit("refresh-attendance");
  };

  const doClockOut = async (shift_id: number) => {
    if (!username) return;
    await clockOut(shift_id, username);
    events.emit("refresh-attendance");
  };

  const StatusPill = ({ status }: { status: string | null }) => {
    let color = COLORS.info;
    let label = "Not Started";

    if (status === "in_progress") {
      color = COLORS.warning;
      label = "In Progress";
    }
    if (status === "completed") {
      color = COLORS.success;
      label = "Completed";
    }

    return (
      <View
        style={{
          backgroundColor: color,
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: 8,
          alignSelf: "flex-start",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>{label}</Text>
      </View>
    );
  };

  const ShiftCard = ({ shift }: any) => {
    const att = attendanceMap[shift.id];

    return (
      <View
        style={{
          backgroundColor: "white",
          padding: 18,
          borderRadius: 14,
          marginVertical: 8,
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
          {shift.start_time} → {shift.end_time}
        </Text>

        <Text style={{ color: "#475569", marginTop: 6 }}>
          Assigned to: {shift.librarian_username}
        </Text>

        <View style={{ marginTop: 10 }}>
          <StatusPill status={att?.status} />
        </View>

        {/* Clock-In Button */}
        {!att?.clock_in && (
          <TouchableOpacity
            onPress={() => doClockIn(shift.id)}
            style={{
              backgroundColor: COLORS.purple,
              paddingVertical: 14,
              borderRadius: 10,
              marginTop: 16,
            }}
          >
            <Text style={{ color: "white", fontWeight: "800", textAlign: "center" }}>
              Clock In
            </Text>
          </TouchableOpacity>
        )}

        {/* Clock-Out Button */}
        {att?.clock_in && !att?.clock_out && (
          <TouchableOpacity
            onPress={() => doClockOut(shift.id)}
            style={{
              backgroundColor: COLORS.danger,
              paddingVertical: 14,
              borderRadius: 10,
              marginTop: 16,
            }}
          >
            <Text style={{ color: "white", fontWeight: "800", textAlign: "center" }}>
              Clock Out
            </Text>
          </TouchableOpacity>
        )}

        {att?.clock_out && (
          <Text style={{ color: COLORS.success, marginTop: 12, fontWeight: "700" }}>
            Shift Completed
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f1f5f9", padding: 20 }}>
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#1e3a8a", marginBottom: 10 }}>
        My Shifts Today
      </Text>

      {shifts.length === 0 && (
        <Text style={{ color: "#475569", fontSize: 16 }}>No shifts scheduled for today.</Text>
      )}

      {shifts.map((shift) => (
        <ShiftCard key={shift.id} shift={shift} />
      ))}

      <TouchableOpacity
        onPress={() => router.push("/librarian/shifts/history")}
        style={{
          backgroundColor: "#7c3aed",
          padding: 16,
          borderRadius: 14,
          marginTop: 24,
        }}
      >
        <Text style={{ color: "white", fontWeight: "800", textAlign: "center" }}>
          View Attendance History
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
