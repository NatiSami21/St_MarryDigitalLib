import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";

import Animated, { FadeInUp } from "react-native-reanimated";
import { addBook } from "../../db/books";

export default function RegisterBook() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [copies, setCopies] = useState("1");

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const qrRef = useRef<any>(null);

  const handleRegister = async () => {
    if (!title || !author || !category) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }

    try {
      const book_code = await addBook({
        title,
        author,
        category,
        notes,
        copies: Number(copies),
      });

      setGeneratedCode(book_code);
      Alert.alert("Success", "📚 Book Registered Successfully!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save book.");
    }
  };

  const saveQr = async () => {
    if (!generatedCode) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please allow gallery access.");
      return;
    }

    qrRef.current.toDataURL(async (base64: string) => {
      const fileUri = FileSystem.cacheDirectory + `${generatedCode}.png`;
      

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: "base64",
      });
 
      await MediaLibrary.saveToLibraryAsync(fileUri);

      Alert.alert("Saved", "QR saved to gallery 📷");
    });
  };

  return (
    <ScrollView className="flex-1 bg-white p-5">
      <Animated.Text
        entering={FadeInUp.duration(500)}
        className="text-3xl font-bold text-gray-800 mb-6"
      >
        Register New Book
      </Animated.Text>

      <View className="space-y-3">
        <TextInput
          placeholder="Book Title"
          value={title}
          onChangeText={setTitle}
          className="bg-gray-100 p-4 rounded-xl text-lg"
        />

        <TextInput
          placeholder="Author"
          value={author}
          onChangeText={setAuthor}
          className="bg-gray-100 p-4 rounded-xl text-lg"
        />

        <TextInput
          placeholder="Category (e.g. Spiritual)"
          value={category}
          onChangeText={setCategory}
          className="bg-gray-100 p-4 rounded-xl text-lg"
        />

        <TextInput
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          className="bg-gray-100 p-4 rounded-xl text-lg"
        />

        <TextInput
          placeholder="Copies"
          keyboardType="numeric"
          value={copies}
          onChangeText={setCopies}
          className="bg-gray-100 p-4 rounded-xl text-lg"
        />
      </View>

      <TouchableOpacity
        onPress={handleRegister}
        className="bg-blue-600 mt-5 p-4 rounded-xl"
      >
        <Text className="text-white text-center text-lg font-bold">
          Register Book
        </Text>
      </TouchableOpacity>

      {generatedCode && (
        <Animated.View
          entering={FadeInUp.delay(250)}
          className="mt-10 items-center"
        >
          <Text className="text-xl font-semibold mb-3">Generated Book QR</Text>

          <QRCode value={generatedCode} size={180} getRef={(c) => (qrRef.current = c)} />

          <TouchableOpacity
            onPress={saveQr}
            className="bg-green-600 p-4 rounded-xl mt-5"
          >
            <Text className="text-white text-center text-lg font-bold">
              Save QR to Gallery
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}
