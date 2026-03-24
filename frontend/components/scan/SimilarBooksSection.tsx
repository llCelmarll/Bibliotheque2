// components/scan/SimilarBooksSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BookRead } from '@/types/scanTypes';
import { ExistingBookCard } from '@/components/scan/ExistingBookCard';
import { useTheme } from '@/contexts/ThemeContext';

interface SimilarBooksSectionProps {
  books: BookRead[];
  onSelectBook?: (book: BookRead) => void;
}

export const SimilarBooksSection: React.FC<SimilarBooksSectionProps> = ({ books, onSelectBook }) => {
  const theme = useTheme();

  if (!books || books.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgCard, shadowColor: theme.textPrimary }]}>
      <View style={[styles.warningBanner, { backgroundColor: theme.warningBg, borderLeftColor: theme.warning }]}>
        <MaterialIcons name="warning" size={24} color={theme.warning} />
        <View style={styles.warningTextContainer}>
          <Text style={[styles.warningTitle, { color: theme.warning }]}>Attention : Livres similaires trouvés</Text>
          <Text style={[styles.warningSubtitle, { color: theme.warning }]}>
            {books.length === 1
              ? "Vous avez déjà un livre avec un titre similaire. Vérifiez qu'il ne s'agit pas d'un doublon avant d'ajouter ce livre."
              : `Vous avez déjà ${books.length} livres avec des titres similaires. Vérifiez qu'il ne s'agit pas de doublons avant d'ajouter ce livre.`
            }
          </Text>
        </View>
      </View>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>
        {books.length === 1 ? "1 livre similaire" : `${books.length} livres similaires`}
      </Text>

      <View style={styles.booksList}>
        {books.map((book) => (
          <ExistingBookCard
            key={book.id}
            book={book}
            onPress={() => onSelectBook?.(book)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  booksList: {
    gap: 8,
  },
});
