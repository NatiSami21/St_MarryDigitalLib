import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import {
  getAllTransactions,
  getActiveTransactions,
  getReturnedTransactions,
} from "../../db/transactions";

export default function TransactionsScreen() {
  const [tab] = useState<"all" | "active" | "returned">("all");
  const [activeTab, setActiveTab] = useState(tab);

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);

    let data: any[] = [];

    if (activeTab === "all") data = await getAllTransactions();
    if (activeTab === "active") data = await getActiveTransactions();
    if (activeTab === "returned") data = await getReturnedTransactions();

    setRecords(data);
    setLoading(false);
  };

  const TabButton = ({ id, label }: any) => (
    <TouchableOpacity
      onPress={() => setActiveTab(id)}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 18,
        backgroundColor: activeTab === id ? "#1e3a8a" : "#e2e8f0",
        borderRadius: 12,
        marginRight: 10,
      }}
    >
      <Text
        style={{
          color: activeTab === id ? "white" : "#1e293b",
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

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
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 20 }}>
        Transactions
      </Text>

      {/* Tabs */}
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <TabButton id="all" label="All" />
        <TabButton id="active" label="Active" />
        <TabButton id="returned" label="Returned" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <ScrollView>
          {records.length === 0 && (
            <Text
              style={{
                textAlign: "center",
                marginTop: 40,
                color: "#64748b",
              }}
            >
              No transactions found.
            </Text>
          )}

          {records.map((tx) => (
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
              {/* Row: Title + Status */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 16 }}>
                  {tx.book_title || "Unknown Book"}
                </Text>

                <StatusBadge tx={tx} />
              </View>

              <Text style={{ marginTop: 6 }}>
                👤 User: {tx.user_name || "Unknown User"}
              </Text>

              <Text style={{ marginTop: 6 }}>
                📅 Borrowed: {tx.borrowed_at}
              </Text>

              {tx.returned_at && (
                <Text style={{ marginTop: 2, color: "#065f46" }}>
                  ✔ Returned: {tx.returned_at}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
