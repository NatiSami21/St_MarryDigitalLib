// app/admin/shifts/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { getShiftsByDate, deleteShift } from "../../../db/queries/shifts";
import { getAllLibrarians } from "../../../db/queries/librarians";

import type { Shift } from "../../../db/queries/shifts";

export default function AdminShiftsScreen() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date()); 
  const [showPicker, setShowPicker] = useState(false); 
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [librarianMap, setLibrarianMap] = useState<Record<string, string>>({});

  const loadShifts = async () => {
    setLoading(true);

    try {
      const formatted = date.toISOString().split("T")[0];
      const rows = await getShiftsByDate(formatted);

      // build map for quick lookup
      const libs = await getAllLibrarians(); 
      const map: Record<string, string> = {};
        libs.forEach(l => {
        map[l.username] = l.full_name;
        });
      setLibrarianMap(map);
      setShifts(rows);
    } catch (err) {
      console.log("Load shift error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadShifts();
  }, [date]);

  const confirmDelete = (id: number) => {
    Alert.alert(
      "Delete Shift",
      "Are you sure you want to delete this shift?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteShift(id);
            loadShifts();
          }
        }
      ]
    );
  };

  const ShiftCard = ({ shift }: any) => (
    <View
      style={{
        backgroundColor: "white",
        padding: 16,
        borderRadius: 12,
        marginBottom: 14,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>
        {librarianMap[shift.librarian_username] || shift.librarian_username}
      </Text>

      <Text style={{ marginTop: 8, color: "#475569" }}>
        Time: {shift.start_time} → {shift.end_time}
      </Text>

      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => router.push(`/admin/shifts/edit/${shift.id}`)}
          style={{
            backgroundColor: "#1e40af",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
            marginRight: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => confirmDelete(shift.id)}
          style={{
            backgroundColor: "#dc2626",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8fafc", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "900", marginBottom: 16, color: "#0b3b86" }}>
        Shift Assignment
      </Text>

      {/* DATE PICKER */}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          backgroundColor: "white",
          padding: 14,
          borderRadius: 12,
          marginBottom: 12,
          elevation: 2
        }}
      >
        <Text style={{ fontWeight: "700", fontSize: 16, color: "#0f172a" }}>
          {date.toDateString()}
        </Text>
        <Text style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
          Tap to change date
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(e, d) => {
            setShowPicker(false);
            if (d) setDate(d);
          }}
        />
      )}

      {/* Add Shift Button */}
      <TouchableOpacity
        onPress={() => router.push("/admin/shifts/create")}
        style={{
          backgroundColor: "#1e3a8a",
          padding: 14,
          borderRadius: 10,
          marginBottom: 20,
          elevation: 3,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>
          + Create Shift
        </Text>
      </TouchableOpacity>

      {/* LIST SHIFTS */}
      {loading ? (
        <ActivityIndicator size="large" color="#1e3a8a" />
      ) : shifts.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 40, color: "#64748b" }}>
          No shifts for this day.
        </Text>
      ) : (
        shifts.map((s) => <ShiftCard key={s.id} shift={s} />)
      )}
    </ScrollView>
  );
}
