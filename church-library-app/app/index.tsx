import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Church Library System
      </Text>

      <Button
        title="Register a Book"
        onPress={() => router.push("/books/register")}
      />
      <Button 
        title="Book List" 
        onPress={() => router.push("/books/list")} 
      />

      <Button 
        title="Register User" 
        onPress={() => router.push("/users/register")} 
      />

    </View>
  );
}
