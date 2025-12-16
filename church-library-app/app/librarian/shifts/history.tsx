// church-library-app/app/librarian/shifts/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { getSession } from "../../../lib/session";
import { getAttendancesForUser } from "../../../db/queries/attendance"; 
import { getShiftById } from "../../../db/queries/shifts";


export default function AttendanceHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [shiftMap, setShiftMap] = useState<{ [key: number]: any }>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const session = await getSession();
      if (!session) return;

      const attendanceRows = await getAttendancesForUser(session.username);

      // sort newest first
      attendanceRows.sort((a, b) => (b.id - a.id));

      setRecords(attendanceRows);

      // fetch associated shifts
      const m: any = {};
      for (let r of attendanceRows) {
        if (!m[r.shift_id]) {
            const shift = await getShiftById(r.shift_id);
            if (shift) m[r.shift_id] = shift;
        }
        }


      setShiftMap(m);

    } catch (err) {
      console.log("History error:", err);
    } finally {
      setLoading(false);
    }
  }

  const StatusPill = ({ status }: { status: string }) => {
    const bg =
      status === "completed"
        ? "#16a34a"
        : status === "in_progress"
        ? "#2563eb"
        : "#6b7280";

    return (
      <View
        style={{
          backgroundColor: bg,
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: 10,
          alignSelf: "flex-start",
          marginTop: 4,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
          {status === "not_started"
            ? "Not Started"
            : status === "in_progress"
            ? "In Progress"
            : "Completed"}
        </Text>
      </View>
    );
  };

  const TimelineDot = () => (
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#1e3a8a",
        position: "absolute",
        left: -6,
        top: 20,
      }}
    />
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (records.length === 0) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#1e3a8a" }}>No Attendance Records</Text>
        <Text style={{ color: "#6b7280", marginTop: 6 }}>
          Your attendance history will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f1f5f9", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "900", color: "#0f172a", marginBottom: 16 }}>
        Attendance History
      </Text>

      {records.map((rec) => {
        const shift = shiftMap[rec.shift_id]; // may be undefined until shift data fetched

        return (
          <View key={rec.id} style={{ marginBottom: 26, paddingLeft: 20 }}>
            {/* Timeline line */}
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: "#cbd5e1",
              }}
            />

            <TimelineDot />

            <View
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 16,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#1e3a8a" }}>
                {shift ? shift.date : "Loading date..."}
              </Text>

              <Text style={{ marginTop: 4, color: "#334155" }}>
                Shift Time:{" "}
                <Text style={{ fontWeight: "700" }}>
                  {shift ? `${shift.start_time} - ${shift.end_time}` : "Loading..."}
                </Text>
              </Text>

              <Text style={{ marginTop: 4, color: "#334155" }}>
                Clock In:{" "}
                <Text style={{ fontWeight: "700" }}>
                  {rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString() : "—"}
                </Text>
              </Text>

              <Text style={{ marginTop: 4, color: "#334155" }}>
                Clock Out:{" "}
                <Text style={{ fontWeight: "700" }}>
                  {rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString() : "—"}
                </Text>
              </Text>

              <StatusPill status={rec.status ?? "not_started"} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
