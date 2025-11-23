// app/books/list.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native";

export default function BookList() {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadBooks = async () => {
    console.log("Loading books...");
    // Temporary mock data
    setBooks([
      { book_code: '1', title: 'Sample Book 1', author: 'Author 1', category: 'Fiction', copies: 2 },
      { book_code: '2', title: 'Sample Book 2', author: 'Author 2', category: 'Non-Fiction', copies: 1 },
    ]);
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    // Simple search logic for now
    if (text.trim().length === 0) {
      loadBooks();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBooks();
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const renderBookItem = ({ item }: { item: any }) => (
    <View style={styles.bookCard}>
      <TouchableOpacity onPress={() => console.log('Pressed:', item.title)}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
        <View style={styles.bookFooter}>
          <Text style={styles.bookCategory}>{item.category}</Text>
          <Text style={styles.bookCopies}>Copies: {item.copies ?? 1}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Books</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search books by title, author, category..."
          value={search}
          onChangeText={handleSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Book List */}
      <FlatList
        data={books}
        keyExtractor={(item) => item.book_code}
        renderItem={renderBookItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchContainer: {
    width: '100%',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
  },
  bookCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  bookAuthor: {
    color: '#4b5563',
    marginTop: 4,
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  bookCategory: {
    color: '#2563eb',
    fontWeight: '500',
  },
  bookCopies: {
    color: '#6b7280',
  },
});