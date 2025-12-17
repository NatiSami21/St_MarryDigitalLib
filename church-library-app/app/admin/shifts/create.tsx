// church-library-app/app/admin/shifts/create.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Shift</Text>
        <View style={{ width: 40 }} /> {/* Spacer for alignment */}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Select Librarian */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Librarian</Text>
          <Text style={styles.sectionSubtitle}>
            Tap to select a librarian for this shift
          </Text>
          <View style={styles.librariansGrid}>
            {librarians.map((lib) => (
              <TouchableOpacity
                key={lib.id}
                onPress={() => setSelectedUsername(lib.username)}
                style={[
                  styles.librarianCard,
                  selectedUsername === lib.username && styles.selectedCard,
                ]}
              >
                <View style={styles.librarianInfo}>
                  <View
                    style={[
                      styles.avatar,
                      selectedUsername === lib.username && styles.selectedAvatar,
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {lib.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.librarianText}>
                    <Text
                      style={[
                        styles.librarianName,
                        selectedUsername === lib.username && styles.selectedText,
                      ]}
                    >
                      {lib.full_name}
                    </Text>
                    <Text
                      style={[
                        styles.librarianUsername,
                        selectedUsername === lib.username && styles.selectedSubtext,
                      ]}
                    >
                      @{lib.username}
                    </Text>
                  </View>
                </View>
                {selectedUsername === lib.username && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#22c55e"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Details</Text>
          
          {/* Date Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Shift Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.pickerButton}
            >
              <Ionicons name="calendar-outline" size={20} color="#475569" />
              <Text style={styles.pickerText}>{shiftDate.toDateString()}</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Time Picker Row */}
          <View style={styles.timeRow}>
            {/* Start Time */}
            <View style={styles.timeContainer}>
              <Text style={styles.pickerLabel}>Start Time</Text>
              <TouchableOpacity
                onPress={() => setShowStartPicker(true)}
                style={styles.pickerButton}
              >
                <Ionicons name="time-outline" size={20} color="#475569" />
                <Text style={styles.pickerText}>
                  {startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeSeparator}>
              <Ionicons name="arrow-forward" size={20} color="#64748b" />
            </View>

            {/* End Time */}
            <View style={styles.timeContainer}>
              <Text style={styles.pickerLabel}>End Time</Text>
              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                style={styles.pickerButton}
              >
                <Ionicons name="time-outline" size={20} color="#475569" />
                <Text style={styles.pickerText}>
                  {endTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration Display */}
          <View style={styles.durationContainer}>
            <Ionicons name="time" size={18} color="#475569" />
            <Text style={styles.durationText}>
              Duration:{" "}
              {Math.round(
                (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
              )}{" "}
              hours
            </Text>
          </View>
        </View>

        {/* Spacer for Save Button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button - Fixed at bottom */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          onPress={saveShift}
          style={[
            styles.saveButton,
            !selectedUsername && styles.saveButtonDisabled,
          ]}
          disabled={!selectedUsername}
        >
          <Ionicons name="save-outline" size={22} color="white" />
          <Text style={styles.saveButtonText}>Save Shift</Text>
        </TouchableOpacity>
      </View>

      {/* Date/Time Pickers */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100, // Extra padding for save button
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  librariansGrid: {
    gap: 12,
  },
  librarianCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  selectedCard: {
    backgroundColor: "#1e3a8a",
    borderColor: "#1e3a8a",
  },
  librarianInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedAvatar: {
    backgroundColor: "#3b82f6",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  librarianText: {
    flex: 1,
  },
  librarianName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  selectedText: {
    color: "white",
  },
  librarianUsername: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  selectedSubtext: {
    color: "#c7d2fe",
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pickerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  timeContainer: {
    flex: 1,
  },
  timeSeparator: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  durationText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  bottomSpacer: {
    height: 20,
  },
  saveButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e3a8a",
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
});