// app/admin/shifts/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
  Platform // Add Platform import
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

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
  const [refreshing, setRefreshing] = useState(false);

  const loadShifts = async () => {
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
      Alert.alert("Error", "Failed to load shifts");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    loadShifts().finally(() => setLoading(false));
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
            try {
              await deleteShift(id);
              await loadShifts();
              Alert.alert("Success", "Shift deleted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to delete shift");
            }
          }
        }
      ]
    );
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ShiftCard = ({ shift }: { shift: Shift }) => {
    const startTime = formatTime(shift.start_time);
    const endTime = formatTime(shift.end_time);
    
    return (
      <View style={styles.shiftCard}>
        <View style={styles.shiftHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {librarianMap[shift.librarian_username]?.charAt(0) || "U"}
            </Text>
          </View>
          <View style={styles.shiftInfo}>
            <Text style={styles.librarianName}>
              {librarianMap[shift.librarian_username] || shift.librarian_username}
            </Text>
            <View style={styles.timeContainer}>
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={14} color="#475569" />
                <Text style={styles.timeText}>{startTime} - {endTime}</Text>
              </View>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {Math.round(
                    (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60)
                  )}hrs
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => router.push(`/admin/shifts/edit/${shift.id}`)}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={18} color="#1e40af" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => confirmDelete(shift.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>No shifts scheduled</Text>
      <Text style={styles.emptySubtitle}>
        Create a shift for {date.toDateString()}
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/admin/shifts/create")}
        style={styles.createButton}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.createButtonText}>Create First Shift</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shift Schedule</Text>
          <Text style={styles.subtitle}>Manage daily assignments</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/admin/shifts/create")}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={24} color="#1e3a8a" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Picker Card */}
        <View style={styles.dateCard}>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={styles.dateButton}
          >
            <View style={styles.dateIcon}>
              <Ionicons name="calendar" size={24} color="#1e3a8a" />
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Selected Date</Text>
              <Text style={styles.dateText}>{date.toDateString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          
          {/* Quick Navigation */}
          <View style={styles.dateNavigation}>
            <TouchableOpacity
              onPress={() => {
                const prev = new Date(date);
                prev.setDate(prev.getDate() - 1);
                setDate(prev);
              }}
              style={styles.navButton}
            >
              <Ionicons name="chevron-back" size={20} color="#475569" />
              <Text style={styles.navText}>Prev</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setDate(new Date())}
              style={styles.todayButton}
            >
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                const next = new Date(date);
                next.setDate(next.getDate() + 1);
                setDate(next);
              }}
              style={styles.navButton}
            >
              <Text style={styles.navText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{shifts.length}</Text>
            <Text style={styles.statLabel}>Total Shifts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {new Set(shifts.map(s => s.librarian_username)).size}
            </Text>
            <Text style={styles.statLabel}>Librarians</Text>
          </View>
        </View>

        {/* Shifts List */}
        <View style={styles.shiftsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Shifts for {date.toLocaleDateString([], { weekday: 'long' })}
            </Text>
            <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
              <Ionicons
                name="refresh"
                size={20}
                color={refreshing ? "#94a3b8" : "#475569"}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#1e3a8a" style={styles.loader} />
          ) : shifts.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.shiftsList}>
              {shifts.map((shift) => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push("/admin/shifts/create")}
        style={styles.fab}
      >
        <Ionicons name="add" size={24} color="white" />
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
    </View>
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
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100, // Extra padding for FAB
  },
  dateCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  dateNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  navText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginHorizontal: 4,
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#1e3a8a",
    borderRadius: 8,
  },
  todayText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  shiftsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  shiftsList: {
    gap: 12,
  },
  shiftCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  shiftHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  shiftInfo: {
    flex: 1,
    justifyContent: "center",
  },
  librarianName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  durationBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  loader: {
    marginTop: 48,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});