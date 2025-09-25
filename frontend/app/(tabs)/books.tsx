import { View, Text, StyleSheet } from "react-native";

export default function BooksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📚 Liste des livres</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
