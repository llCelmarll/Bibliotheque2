import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BorrowedBook } from '@/types/borrowedBook';
import { SuggestedBook } from '@/types/scanTypes';

interface Props {
  suggestedBook: SuggestedBook;
  borrowedBook: BorrowedBook;
}

export const CurrentlyBorrowedCard: React.FC<Props> = ({
  suggestedBook,
  borrowedBook,
}) => {
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
    <View style={styles.container}>
      {/* Header avec icône */}
      <View style={styles.header}>
        <MaterialIcons name="book" size={32} color="#9C27B0" />
        <Text style={styles.title}>Livre déjà emprunté</Text>
      </View>

      {/* Message */}
      <Text style={styles.message}>
        Vous avez déjà emprunté ce livre et il est actuellement dans vos emprunts actifs.
      </Text>

      {/* Informations du livre */}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{suggestedBook.title}</Text>
        {suggestedBook.authors && suggestedBook.authors.length > 0 && (
          <Text style={styles.bookAuthors}>
            {suggestedBook.authors.map(a => a.name).join(', ')}
          </Text>
        )}
      </View>

      {/* Détails de l'emprunt */}
      <View style={styles.borrowDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={16} color="#757575" />
          <Text style={styles.detailText}>Emprunté à: {borrowedBook.borrowed_from}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="calendar-today" size={16} color="#757575" />
          <Text style={styles.detailText}>
            Depuis le {formatDate(borrowedBook.borrowed_date)}
          </Text>
        </View>
        {borrowedBook.expected_return_date && (
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={16} color="#757575" />
            <Text style={styles.detailText}>
              Retour prévu: {formatDate(borrowedBook.expected_return_date)}
            </Text>
          </View>
        )}
      </View>

      {/* Action */}
      <TouchableOpacity style={styles.viewButton} onPress={handleViewBorrow}>
        <MaterialIcons name="visibility" size={20} color="#FFFFFF" />
        <Text style={styles.viewButtonText}>Voir dans mes emprunts</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6A1B9A',
    marginLeft: 12,
  },
  message: {
    fontSize: 15,
    color: '#424242',
    marginBottom: 16,
    lineHeight: 22,
  },
  bookInfo: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  bookAuthors: {
    fontSize: 14,
    color: '#757575',
  },
  borrowDetails: {
    backgroundColor: '#FFFFFF',
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
    color: '#424242',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
