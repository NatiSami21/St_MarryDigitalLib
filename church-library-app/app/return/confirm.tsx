// app/return/confirm.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getUser } from "../../db/users";
import { getBook } from "../../db/books";
import { getActiveBorrow, completeReturn } from "../../db/transactions";

function toStringParam(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

export default function ConfirmReturn() {
  const params = useLocalSearchParams();
  const book_code = toStringParam(params.book_code);
  const fayda_id = toStringParam(params.fayda_id);

  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [activeBorrow, setActiveBorrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await getUser(fayda_id);
      const b = await getBook(book_code);
      const borrow = await getActiveBorrow(fayda_id, book_code);

      setUser(u);
      setBook(b);
      setActiveBorrow(borrow);
      setLoading(false);

      if (!u) Alert.alert("User Not Found");
      if (!b) Alert.alert("Book Not Found");
    }
    load();
  }, []);

  const handleConfirm = async () => {
    if (!user || !book) return;

    if (!activeBorrow) {
      Alert.alert("Not Borrowed", "This user did NOT borrow this book.");
      return;
    }

    setProcessing(true);

    await completeReturn(activeBorrow.tx_id);

    Alert.alert("Success", "Book Returned Successfully!", [
      {
        text: "OK",
        onPress: () => router.replace("./transactions"),
      },
    ]);

    setProcessing(false);
  };

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 20 }}>
        Confirm Return
      </Text>

      {/* USER CARD */}
      {user && (
        <View
          style={{
            backgroundColor: "#e0f2fe",
            padding: 16,
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 10 }}>
            User Details
          </Text>

          {user.photo_uri && (
            <Image
              source={{ uri: user.photo_uri }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                marginBottom: 10,
              }}
            />
          )}

          <Text>Name: {user.name}</Text>
          <Text>Gender: {user.gender}</Text>
          <Text>Phone: {user.phone}</Text>
          <Text>Address: {user.address}</Text>
        </View>
      )}

      {/* BOOK CARD */}
      {book && (
        <View
          style={{
            backgroundColor: "#fef9c3",
            padding: 16,
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 10 }}>
            Book Details
          </Text>

          <Text>Title: {book.title}</Text>
          <Text>Author: {book.author}</Text>
          <Text>Copies: {book.copies}</Text>
        </View>
      )}

      {/* BORROW INFO */}
      {!activeBorrow ? (
        <Text style={{ fontSize: 18, color: "red", marginBottom: 20 }}>
          ❌ This user has NOT borrowed this book.
        </Text>
      ) : (
        <Text
          style={{
            fontSize: 18,
            color: "green",
            marginBottom: 20,
            fontWeight: "700",
          }}
        >
          ✔ Borrow Record Found  
          Borrowed At: {activeBorrow.timestamp}
        </Text>
      )}

      {/* CONFIRM BUTTON */}
      <TouchableOpacity
        onPress={handleConfirm}
        disabled={processing || !activeBorrow}
        style={{
          backgroundColor:
            processing || !activeBorrow ? "#94a3b8" : "#166534",
          padding: 15,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "800",
            fontSize: 18,
          }}
        >
          {processing ? "Processing..." : "Confirm Return"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
