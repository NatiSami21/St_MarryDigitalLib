// app/components/BookCard.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { Book } from "../types/Book";

interface BookCardProps {
  book: Book;
  onPress?: () => void; // Make it optional for backward compatibility
}

export default function BookCard({ book, onPress }: BookCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const getStatus = () => {
    // Check if available_copies exists in Book type, otherwise use copies
    const available = (book as any).available_copies !== undefined 
      ? (book as any).available_copies 
      : book.copies;
    
    if (available > 0) {
      return { text: "Available", color: "#27AE60", bgColor: "#F0FFF4" };
    } else {
      return { text: "Borrowed", color: "#E74C3C", bgColor: "#FDF2F2" };
    }
  };

  const status = getStatus();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        {/*  
        
        <View style={styles.codeContainer}>
          <Feather name="hash" size={14} color="#005B82" />
          <Text style={styles.codeText}>{book.book_code}</Text>
        </View>

         */}
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.text}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {book.title}
      </Text>

      <View style={styles.authorRow}>
        <Feather name="user" size={14} color="#7F8C8D" />
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialIcons name="local-library" size={14} color="#005B82" />
          <Text style={styles.metaText}>
            {book.copies} copies
          </Text>
        </View>

        {book.category && (
          <View style={styles.metaItem}>
            <Feather name="folder" size={14} color="#005B82" />
            <Text style={styles.metaText}>{book.category}</Text>
          </View>
        )}
      </View>

      {book.notes && (
        <View style={styles.notesContainer}>
          <Feather name="file-text" size={12} color="#7F8C8D" />
          <Text style={styles.notesText} numberOfLines={2}>
            {book.notes}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Feather name="calendar" size={14} color="#7F8C8D" />
          <Text style={styles.footerText}>
            Added recently
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="#E5E0D5" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  codeText: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 8,
    lineHeight: 24,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  author: {
    fontSize: 15,
    color: "#7F8C8D",
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "500",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  notesText: {
    fontSize: 13,
    color: "#7F8C8D",
    flex: 1,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F7FF",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#7F8C8D",
  },
});