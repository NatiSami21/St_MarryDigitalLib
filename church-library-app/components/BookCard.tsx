import { TouchableOpacity, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Book } from "../types/Book";

type Props = {
  book: Book;
};

export default function BookCard({ book }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/books/${book.book_code}`)}
      style={{
        padding: 15,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
        backgroundColor: "white",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>{book.title}</Text>
      <Text style={{ color: "gray", marginTop: 3 }}>{book.author}</Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <Text style={{ color: "#2563eb" }}>{book.category}</Text>
        <Text style={{ color: "#444" }}>Copies: {book.copies}</Text>
      </View>
    </TouchableOpacity>
  );
}
