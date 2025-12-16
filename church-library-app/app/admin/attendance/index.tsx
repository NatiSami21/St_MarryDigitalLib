// church-library-app/app/admin/attendance/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

import DateTimePicker from "@react-native-community/datetimepicker";

import { getSession } from "../../../lib/session";
import { getAllLibrarians } from "../../../db/queries/librarians";
import { getShiftsByDate } from "../../../db/queries/shifts";
import { getAttendanceForShift } from "../../../db/queries/attendance";

const COLORS = {
  present: "#16a34a",
  late: "#f59e0b",
  absent: "#dc2626",
  noshift: "#64748b",
};

type Row = {
  username: string;
  status: "present" | "late" | "absent" | "noshift";
  clockIn?: number | null;
  clockOut?: number | null;
};

export default function AdminAttendanceScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const load = async (selectedDate: Date) => {
    setLoading(true);

    try {
      const session = await getSession();
      if (!session || session.role !== "admin") {
        router.replace("/auth/login");
        return;
      }

      const dateStr = selectedDate.toISOString().split("T")[0];

      const librarians = await getAllLibrarians();
      const shifts = await getShiftsByDate(dateStr);

      const result: Row[] = [];

      for (const lib of librarians) {
        const libShifts = shifts.filter(
          (s) => s.librarian_username === lib.username
        );

        // ---------- NO SHIFTS ----------
        if (libShifts.length === 0) {
          result.push({
            username: lib.username,
            status: "noshift",
          });
          continue;
        }

        // ---------- AGGREGATE MULTI-SHIFT ----------
        let hasAnyClockIn = false;
        let allClockInsLate = true;

        let earliestIn: number | null = null;
        let latestOut: number | null = null;

        for (const shift of libShifts) {
          const att = await getAttendanceForShift(
            shift.id,
            lib.username
          );

          if (!att?.clock_in) continue;

          hasAnyClockIn = true;

          const shiftStart = new Date(shift.start_time).getTime();

          if (earliestIn === null || att.clock_in < earliestIn) {
            earliestIn = att.clock_in;
          }

          if (att.clock_out) {
            if (latestOut === null || att.clock_out > latestOut) {
              latestOut = att.clock_out;
            }
          }

          // If ANY shift is on-time → day is not late
          if (att.clock_in <= shiftStart) {
            allClockInsLate = false;
          }
        }

        let finalStatus: Row["status"];

        if (!hasAnyClockIn) {
          finalStatus = "absent";
        } else if (allClockInsLate) {
          finalStatus = "late";
        } else {
          finalStatus = "present";
        }

        result.push({
          username: lib.username,
          status: finalStatus,
          clockIn: earliestIn,
          clockOut: latestOut,
        });
      }

      setRows(result);
    } catch (e) {
      console.log("Attendance load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
  }, []);

  const StatusBadge = ({ status }: { status: Row["status"] }) => (
    <View
      style={{
        backgroundColor: COLORS[status],
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: "white", fontWeight: "800" }}>
        {status === "noshift"
          ? "No Shift"
          : status.toUpperCase()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8fafc", padding: 20 }}>
      <Text style={{ fontSize: 30, fontWeight: "900", color: "#0b3b86" }}>
        Attendance
      </Text>

      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          marginVertical: 14,
          padding: 12,
          backgroundColor: "white",
          borderRadius: 12,
          elevation: 2,
        }}
      >
        <Text style={{ fontWeight: "700" }}>
          Date: {date.toISOString().split("T")[0]}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(_, d) => {
            setShowPicker(false);
            if (d) {
              setDate(d);
              load(d);
            }
          }}
        />
      )}

      {rows.map((r) => (
        <View
          key={r.username}
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 14,
            marginBottom: 12,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
            {r.username}
          </Text>

          <View style={{ marginVertical: 8 }}>
            <StatusBadge status={r.status} />
          </View>

          {r.clockIn && (
            <Text style={{ color: "#475569" }}>
              In: {new Date(r.clockIn).toLocaleTimeString()}
            </Text>
          )}

          {r.clockOut && (
            <Text style={{ color: "#475569" }}>
              Out: {new Date(r.clockOut).toLocaleTimeString()}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
