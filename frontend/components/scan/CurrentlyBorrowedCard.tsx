import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BorrowedBook } from '@/types/borrowedBook';
import { SuggestedBook } from '@/types/scanTypes';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  suggestedBook: SuggestedBook;
  borrowedBook: BorrowedBook;
}

export const CurrentlyBorrowedCard: React.FC<Props> = ({
  suggestedBook,
  borrowedBook,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleViewBorrow = () => {
    router.push(`/(tabs)/borrows/${borrowedBook.id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
      {/* Header avec icône */}
      <View style={styles.header}>
        <MaterialIcons name="book" size={32} color={theme.accent} />
        <Text style={[styles.title, { color: theme.accent }]}>Livre déjà emprunté</Text>
      </View>

      {/* Message */}
      <Text style={[styles.message, { color: theme.textPrimary }]}>
        Vous avez déjà emprunté ce livre et il est actuellement dans vos emprunts actifs.
      </Text>

      {/* Informations du livre */}
      <View style={[styles.bookInfo, { backgroundColor: theme.bgCard }]}>
        <Text style={[styles.bookTitle, { color: theme.textPrimary }]}>{suggestedBook.title}</Text>
        {suggestedBook.authors && suggestedBook.authors.length > 0 && (
          <Text style={[styles.bookAuthors, { color: theme.textSecondary }]}>
            {suggestedBook.authors.map(a => a.name).join(', ')}
          </Text>
        )}
      </View>

      {/* Détails de l'emprunt */}
      <View style={[styles.borrowDetails, { backgroundColor: theme.bgCard }]}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textPrimary }]}>Emprunté à: {borrowedBook.contact?.name || borrowedBook.borrowed_from}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="calendar-today" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textPrimary }]}>
            Depuis le {formatDate(borrowedBook.borrowed_date)}
          </Text>
        </View>
        {borrowedBook.expected_return_date && (
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={16} color={theme.textSecondary} />
            <Text style={[styles.detailText, { color: theme.textPrimary }]}>
              Retour prévu: {formatDate(borrowedBook.expected_return_date)}
            </Text>
          </View>
        )}
      </View>

      {/* Action */}
      <TouchableOpacity style={[styles.viewButton, { backgroundColor: theme.accent }]} onPress={handleViewBorrow}>
        <MaterialIcons name="visibility" size={20} color={theme.textInverse} />
        <Text style={[styles.viewButtonText, { color: theme.textInverse }]}>Voir dans mes emprunts</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  message: {
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 22,
  },
  bookInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookAuthors: {
    fontSize: 14,
  },
  borrowDetails: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
