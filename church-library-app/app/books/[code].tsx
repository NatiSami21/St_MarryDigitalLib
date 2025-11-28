import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";

import { getBookByCode } from "../../db/books";

export default function BookDetails() {
  const { code } = useLocalSearchParams();
  const router = useRouter();

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const qrRef = useRef<any>(null);

  // Fetch book
  useEffect(() => {
    async function loadBook() {
      try {
        const data = await getBookByCode(code as string);
        setBook(data);
      } catch (err) {
        console.log("Fetch error:", err);
        Alert.alert("Error", "Failed to load book.");
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, []);

  // Save QR
  const saveQrToGallery = async () => {
    try {
      if (!qrRef.current) {
        Alert.alert("Error", "QR code is not ready.");
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Gallery access needed.");
        return;
      }

      const base64 = await new Promise<string>((resolve) => {
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      const fileUri = FileSystem.cacheDirectory + `book-${book.book_code}.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await MediaLibrary.saveToLibraryAsync(fileUri);

      Alert.alert("Success", "QR saved to gallery!");
    } catch (error) {
      console.log("QR Save Error:", error);
      Alert.alert("Error", "Could not save QR.");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Book not found.</Text>
        <Button title="Back Home" onPress={() => router.push("/")} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 10 }}>
        {book.title}
      </Text>

      <Text style={{ fontSize: 18, color: "gray" }}>{book.author}</Text>

      <View style={{ marginTop: 15 }}>
        <Text style={{ fontSize: 16 }}>Category: {book.category}</Text>
        <Text style={{ fontSize: 16 }}>Copies: {book.copies}</Text>
      </View>

      {book.notes ? (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>Notes:</Text>
          <Text>{book.notes}</Text>
        </View>
      ) : null}

      {/* QR Section */}
      <View
        style={{
          marginTop: 30,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <QRCode
          value={book.book_code}
          size={200}
          getRef={(c) => (qrRef.current = c)}
        />

        <View style={{ marginTop: 20 }}>
          <Button title="Save QR to Gallery" onPress={saveQrToGallery} />
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push(`/books/history/${book.book_code}`)}
        style={{
          backgroundColor: "#374151",
          padding: 15,
          borderRadius: 10,
          marginTop: 15,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          View Borrow History
        </Text>
      </TouchableOpacity>


      <View style={{ marginTop: 40 }}>
        <Button title="Back to Books" onPress={() => router.push("/books/list")} />
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title="Home" onPress={() => router.push("/")} />
      </View>
    </ScrollView>
  );
}
