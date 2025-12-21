// church-library-app/app/librarian/shifts/history.tsx

import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  StyleSheet,
  RefreshControl 
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { getSession } from "../../../lib/session";
import { getAttendancesForUser } from "../../../db/queries/attendance"; 
import { getShiftById } from "../../../db/queries/shifts";
import { Theme } from "../../../styles/theme";

export default function AttendanceHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [shiftMap, setShiftMap] = useState<{ [key: number]: any }>({});

  const load = async () => {
    setLoading(true);

    try {
      const session = await getSession();
      if (!session) return;

      const attendanceRows = await getAttendancesForUser(session.username);
      attendanceRows.sort((a, b) => (b.id - a.id)); // newest first
      setRecords(attendanceRows);

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const StatusPill = ({ status }: { status: string }) => {
    let backgroundColor, color, label;
    
    switch (status) {
      case "completed":
        backgroundColor = 'rgba(39, 174, 96, 0.1)';
        color = Theme.colors.success;
        label = "Completed";
        break;
      case "in_progress":
        backgroundColor = 'rgba(243, 156, 18, 0.1)';
        color = Theme.colors.warning;
        label = "In Progress";
        break;
      default:
        backgroundColor = 'rgba(127, 140, 141, 0.1)';
        color = Theme.colors.textLight;
        label = "Not Started";
    }

    return (
      <View style={[styles.statusPill, { backgroundColor }]}>
        <Icon 
          name={status === "completed" ? "check-circle" : "clock"} 
          size={12} 
          color={color} 
        />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const TimelineDot = ({ status }: { status: string }) => {
    let color;
    
    switch (status) {
      case "completed":
        color = Theme.colors.success;
        break;
      case "in_progress":
        color = Theme.colors.warning;
        break;
      default:
        color = Theme.colors.textLight;
    }

    return (
      <View style={[styles.timelineDot, { backgroundColor: color }]} />
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.navy} />
        <Text style={styles.loadingText}>Loading attendance history...</Text>
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
        <Text style={styles.headerTitle}>Attendance History</Text>
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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Icon name="calendar" size={24} color={Theme.colors.teal} />
            <Text style={styles.summaryNumber}>{records.length}</Text>
            <Text style={styles.summaryLabel}>Total Shifts</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Icon name="check-circle" size={24} color={Theme.colors.success} />
            <Text style={styles.summaryNumber}>
              {records.filter(r => r.status === "completed").length}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Icon name="clock" size={24} color={Theme.colors.warning} />
            <Text style={styles.summaryNumber}>
              {records.filter(r => r.status === "in_progress").length}
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>
        </View>

        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="history" size={64} color={Theme.colors.textLight} />
            <Text style={styles.emptyStateTitle}>No History Yet</Text>
            <Text style={styles.emptyStateText}>
              Your attendance history will appear here after you clock in for shifts.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Past Attendance Records</Text>
            
            {records.map((rec, index) => {
              const shift = shiftMap[rec.shift_id];
              const isLast = index === records.length - 1;

              return (
                <View key={rec.id} style={styles.timelineItem}>
                  {/* Timeline line */}
                  {!isLast && <View style={styles.timelineLine} />}
                  
                  <TimelineDot status={rec.status ?? "not_started"} />
                  
                  <View style={styles.historyCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.dateContainer}>
                        <Icon name="calendar" size={16} color={Theme.colors.textLight} />
                        <Text style={styles.dateText}>
                          {shift ? new Date(shift.date).toLocaleDateString() : "Loading..."}
                        </Text>
                      </View>
                      <StatusPill status={rec.status ?? "not_started"} />
                    </View>

                    <View style={styles.shiftDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="clock" size={14} color={Theme.colors.textLight} />
                        <Text style={styles.detailLabel}>Shift Time:</Text>
                        <Text style={styles.detailValue}>
                          {shift ? `${shift.start_time} - ${shift.end_time}` : "Loading..."}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Icon name="log-in" size={14} color={Theme.colors.textLight} />
                        <Text style={styles.detailLabel}>Clock In:</Text>
                        <Text style={[styles.detailValue, styles.timeValue]}>
                          {rec.clock_in 
                            ? new Date(rec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "—"
                          }
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Icon name="log-out" size={14} color={Theme.colors.textLight} />
                        <Text style={styles.detailLabel}>Clock Out:</Text>
                        <Text style={[styles.detailValue, styles.timeValue]}>
                          {rec.clock_out 
                            ? new Date(rec.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "—"
                          }
                        </Text>
                      </View>
                    </View>

                    {rec.notes && (
                      <View style={styles.notesContainer}>
                        <Icon name="file-text" size={14} color={Theme.colors.textLight} />
                        <Text style={styles.notesText} numberOfLines={2}>{rec.notes}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Help Information */}
        <View style={styles.helpCard}>
          <Icon name="info" size={20} color={Theme.colors.gold} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>About Attendance History</Text>
            <Text style={styles.helpText}>
              • Shows your shift attendance for the past 30 days{'\n'}
              • Green dots indicate completed shifts{'\n'}
              • Yellow dots indicate shifts in progress{'\n'}
              • Gray dots indicate not started shifts
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    padding: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.navy,
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
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Theme.colors.border,
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
  sectionTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.lg,
  },
  timelineItem: {
    marginBottom: Theme.spacing.lg,
    paddingLeft: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 20,
    bottom: -Theme.spacing.lg,
    width: 1,
    backgroundColor: Theme.colors.border,
  },
  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    position: 'absolute',
    left: 0,
    top: 16,
    zIndex: 2,
  },
  historyCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    fontWeight: '600',
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
  shiftDetails: {
    backgroundColor: 'rgba(0, 49, 83, 0.03)',
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  detailLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    width: 80,
    marginLeft: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  detailValue: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    flex: 1,
    fontWeight: '500',
  },
  timeValue: {
    fontFamily: 'monospace',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)',
  },
  notesText: {
    ...Theme.typography.caption,
    color: Theme.colors.textDark,
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontStyle: 'italic',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginTop: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  helpContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  helpTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.gold,
    marginBottom: Theme.spacing.xs,
  },
  helpText: {
    ...Theme.typography.caption,
    color: Theme.colors.textDark,
    lineHeight: 20,
  },
});