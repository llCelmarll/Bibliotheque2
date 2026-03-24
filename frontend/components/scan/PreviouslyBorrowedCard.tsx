import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SuggestedBook } from '@/types/scanTypes';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  suggestedBook: SuggestedBook;
  onAddAsBorrow: () => void;
  onAddToLibrary: () => void;
  isAddingToLibrary?: boolean;
}

export const PreviouslyBorrowedCard: React.FC<Props> = ({
  suggestedBook,
  onAddAsBorrow,
  onAddToLibrary,
  isAddingToLibrary = false,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
      {/* Header avec icône */}
      <View style={styles.header}>
        <MaterialIcons name="history" size={32} color={theme.warning} />
        <Text style={[styles.title, { color: theme.warning }]}>Livre déjà emprunté</Text>
      </View>

      {/* Message */}
      <Text style={[styles.message, { color: theme.textPrimary }]}>
        Vous avez déjà emprunté "{suggestedBook.title}" mais il n'est plus dans votre bibliothèque.
      </Text>

      {/* Informations du livre */}
      <View style={[styles.bookInfo, { backgroundColor: theme.bgCard }]}>
        <Text style={[styles.bookTitle, { color: theme.textPrimary }]}>{suggestedBook.title}</Text>
        {suggestedBook.authors && suggestedBook.authors.length > 0 && (
          <Text style={[styles.bookAuthors, { color: theme.textSecondary }]}>
            {suggestedBook.authors.map(a => a.name).join(', ')}
          </Text>
        )}
        {suggestedBook.isbn && (
          <Text style={[styles.bookIsbn, { color: theme.textMuted }]}>ISBN: {suggestedBook.isbn}</Text>
        )}
      </View>

      {/* Actions */}
      <Text style={[styles.actionsLabel, { color: theme.textPrimary }]}>Que souhaitez-vous faire ?</Text>

      <TouchableOpacity
        style={[styles.borrowButton, { backgroundColor: theme.accentMedium }, isAddingToLibrary && styles.buttonDisabled]}
        onPress={onAddAsBorrow}
        disabled={isAddingToLibrary}
      >
        <MaterialIcons name="book" size={20} color={theme.textInverse} />
        <Text style={[styles.borrowButtonText, { color: theme.textInverse }]}>Emprunter à nouveau</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.libraryButton, { backgroundColor: theme.success }, isAddingToLibrary && styles.buttonDisabled]}
        onPress={onAddToLibrary}
        disabled={isAddingToLibrary}
      >
        {isAddingToLibrary ? (
          <ActivityIndicator color={theme.textInverse} size="small" />
        ) : (
          <MaterialIcons name="add-circle" size={20} color={theme.textInverse} />
        )}
        <Text style={[styles.libraryButtonText, { color: theme.textInverse }]}>
          {isAddingToLibrary ? 'Ajout en cours...' : 'Ajouter à ma bibliothèque'}
        </Text>
      </TouchableOpacity>

      {/* Note explicative */}
      <View style={styles.note}>
        <MaterialIcons name="info" size={16} color={theme.textSecondary} />
        <Text style={[styles.noteText, { color: theme.textSecondary }]}>
          "Ajouter à ma bibliothèque" supprimera l'historique d'emprunts
        </Text>
      </View>
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
    marginBottom: 2,
  },
  bookIsbn: {
    fontSize: 12,
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  borrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  borrowButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  libraryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
