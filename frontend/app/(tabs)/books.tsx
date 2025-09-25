import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { fetchBooks, Book } from "@/services/books";

export default function BooksScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await fetchBooks();
        setBooks(data);
      } catch (error) {
        console.error("Erreur de chargement : ", error)
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, [])

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loader} />
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.bookItem}>
            <Text style={styles.title}>{item.title}</Text>
            {item.isbn && <Text style={styles.subtitle}>ISBN: {item.isbn}</Text>}
            {item.page_count && <Text>{item.page_count} pages</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
 container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  bookItem: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: "bold" },
  subtitle: { color: "#666" },
});
