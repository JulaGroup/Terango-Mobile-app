import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";

export default function BackButton() {
  const router = useRouter();

  return (
    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
      <Ionicons name="arrow-back" size={24} color="#111827" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 50,
    left: 24,
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 12,
    zIndex: 10,
  },
});
