import React from "react";
import { View, TextInput } from "react-native";

export default function SearchBar({ value, onChange }: any) {
  return (
    <View className="w-full mb-4">
      <TextInput
        placeholder="Search books by title, author, category..."
        value={value}
        onChangeText={onChange}
        className="bg-gray-100 p-4 rounded-2xl text-lg"
      />
    </View>
  );
}