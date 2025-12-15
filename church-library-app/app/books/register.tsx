// app/books/register.tsx

import React, { useRef, useState } from "react";
import { View, Text, TextInput, Button, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";

import { addBook } from "../../db/books";
import { events } from "../../utils/events";

import { getSession } from "../../lib/session";
import { isInsideShift } from "../../utils/shift";

export default function RegisterBook() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [copies, setCopies] = useState("1");

  // Success state
  const [createdBookCode, setCreatedBookCode] = useState<string | null>(null);

  // QR code ref
  const qrRef = useRef<any>(null);

  /**
   * 🔐 ACTION GUARD
   * Must be called before ANY write
   */
  const assertCanWrite = async (): Promise<boolean> => {
    const session = await getSession();

    if (!session) {
      Alert.alert("Session Expired", "Please log in again.");
      router.replace("/auth/login");
      return false;
    }

    // Admin bypass
    if (session.role === "admin") return true;

    const allowed = await isInsideShift(session.username);
    if (!allowed) {
      Alert.alert(
        "Action Blocked",
        "❌ Your shift has ended. You cannot perform this action."
      );
      return false;
    }

    return true;
  };

  // Save QR as image
  const saveQrToGallery = async () => {
    try {
      if (!qrRef.current) {
        Alert.alert("Error", "QR code is not generated yet.");
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to save QR codes."
        );
        return;
      }

      const base64 = await new Promise<string>((resolve) => {
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      const fileUri =
        FileSystem.cacheDirectory + `book-${createdBookCode}.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("Church Library", asset, false);

      Alert.alert("Success", "QR code saved to gallery!");
      await FileSystem.deleteAsync(fileUri).catch(() => {});
    } catch (error) {
      console.log("QR Save Error:", error);
      Alert.alert("Error", "Could not save QR code to gallery.");
    }
  };

  // Submit handler
  const handleRegister = async () => {
    // 🔐 Guard FIRST
    const allowed = await assertCanWrite();
    if (!allowed) return;

    if (!title.trim()) return Alert.alert("Error", "Title is required.");
    if (!author.trim()) return Alert.alert("Error", "Author is required.");

    try {
      const code = await addBook({
        title,
        author,
        category,
        notes,
        copies: parseInt(copies) || 1,
      });

      setCreatedBookCode(code);
      Alert.alert("Success", "Book added successfully!");

      events.emit("refresh-books");
      events.emit("refresh-dashboard");
    } catch (err) {
      console.log("Book add error:", err);
      Alert.alert("Error", "Failed to add book.");
    }
  };

  // If saved → show QR screen
  if (createdBookCode) {
    return (
      <View
        style={{
          flex: 1,
          padding: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
          Book Registered!
        </Text>

        <QRCode
          value={createdBookCode}
          size={180}
          getRef={(c) => (qrRef.current = c)}
        />

        <View style={{ marginTop: 30 }}>
          <Button title="Save QR to Gallery" onPress={saveQrToGallery} />
        </View>

        <View style={{ marginTop: 20 }}>
          <Button
            title="Register Another Book"
            onPress={() => setCreatedBookCode(null)}
          />
        </View>

        <View style={{ marginTop: 20 }}>
          <Button title="Go to Home" onPress={() => router.push("/")} />
        </View>
      </View>
    );
  }

  // Main form UI
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 15 }}>
        Register New Book
      </Text>

      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Author"
        value={author}
        onChangeText={setAuthor}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Copies"
        value={copies}
        onChangeText={setCopies}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />

      <Button title="Register Book" onPress={handleRegister} />
    </ScrollView>
  );
}
