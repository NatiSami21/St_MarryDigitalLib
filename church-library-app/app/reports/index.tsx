// app/reports/index.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { generateReport, type ReportRange } from "../../reports/generate";

export default function ReportsScreen() {
  const [loading, setLoading] = useState(false);

  const exportReport = async (mode: ReportRange) => {
    try {
      setLoading(true);

      const { fileName, csv } = await generateReport(mode);
      const path = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(path, {
        mimeType: "text/csv",
        dialogTitle: "Export Library Report",
      });

    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const Button = ({ label, mode }: { label: string; mode: ReportRange }) => (
    <TouchableOpacity
      onPress={() => exportReport(mode)}
      style={{
        backgroundColor: "#1e3a8a",
        padding: 16,
        borderRadius: 12,
        marginBottom: 15,
      }}
    >
      <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 25 }}>
        Export Reports
      </Text>

      {loading && <ActivityIndicator size="large" style={{ marginBottom: 20 }} />}

      <Button label="Export Daily Report" mode="daily" />
      <Button label="Export Weekly Report" mode="weekly" />
      <Button label="Export Monthly Report" mode="monthly" />
      <Button label="Export Yearly Report" mode="yearly" />
    </View>
  );
}
