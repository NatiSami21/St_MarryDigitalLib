import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";

import { getAllLibrarians } from "../../../db/queries/librarians";
import { createShift } from "../../../db/queries/shifts";

import type { Librarian } from "../../../db/queries/librarians";

export default function CreateShiftScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [librarians, setLibrarians] = useState<Librarian[]>([]);

  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [shiftDate, setShiftDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await getAllLibrarians();
        setLibrarians(rows);
      } catch (err) {
        Alert.alert("Error", "Failed to load librarians");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveShift = async () => {
    if (!selectedUsername) {
      Alert.alert("Missing", "Please select a librarian");
      return;
    }

    if (endTime <= startTime) {
      Alert.alert("Invalid", "End time must be after start time");
      return;
    }

    const payload = {
      librarian_username: selectedUsername,
      date: shiftDate.toISOString().split("T")[0],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    try {
      await createShift(payload);
      Alert.alert("Success", "Shift created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to create shift");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 18, backgroundColor: "#f8fafc" }}>
      <Text
        style={{ fontSize: 28, fontWeight: "900", marginBottom: 14, color: "#0b3b86" }}
      >
        Create Shift
      </Text>

      {/* Select Librarian */}
      <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0f172a" }}>
        Select Librarian
      </Text>
      {librarians.map((lib) => (
        <TouchableOpacity
          key={lib.id}
          onPress={() => setSelectedUsername(lib.username)}
          style={{
            padding: 14,
            backgroundColor:
              selectedUsername === lib.username ? "#1e3a8a" : "white",
            borderRadius: 10,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: "#cbd5e1",
          }}
        >
          <Text
            style={{
              color: selectedUsername === lib.username ? "white" : "#0f172a",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {lib.full_name}
          </Text>
          <Text
            style={{
              color: selectedUsername === lib.username ? "#e0e7ff" : "#475569",
              marginTop: 4,
            }}
          >
            @{lib.username}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Date Picker */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0f172a" }}>
          Shift Date
        </Text>

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={{
            padding: 14,
            backgroundColor: "white",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#cbd5e1",
          }}
        >
          <Text>{shiftDate.toDateString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={shiftDate}
            mode="date"
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setShiftDate(date);
            }}
          />
        )}
      </View>

      {/* Start Time */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0f172a" }}>
          Start Time
        </Text>

        <TouchableOpacity
          onPress={() => setShowStartPicker(true)}
          style={{
            padding: 14,
            backgroundColor: "white",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#cbd5e1",
          }}
        >
          <Text>{startTime.toLocaleTimeString()}</Text>
        </TouchableOpacity>

        {showStartPicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            onChange={(_, time) => {
              setShowStartPicker(false);
              if (time) setStartTime(time);
            }}
          />
        )}
      </View>

      {/* End Time */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0f172a" }}>
          End Time
        </Text>

        <TouchableOpacity
          onPress={() => setShowEndPicker(true)}
          style={{
            padding: 14,
            backgroundColor: "white",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#cbd5e1",
          }}
        >
          <Text>{endTime.toLocaleTimeString()}</Text>
        </TouchableOpacity>

        {showEndPicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            onChange={(_, time) => {
              setShowEndPicker(false);
              if (time) setEndTime(time);
            }}
          />
        )}
      </View>

      {/* Save */}
      <TouchableOpacity
        onPress={saveShift}
        style={{
          backgroundColor: "#1e3a8a",
          padding: 16,
          borderRadius: 12,
          marginTop: 30,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 18, fontWeight: "800" }}>
          Save Shift
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
