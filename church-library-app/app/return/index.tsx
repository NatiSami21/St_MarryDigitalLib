// app/return/index.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity
} from "react-native";
import { useRouter } from "expo-router";

// app/borrow/index.tsx
export default function BorrowStart() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <TouchableOpacity
        onPress={() => router.push("/return/scan-book")}
        style={{
          backgroundColor: "#1e3a8a",
          padding: 20,
          borderRadius: 14,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 20 }}>
          Start Return Process
        </Text>
      </TouchableOpacity>
    </View>
  );
}

