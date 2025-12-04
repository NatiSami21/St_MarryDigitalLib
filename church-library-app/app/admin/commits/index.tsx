// app/admin/commits/index.tsx

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from "react-native";
import { getPendingCommits, getSyncedCommits, PendingCommit } from "../../../db/queries/commits";
import { formatDistanceToNow } from "date-fns";
import { events } from "../../../utils/events";

export default function CommitLogsScreen() {
  const [tab, setTab] = useState<"pending" | "synced">("pending");
  const [pending, setPending] = useState<PendingCommit[]>([]);
  const [synced, setSynced] = useState<PendingCommit[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalPayload, setModalPayload] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const p = await getPendingCommits();
      const s = await getSyncedCommits();
      setPending(p);
      setSynced(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const sub = events.listen("commits-updated", () => load());
    return () => sub.remove();
  }, []);

  const commits = tab === "pending" ? pending : synced;

  if (loading) {
    return (
      <View style={{flex:1, justifyContent:"center", alignItems:"center"}}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const StatusPill = ({ status }: { status: string }) => (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 50,
        backgroundColor: status === "pending" ? "#facc15" : "#4ade80"
      }}
    >
      <Text style={{ fontWeight: "700", fontSize: 12, color: "#1e293b" }}>
        {status.toUpperCase()}
      </Text>
    </View>
  );

  const CommitCard = ({ commit }: { commit: PendingCommit }) => (
    <View
      style={{
        backgroundColor: "white",
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        elevation: 3
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "900", fontSize: 16, color: "#0f172a" }}>
          {commit.action.toUpperCase()}
        </Text>
        <StatusPill status={commit.synced === 1 ? "synced" : "pending"} />
      </View>

      <Text style={{ color: "#475569", marginTop: 6 }}>
        Table: <Text style={{ fontWeight: "700" }}>{commit.table_name}</Text>
      </Text>

      <Text style={{ color: "#64748b", marginTop: 6 }}>
        {formatDistanceToNow(commit.timestamp)} ago
      </Text>

      <TouchableOpacity
        onPress={() => {
          setModalPayload(commit.payload);
          setModalVisible(true);
        }}
        style={{
          marginTop: 10,
          padding: 10,
          backgroundColor: "#1e3a8a",
          borderRadius: 8
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
          View Payload
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#1e3a8a", padding: 18 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>
          Commit Logs
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", padding: 12 }}>
        {["pending", "synced"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t as any)}
            style={{
              flex: 1,
              paddingVertical: 10,
              backgroundColor: tab === t ? "#1e3a8a" : "#cbd5e1",
              borderRadius: 8,
              marginHorizontal: 4
            }}
          >
            <Text
              style={{
                color: tab === t ? "white" : "#1e293b",
                textAlign: "center",
                fontWeight: "800"
              }}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Commit List */}
      <ScrollView style={{ padding: 12 }}>
        {commits.map((c) => (
          <CommitCard key={c.id} commit={c} />
        ))}

        {commits.length === 0 && (
          <Text
            style={{
              textAlign: "center",
              marginTop: 40,
              color: "#475569",
              fontSize: 16
            }}
          >
            No {tab} commits found.
          </Text>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
          <Text style={{ fontSize: 22, fontWeight: "900", marginBottom: 14 }}>
            Commit Payload
          </Text>

          <ScrollView style={{ backgroundColor: "white", padding: 14, borderRadius: 10 }}>
            <Text style={{ fontFamily: "monospace" }}>
              {JSON.stringify(JSON.parse(modalPayload), null, 2)}
            </Text>
          </ScrollView>

          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={{
              marginTop: 20,
              padding: 14,
              backgroundColor: "#1e3a8a",
              borderRadius: 10
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
