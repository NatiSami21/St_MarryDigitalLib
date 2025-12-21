// church-library-app/app/librarian/shifts/index.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { getSession } from "../../../lib/session";
import { getShiftsByDate } from "../../../db/queries/shifts";
import { getAttendanceForShift } from "../../../db/queries/attendance";
import { events } from "../../../utils/events";
import { Theme } from "../../../styles/theme";

export default function MyShiftsToday() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, any>>({});

  const load = async () => {
    try {
      const session = await getSession();
      if (!session) return;

      setUsername(session.username);

      const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
      const rows = await getShiftsByDate(today);
      const myShifts = rows.filter(
        (s) => s.librarian_username === session.username
      );

      setShifts(myShifts);

      const attMap: Record<number, any> = {};
      for (const shift of myShifts) {
        const att = await getAttendanceForShift(shift.id, session.username);
        attMap[shift.id] = att;
      }

      setAttendanceMap(attMap);
    } catch (e) {
      console.log("Shift load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const sub = events.listen("refresh-attendance", load);
    return () => sub.remove();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const StatusPill = ({ status }: { status: string | null }) => {
    let color = Theme.colors.textLight;
    let label = "Not Started";
    let icon = "clock";

    if (status === "in_progress") {
      label = "In Progress";
      icon = "activity";
    } else if (status === "completed") {
      label = "Completed";
      icon = "check-circle";
    }

    return (
      <View style={[styles.statusPill, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} size={12} color={color} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const ShiftCard = ({ shift }: any) => {
    const att = attendanceMap[shift.id];
    
    return (
      <View style={styles.shiftCard}>
        <View style={styles.shiftHeader}>
          <View style={styles.timeContainer}>
            <Icon name="clock" size={18} color={Theme.colors.navy} />
            <Text style={styles.shiftTime}>
              {shift.start_time} - {shift.end_time}
            </Text>
          </View>
          <StatusPill status={att?.status ?? null} />
        </View>

        <Text style={styles.shiftDate}>
          {new Date(shift.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>

        <View style={styles.attendanceInfo}>
          {att?.clock_in ? (
            <View style={styles.timeRow}>
              <Icon name="log-in" size={14} color={Theme.colors.success} />
              <Text style={styles.timeText}>
                Clocked in at {new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ) : (
            <View style={styles.timeRow}>
              <Icon name="log-in" size={14} color={Theme.colors.textLight} />
              <Text style={[styles.timeText, styles.pendingTime]}>
                Not clocked in yet
              </Text>
            </View>
          )}

          {att?.clock_out ? (
            <View style={styles.timeRow}>
              <Icon name="log-out" size={14} color={Theme.colors.success} />
              <Text style={styles.timeText}>
                Clocked out at {new Date(att.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ) : att?.status === "in_progress" ? (
            <View style={styles.timeRow}>
              <Icon name="log-out" size={14} color={Theme.colors.warning} />
              <Text style={[styles.timeText, styles.inProgressTime]}>
                Shift in progress
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.shiftFooter}>
          <View style={styles.librarianInfo}>
            <Icon name="user" size={14} color={Theme.colors.textLight} />
            <Text style={styles.librarianText}>{shift.librarian_username}</Text>
          </View>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>View Details</Text>
            <Icon name="chevron-right" size={14} color={Theme.colors.teal} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.navy} />
        <Text style={styles.loadingText}>Loading your shifts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Theme.spacing.lg }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={Theme.colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>My Shifts</Text>
        <Text style={styles.subtitle}>Today's schedule and attendance</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Theme.colors.navy]}
            tintColor={Theme.colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Date */}
        <View style={styles.dateCard}>
          <Icon name="calendar" size={24} color={Theme.colors.navy} />
          <View style={styles.dateContent}>
            <Text style={styles.dateTitle}>Today</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </View>

        {shifts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={64} color={Theme.colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Shifts Today</Text>
            <Text style={styles.emptyStateText}>
              You have no scheduled shifts for today. Enjoy your day off!
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Scheduled Shifts</Text>
            {shifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} />
            ))}
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => router.push("/librarian/shifts/history")}
            style={styles.historyButton}
          >
            <Icon name="history" size={20} color={Theme.colors.white} />
            <Text style={styles.historyButtonText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => {/* Add help action */}}
          >
            <Icon name="help-circle" size={20} color={Theme.colors.teal} />
            <Text style={styles.helpButtonText}>Shift Help</Text>
          </TouchableOpacity>
        </View>

        {/* Shift Information */}
        <View style={styles.infoCard}>
          <Icon name="info" size={20} color={Theme.colors.gold} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Shift Information</Text>
            <Text style={styles.infoText}>
              • Clock in when you start your shift{'\n'}
              • Clock out when your shift ends{'\n'}
              • Contact admin for shift changes{'\n'}
              • History shows past 30 days
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    padding: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  title: {
    ...Theme.typography.h1,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  dateTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.xs,
  },
  dateText: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
  },
  sectionTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  shiftCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shiftTime: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginLeft: Theme.spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.lg,
  },
  statusText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs,
  },
  shiftDate: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.md,
  },
  attendanceInfo: {
    backgroundColor: 'rgba(0, 49, 83, 0.03)',
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  timeText: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.sm,
  },
  pendingTime: {
    color: Theme.colors.textLight,
    fontStyle: 'italic',
  },
  inProgressTime: {
    color: Theme.colors.warning,
    fontWeight: '600',
  },
  shiftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  librarianInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  librarianText: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    ...Theme.typography.caption,
    color: Theme.colors.teal,
    fontWeight: '600',
    marginRight: Theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl * 2,
  },
  emptyStateTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.textDark,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  emptyStateText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    maxWidth: '80%',
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xl,
  },
  historyButton: {
    flex: 1,
    backgroundColor: Theme.colors.navy,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  helpButton: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.teal,
  },
  helpButtonText: {
    color: Theme.colors.teal,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  infoContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  infoTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.gold,
    marginBottom: Theme.spacing.xs,
  },
  infoText: {
    ...Theme.typography.caption,
    color: Theme.colors.textDark,
    lineHeight: 20,
  },
});