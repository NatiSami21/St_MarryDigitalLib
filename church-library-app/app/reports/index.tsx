import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  StyleSheet,
  ScrollView 
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { generateReport, type ReportRange } from "../../reports/generate";
import { Theme } from "../../styles/theme";

export default function ReportsScreen() {
  const [loading, setLoading] = useState(false);
  const [exportingMode, setExportingMode] = useState<ReportRange | null>(null);
  const insets = useSafeAreaInsets();

  const exportReport = async (mode: ReportRange) => {
    try {
      setLoading(true);
      setExportingMode(mode);

      const { fileName, csv } = await generateReport(mode);
      const path = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: "text/csv",
          dialogTitle: "Export Library Report",
          UTI: "public.comma-separated-values-text"
        });
      } else {
        Alert.alert(
          "Export Ready",
          `Report saved to: ${path}`,
          [{ text: "OK" }]
        );
      }

    } catch (err: any) {
      Alert.alert(
        "Export Failed",
        err.message || "Failed to generate report. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
      setExportingMode(null);
    }
  };

  const ReportButton = ({ 
    label, 
    mode, 
    icon, 
    description 
  }: { 
    label: string; 
    mode: ReportRange;
    icon: string;
    description: string;
  }) => {
    const isExporting = loading && exportingMode === mode;
    
    return (
      <TouchableOpacity
        onPress={() => exportReport(mode)}
        style={styles.reportCard}
        disabled={loading}
      >
        <View style={styles.reportIconContainer}>
          <Icon name={icon} size={32} color={Theme.colors.teal} />
        </View>
        
        <View style={styles.reportContent}>
          <Text style={styles.reportTitle}>{label}</Text>
          <Text style={styles.reportDescription}>{description}</Text>
        </View>

        {isExporting ? (
          <ActivityIndicator size="small" color={Theme.colors.navy} />
        ) : (
          <Icon name="download" size={24} color={Theme.colors.textLight} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Theme.spacing.lg }]}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Generate and export library activity reports</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Reports</Text>
          <Text style={styles.sectionSubtitle}>
            Generate CSV reports for different time periods
          </Text>

          {loading && exportingMode && (
            <View style={styles.exportingIndicator}>
              <ActivityIndicator size="large" color={Theme.colors.navy} />
              <Text style={styles.exportingText}>
                Generating {exportingMode} report...
              </Text>
            </View>
          )}

          <ReportButton
            label="Daily Report"
            mode="daily"
            icon="calendar"
            description="Today's transactions and activities"
          />
          
          <ReportButton
            label="Weekly Report"
            mode="weekly"
            icon="calendar"
            description="This week's library activities"
          />
          
          <ReportButton
            label="Monthly Report"
            mode="monthly"
            icon="calendar"
            description="Monthly summary and statistics"
          />
          
          <ReportButton
            label="Yearly Report"
            mode="yearly"
            icon="calendar"
            description="Annual library performance report"
          />
        </View>

        {/* Report Information */}
        <View style={styles.infoCard}>
          <Icon name="info" size={24} color={Theme.colors.gold} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About Reports</Text>
            <Text style={styles.infoText}>
              • Reports are exported as CSV files{'\n'}
              • Includes all transactions, users, and books data{'\n'}
              • Can be opened in Excel, Google Sheets, or Numbers{'\n'}
              • Generated reports are saved locally
            </Text>
          </View>
        </View>

        {/* Quick Stats (Placeholder - you can add real stats here) */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="book-open" size={24} color={Theme.colors.teal} />
              <Text style={styles.statNumber}>1,234</Text>
              <Text style={styles.statLabel}>Books</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="users" size={24} color={Theme.colors.success} />
              <Text style={styles.statNumber}>567</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="activity" size={24} color={Theme.colors.warning} />
              <Text style={styles.statNumber}>89</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
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
  title: {
    ...Theme.typography.h1,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.sm,
  },
  sectionSubtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.lg,
  },
  exportingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 49, 83, 0.1)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  exportingText: {
    ...Theme.typography.body,
    color: Theme.colors.navy,
    marginLeft: Theme.spacing.md,
    fontWeight: '600',
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 91, 130, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.lg,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  reportDescription: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
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
  statsSection: {
    marginBottom: Theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
  },
});