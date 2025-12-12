// app/admin/sync/index.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import {
  getSyncStatus,
  syncAll,
  pushPendingCommits,
  pullSnapshot,
} from "../../../lib/syncEngine";
import { getDeviceId } from "../../../db/queries/sync";

export default function SyncControlScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncInfo, setSyncInfo] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  /* ------------------------
   * Helper for alerts
   * -----------------------*/
  const successToast = (msg: string) =>
    Alert.alert("Success", msg, [{ text: "OK", style: "default" }]);

  const errorToast = (msg: string) =>
    Alert.alert("Error", msg, [{ text: "OK", style: "destructive" }]);

  /* ------------------------
   * SYNC HANDLERS
   * -----------------------*/
  const handleSyncNow = async () => {
    setSyncing(true);
    const result = await syncAll();
    setLastResult(result);

    if (result.success) {
      successToast("Sync completed successfully!");
    } else {
      errorToast("Sync failed → Check server logs or try again.");
    }

    await load();
    setSyncing(false);
  };

  const handlePushOnly = async () => {
    setSyncing(true);
    const result = await pushPendingCommits();
    setLastResult({ push: result });

    if (result.success) {
      successToast(`Pushed ${result.pushedIds?.length ?? 0} commits`);
    } else {
      errorToast(result.message ?? "Push failed");
    }

    await load();
    setSyncing(false);
  };

  const handlePullOnly = async () => {
    setSyncing(true);
    const result = await pullSnapshot();
    setLastResult({ pull: result });

    if (result.success) {
      successToast("Pulled latest snapshot from server.");
    } else {
      errorToast(result.message ?? "Pull failed");
    }

    await load();
    setSyncing(false);
  };

  /* ------------------------
   * LOADING STATE
   * -----------------------*/
  if (loading || !syncInfo) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  /* ------------------------
   * Sync Health Colors
   * -----------------------*/
  const pending = syncInfo.pending;
  const healthColor = pending === 0 ? "#16a34a" : pending < 10 ? "#eab308" : "#dc2626";
  const healthLabel = pending === 0 ? "Healthy" : pending < 10 ? "Warning" : "Out of Sync";

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
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#1e3a8a" }}>
          Sync Status
        </Text>

        <Text style={{ marginTop: 10, fontSize: 15 }}>
          Pending Commits:{" "}
          <Text style={{ fontWeight: "700", color: healthColor }}>{pending}</Text>
        </Text>

        <Text style={{ marginTop: 4 }}>Last Push: {syncInfo.lastPush ?? "—"}</Text>
        <Text style={{ marginTop: 4 }}>Last Pull: {syncInfo.lastPull ?? "—"}</Text>

        <View
          style={{
            marginTop: 8,
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: healthColor + "22",
            borderRadius: 8,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "600", color: healthColor }}>Status: {healthLabel}</Text>
        </View>

        <Text style={{ marginTop: 10, color: "#64748b" }}>
          Device ID: <Text style={{ fontWeight: "700" }}>{deviceId}</Text>
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

      {/* ADVANCED TOGGLE */}
      <TouchableOpacity
        onPress={() => setShowAdvanced(!showAdvanced)}
        style={{
          backgroundColor: "#cbd5e1",
          padding: 10,
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "600" }}>
          {showAdvanced ? "Hide Advanced Tools ▲" : "Show Advanced Tools ▼"}
        </Text>
      </TouchableOpacity>

      {/* ADVANCED CONTROLS */}
      {showAdvanced && (
        <>
          <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 10, color: "#1e293b" }}>
            Developer Tools
          </Text>

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
        </>
      )}

      {
      /* LAST RESULT CARD 
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

          <View
            style={{
              backgroundColor: "#f8fafc",
              padding: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#334155", fontFamily: "monospace" }}>
              {JSON.stringify(lastResult, null, 2)}
            </Text>
          </View>
        </View>
      )}
        */
        }
    </ScrollView>
  );
}
