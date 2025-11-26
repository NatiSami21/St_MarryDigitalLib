// app/users/edit/[fayda_id].tsx
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getUser, updateUser } from "../../../db/users";
import PhotoPicker from "../../../components/PhotoPicker";

export default function EditUser() {
  const { fayda_id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getUser(String(fayda_id));
      if (user) {
        setName(user.name);
        setGender(user.gender || "");
        setPhone(user.phone || "");
        setAddress(user.address || "");
        setPhotoUri(user.photo_uri || null);
      }
    } catch (err) {
      console.log("Load user error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    try {
      await updateUser(String(fayda_id), {
        name,
        gender,
        phone,
        address,
        photo_uri: photoUri,
      });

      Alert.alert("Success", "User updated successfully!", [
        {
          text: "OK",
          onPress: () => router.replace(`/users/${fayda_id}`),
        },
      ]);
    } catch (err) {
      console.log("Update user error:", err);
      Alert.alert("Error", "Could not update user.");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 20 }}>
        Edit User
      </Text>

      {/* Photo Picker */}
      <PhotoPicker imageUri={photoUri} onChange={setPhotoUri} />

      {/* Name */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Full Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
        }}
      />

      {/* Gender */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Gender</Text>
      <TextInput
        value={gender}
        onChangeText={setGender}
        placeholder="Male / Female"
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
        }}
      />

      {/* Phone */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Phone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
        }}
      />

      {/* Address */}
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>Address</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 20,
        }}
      />

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        style={{
          backgroundColor: "#1e3a8a",
          padding: 15,
          borderRadius: 10,
          marginTop: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          Save Changes
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
