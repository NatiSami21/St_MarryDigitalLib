// app/transactions/history/[fayda_id].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getUser } from "../../../db/users";
import { getUserHistory } from "../../../db/transactions";

export default function UserHistoryScreen() {
  const { fayda_id } = useLocalSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);

    const u = await getUser(String(fayda_id));
    const tx = await getUserHistory(String(fayda_id));

    setUser(u);
    setRecords(tx);
    setLoading(false);
  };

  const StatusBadge = ({ tx }: any) => {
    if (!tx.returned_at) {
      return (
        <Text
          style={{
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: "700",
          }}
        >
          ACTIVE
        </Text>
      );
    }
    return (
      <Text
        style={{
          backgroundColor: "#dcfce7",
          color: "#065f46",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: "700",
        }}
      >
          RETURNED
      </Text>
    );
  };

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={{ padding: 20, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 26, fontWeight: "800", marginBottom: 18 }}>
        Borrow History
      </Text>

      {/* USER HEADER */}
      {user && (
        <View
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 15,
            elevation: 3,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700" }}>{user.name}</Text>
          <Text style={{ color: "#6b7280" }}>Fayda ID: {user.fayda_id}</Text>
        </View>
      )}

      {/* NO HISTORY */}
      {records.length === 0 && (
        <Text
          style={{ textAlign: "center", marginTop: 40, color: "#6b7280" }}
        >
          This user has no borrow history.
        </Text>
      )}

      {/* HISTORY LIST */}
      {records.map((tx) => (
        <View
          key={tx.tx_id}
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 16,
            marginBottom: 15,
            elevation: 3,
          }}
        >
          {/* Title + Status */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700" }}>
              {tx.book_title || "Unknown Book"}
            </Text>
            <StatusBadge tx={tx} />
          </View>

          <Text style={{ marginBottom: 4 }}>
            📅 Borrowed: {tx.borrowed_at}
          </Text>

          {tx.returned_at && (
            <Text style={{ color: "#065f46" }}>
              ✔ Returned: {tx.returned_at}
            </Text>
          )}
        </View>
      ))}

      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          backgroundColor: "#1e40af",
          padding: 15,
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          Back
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
