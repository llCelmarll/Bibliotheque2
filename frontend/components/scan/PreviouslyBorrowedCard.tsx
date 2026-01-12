import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SuggestedBook } from '@/types/scanTypes';

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
  return (
    <View style={styles.container}>
      {/* Header avec icône */}
      <View style={styles.header}>
        <MaterialIcons name="history" size={32} color="#FF9800" />
        <Text style={styles.title}>Livre déjà emprunté</Text>
      </View>

      {/* Message */}
      <Text style={styles.message}>
        Vous avez déjà emprunté "{suggestedBook.title}" mais il n'est plus dans votre bibliothèque.
      </Text>

      {/* Informations du livre */}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{suggestedBook.title}</Text>
        {suggestedBook.authors && suggestedBook.authors.length > 0 && (
          <Text style={styles.bookAuthors}>
            {suggestedBook.authors.map(a => a.name).join(', ')}
          </Text>
        )}
        {suggestedBook.isbn && (
          <Text style={styles.bookIsbn}>ISBN: {suggestedBook.isbn}</Text>
        )}
      </View>

      {/* Actions */}
      <Text style={styles.actionsLabel}>Que souhaitez-vous faire ?</Text>

      <TouchableOpacity
        style={[styles.borrowButton, isAddingToLibrary && styles.buttonDisabled]}
        onPress={onAddAsBorrow}
        disabled={isAddingToLibrary}
      >
        <MaterialIcons name="book" size={20} color="#FFFFFF" />
        <Text style={styles.borrowButtonText}>Emprunter à nouveau</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.libraryButton, isAddingToLibrary && styles.buttonDisabled]}
        onPress={onAddToLibrary}
        disabled={isAddingToLibrary}
      >
        {isAddingToLibrary ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <MaterialIcons name="add-circle" size={20} color="#FFFFFF" />
        )}
        <Text style={styles.libraryButtonText}>
          {isAddingToLibrary ? 'Ajout en cours...' : 'Ajouter à ma bibliothèque'}
        </Text>
      </TouchableOpacity>

      {/* Note explicative */}
      <View style={styles.note}>
        <MaterialIcons name="info" size={16} color="#757575" />
        <Text style={styles.noteText}>
          "Ajouter à ma bibliothèque" supprimera l'historique d'emprunts
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E65100',
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
    marginBottom: 2,
  },
  bookIsbn: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 12,
  },
  borrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  borrowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  libraryButtonText: {
    color: '#FFFFFF',
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
    color: '#757575',
    fontStyle: 'italic',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
