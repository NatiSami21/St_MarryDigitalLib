import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import BookCard from "../../components/BookCard";
import { Book } from "../../types/Book";
import { getAllBooks, searchBooks } from "../../db/books";

import { events } from "../../utils/events";

export default function BookList() {
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Load all books from DB
  const loadBooks = async () => {
    try {
      const result = await getAllBooks();
      setBooks(result as Book[]);
    } catch (err) {
      console.log("Load books error:", err);
    }
  };

  // Handle search
  const handleSearch = async (text: string) => {
    setSearch(text);

    if (text.trim().length === 0) {
      loadBooks();
      return;
    }

    const result = await searchBooks(text);
    setBooks(result as Book[]);
  };

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    const sub = events.listen("refresh-books", loadBooks);
  return () => sub.remove();
}, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 10 }}>
        Books
      </Text>

      {/* SEARCH BAR */}
      <TextInput
        placeholder="Search by title, author, or category..."
        value={search}
        onChangeText={handleSearch}
        style={{
          padding: 12,
          borderWidth: 1,
          borderRadius: 8,
          marginBottom: 15,
        }}
      />

      {/* LIST */}
      <FlatList
        data={books}
        keyExtractor={(item) => item.book_code}
        renderItem={({ item }) => <BookCard book={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadBooks} />
        }
        ListEmptyComponent={
          <Text style={{ marginTop: 20, textAlign: "center", color: "gray" }}>
            No books found.
          </Text>
        }
      />

      {/* Add book button */}
      <TouchableOpacity
        onPress={() => router.push("/books/register")}
        style={{
          marginTop: 20,
          padding: 15,
          backgroundColor: "#1e40af",
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16 }}>
          + Add New Book
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function BookItem({ item }: any) {
  return (
    <View
      style={{
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>{item.title}</Text>
      <Text style={{ color: "gray" }}>{item.author}</Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <Text style={{ color: "#2563eb" }}>{item.category}</Text>
        <Text style={{ color: "#555" }}>Copies: {item.copies}</Text>
      </View>
    </View>
  );
}
