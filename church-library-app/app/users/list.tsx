// app/users/list.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllUsers, searchUsers } from "../../db/users";
import { useRouter } from "expo-router";

export default function UserListScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = async () => {
    const list = await getAllUsers();
    setUsers(list);
  };

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.trim().length === 0) {
      loadUsers();
    } else {
      const results = await searchUsers(text.trim());
      setUsers(results);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => router.push(`/users/${item.fayda_id}`)}
      style={{
        backgroundColor: "white",
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        marginBottom: 10,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
      }}
    >
      <Image
        source={
          item.photo_uri
            ? { uri: item.photo_uri }
            : require("../../assets/user-placeholder.png")
        }
        style={{
          width: 55,
          height: 55,
          borderRadius: 40,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          marginRight: 12,
        }}
      />

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
        <Text style={{ color: "#6b7280" }}>{item.fayda_id}</Text>
        <Text style={{ color: "#6b7280" }}>{item.phone}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 15 }}>
        Users
      </Text>

      {/* Search Input */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "white",
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          marginBottom: 15,
        }}
      >
        <Ionicons name="search" size={20} color="#6b7280" style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder="Search by name, Fayda ID, phone"
          style={{ flex: 1 }}
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.fayda_id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1e3a8a"]} />
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        onPress={() => router.push("/users/register")}
        style={{
          position: "absolute",
          bottom: 30,
          right: 30,
          backgroundColor: "#1e3a8a",
          padding: 18,
          borderRadius: 40,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
