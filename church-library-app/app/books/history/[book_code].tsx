import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getBookHistory } from "../../../db/transactions";

export default function BookHistoryScreen() {
  const { book_code } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getBookHistory(String(book_code));
    setHistory(data);
    setLoading(false);
  };

  const StatusBadge = ({ tx }: any) => {
    if (!tx.returned_at) {
      return (
        <Text
          style={{
            backgroundColor: "#fecaca",
            color: "#991b1b",
            paddingVertical: 3,
            paddingHorizontal: 10,
            borderRadius: 8,
            fontWeight: "700",
            fontSize: 12,
          }}
        >
          ACTIVE
        </Text>
      );
    }
    return (
      <Text
        style={{
          backgroundColor: "#d1fae5",
          color: "#065f46",
          paddingVertical: 3,
          paddingHorizontal: 10,
          borderRadius: 8,
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        RETURNED
      </Text>
    );
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      
      <Text style={{ fontSize: 26, fontWeight: "800", marginBottom: 10 }}>
        Borrow History
      </Text>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: "#475569",
          marginBottom: 20,
        }}
      >
        Book: {history[0]?.book_title || book_code}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <ScrollView>
          {history.length === 0 && (
            <Text
              style={{
                textAlign: "center",
                marginTop: 40,
                color: "#64748b",
              }}
            >
              No history found for this book.
            </Text>
          )}

          {history.map((tx) => (
            <View
              key={tx.tx_id}
              style={{
                backgroundColor: "white",
                padding: 16,
                borderRadius: 14,
                marginBottom: 14,
                elevation: 2,
              }}
            >
              {/* Row: Username + Status */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 16 }}>
                  {tx.user_name || "Unknown User"}
                </Text>

                <StatusBadge tx={tx} />
              </View>

              <Text style={{ marginTop: 6 }}>📅 Borrowed: {tx.borrowed_at}</Text>

              {tx.returned_at && (
                <Text style={{ marginTop: 2, color: "#065f46" }}>
                  ✔ Returned: {tx.returned_at}
                </Text>
              )}

              {/* Go to user profile */}
              <TouchableOpacity
                onPress={() => router.push(`/users/${tx.fayda_id}`)}
                style={{
                  marginTop: 10,
                  backgroundColor: "#2563eb",
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  View User Profile
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
