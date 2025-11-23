import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function BookCard({ item, onPress }: any) {
  return (
    <View className="bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-100">
      <TouchableOpacity onPress={onPress}>
        <Text className="text-xl font-semibold text-gray-800">{item.title}</Text>
        <Text className="text-gray-600">{item.author}</Text>

        <View className="flex-row justify-between mt-3">
          <Text className="text-blue-600 font-medium">{item.category}</Text>
          <Text className="text-gray-500">
            Copies: {item.copies ?? 1}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}