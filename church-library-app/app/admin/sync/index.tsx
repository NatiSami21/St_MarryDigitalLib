// app/admin/sync/index.tsx

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { getSyncStatus, syncAll, pushPendingCommits, pullSnapshot } from "../../../lib/syncEngine";
import { getDeviceId } from "../../../db/queries/sync";

export default function SyncControlScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncInfo, setSyncInfo] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const info = await getSyncStatus();
    setSyncInfo(info);
    const devId = await getDeviceId();
    setDeviceId(devId);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    const result = await syncAll();
    setLastResult(result);
    await load();
    setSyncing(false);
  };

  const handlePushOnly = async () => {
    setSyncing(true);
    const result = await pushPendingCommits();
    setLastResult({ push: result });
    await load();
    setSyncing(false);
  };

  const handlePullOnly = async () => {
    setSyncing(true);
    const result = await pullSnapshot();
    setLastResult({ pull: result });
    await load();
    setSyncing(false);
  };

  if (loading || !syncInfo) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: "#f1f5f9" }}>
      <Text style={{ fontSize: 28, fontWeight: "900", marginBottom: 16, color: "#0f172a" }}>
        Sync Control
      </Text>

      {/* STATUS CARD */}
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#1e3a8a" }}>Sync Status</Text>

        <Text style={{ marginTop: 10, fontSize: 15 }}>
          Pending Commits:{" "}
          <Text style={{ fontWeight: "700", color: syncInfo.pending > 0 ? "#dc2626" : "#16a34a" }}>
            {syncInfo.pending}
          </Text>
        </Text>

        <Text style={{ marginTop: 6 }}>Last Push: {syncInfo.lastPush ?? "—"}</Text>
        <Text style={{ marginTop: 4 }}>Last Pull: {syncInfo.lastPull ?? "—"}</Text>

        <Text style={{ marginTop: 6, color: "#64748b" }}>
          Device ID: <Text style={{ fontWeight: "600" }}>{deviceId}</Text>
        </Text>
      </View>

      {/* SYNC BUTTON */}
      <TouchableOpacity
        onPress={handleSyncNow}
        disabled={syncing}
        style={{
          backgroundColor: syncing ? "#93c5fd" : "#1e3a8a",
          padding: 16,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 16 }}>
          {syncing ? "Syncing…" : "🔄 Sync Now"}
        </Text>
      </TouchableOpacity>

      {/* DEV TOOLS SECTION */}
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 10, color: "#1e293b" }}>
        Developer Tools
      </Text>

      {/* PUSH ONLY */}
      <TouchableOpacity
        onPress={handlePushOnly}
        disabled={syncing}
        style={{
          backgroundColor: "#0ea5e9",
          padding: 14,
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
          Push Pending Only
        </Text>
      </TouchableOpacity>

      {/* PULL ONLY */}
      <TouchableOpacity
        onPress={handlePullOnly}
        disabled={syncing}
        style={{
          backgroundColor: "#10b981",
          padding: 14,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
          Pull From Server Only
        </Text>
      </TouchableOpacity>

      {/* LAST RESULT */}
      {lastResult && (
        <View
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 12,
            elevation: 3,
            marginBottom: 40,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8, color: "#1e293b" }}>
            Last Sync Result
          </Text>

          <Text style={{ fontFamily: "monospace", color: "#334155" }}>
            {JSON.stringify(lastResult, null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
