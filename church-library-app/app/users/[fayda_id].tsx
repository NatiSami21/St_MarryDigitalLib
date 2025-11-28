// app/users/[fayda_id].tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getUser } from "../../db/users";
import { Ionicons } from "@expo/vector-icons";

export default function UserDetailsScreen() {
  const { fayda_id } = useLocalSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const data = await getUser(String(fayda_id));
      setUser(data);
    } catch (err) {
      console.log("User load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>User not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      {/* Profile Header */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Image
          source={
            user.photo_uri
              ? { uri: user.photo_uri }
              : require("../../assets/user-placeholder.png")
          }
          style={{
            width: 140,
            height: 140,
            borderRadius: 80,
            borderWidth: 3,
            borderColor: "#e5e7eb",
          }}
        />

        <Text style={{ fontSize: 22, fontWeight: "bold", marginTop: 15 }}>
          {user.name}
        </Text>

        <Text style={{ color: "#6b7280", marginTop: 4 }}>
          Fayda ID: {user.fayda_id}
        </Text>
      </View>

      {/* Info Card */}
      <View
        style={{
          backgroundColor: "white",
          padding: 18,
          borderRadius: 15,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 3,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
          Personal Information
        </Text>

        <DetailRow icon="person-outline" label="Name" value={user.name} />
        <DetailRow icon="male-female-outline" label="Gender" value={user.gender || "N/A"} />
        <DetailRow icon="call-outline" label="Phone" value={user.phone || "N/A"} />
        <DetailRow icon="home-outline" label="Address" value={user.address || "N/A"} />
        <DetailRow icon="barcode-outline" label="Fayda ID" value={user.fayda_id} />
      </View>

      {/* ACTION BUTTONS */}
      <TouchableOpacity
        onPress={() => router.push(`/users/edit/${user.fayda_id}`)}
        style={{
          backgroundColor: "#2563eb",
          padding: 15,
          borderRadius: 10,
          marginBottom: 15,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16, fontWeight: "600" }}>
          Edit User
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push(`/transactions/history/${user.fayda_id}`)}
        style={{
          backgroundColor: "#374151",
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16, fontWeight: "600" }}>
          View Borrow History
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <Ionicons name={icon} size={20} color="#1e3a8a" style={{ width: 28 }} />
      <Text style={{ fontWeight: "600" }}>{label}: </Text>
      <Text style={{ color: "#374151", marginLeft: 4 }}>{value}</Text>
    </View>
  );
}
