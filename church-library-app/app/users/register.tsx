// app/users/register.tsx
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import PhotoPicker from "../../components/PhotoPicker";
import { upsertUser } from "../../db/users";

import { events } from "../../utils/events";

export default function RegisterUser() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [faydaId, setFaydaId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (params.fayda) setFaydaId(String(params.fayda));
  }, [params]);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("Error", "Name is required");
    if (!faydaId.trim()) return Alert.alert("Error", "Fayda ID required");

    try {
      await upsertUser({
        fayda_id: faydaId,
        name,
        phone,
        gender,
        address,
        photo_uri: photoUri ?? "",
      });

      Alert.alert("Success", "User saved successfully");
      
      events.emit("refresh-users");

      router.push("/");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Save failed");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 15 }}>
        Register User
      </Text>

      {/* Fayda ID */}
      <Text style={{ marginBottom: 6 }}>Fayda ID</Text>
      <TextInput
        value={faydaId}
        onChangeText={setFaydaId}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
        }}
        placeholder="Scan or enter ID"
      />

      <TouchableOpacity
        onPress={() => router.push("/users/scan")}
        style={{
          backgroundColor: "#1e3a8a",
          padding: 12,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Scan Fayda ID
        </Text>
      </TouchableOpacity>

      {/* Name */}
      <Text style={{ marginBottom: 6 }}>Full Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Enter full name"
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
        }}
      />

      {/* Phone */}
      <Text style={{ marginBottom: 6 }}>Phone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Phone number"
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
        }}
      />

      {/* Gender */}
      <Text style={{ marginBottom: 6 }}>Gender</Text>
      <TextInput
        value={gender}
        onChangeText={setGender}
        placeholder="Male / Female"
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
        }}
      />

      {/* Address */}
      <Text style={{ marginBottom: 6 }}>Address</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="Address"
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 20,
        }}
      />

      {/* PHOTO PICKER WITH CLOUDINARY */}
      <PhotoPicker imageUri={photoUri} onChange={setPhotoUri} />

      <TouchableOpacity
        onPress={handleSave}
        style={{
          backgroundColor: "#2563eb",
          padding: 15,
          borderRadius: 12,
          marginTop: 25,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16 }}>
          Save User
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
