// components/scan/SimilarBooksSection.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BookRead } from '@/types/scanTypes';
import { ExistingBookCard } from '@/components/scan/ExistingBookCard';

interface SimilarBooksSectionProps {
  books: BookRead[];
  onSelectBook?: (book: BookRead) => void;
}

export const SimilarBooksSection: React.FC<SimilarBooksSectionProps> = ({ books, onSelectBook }) => {
  if (!books || books.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Livres similaires</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {books.map((book) => (
          <View key={book.id} style={styles.item}>
            <ExistingBookCard book={book} onPress={() => onSelectBook?.(book)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  item: {
    width: 160,
  },
});
