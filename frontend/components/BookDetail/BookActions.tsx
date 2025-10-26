import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { bookService } from '@/services/bookService';

interface BookActionsProps {
  bookId: string;
  bookTitle: string;
  onBookDeleted?: () => void;
}

export function BookActions({ bookId, bookTitle, onBookDeleted }: BookActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    console.log('🔧 Bouton Modifier cliqué');
    // TODO: Navigation vers l'écran d'édition
    // Pour l'instant, on affiche juste une alerte
    if (Platform.OS === 'web') {
      window.alert('La fonction de modification sera implémentée prochainement.');
    } else {
      Alert.alert(
        'Modification',
        'La fonction de modification sera implémentée prochainement.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDelete = () => {
    console.log('🗑️ Bouton Supprimer cliqué');
    
    if (Platform.OS === 'web') {
      // Sur web, utiliser window.confirm
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir supprimer "${bookTitle}" ?\n\nCette action est irréversible.`
      );
      if (confirmed) {
        confirmDelete();
      }
    } else {
      // Sur mobile, utiliser Alert.alert
      Alert.alert(
        'Supprimer le livre',
        `Êtes-vous sûr de vouloir supprimer "${bookTitle}" ?\n\nCette action est irréversible.`,
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: confirmDelete
          }
        ]
      );
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    
    try {
      await bookService.deleteBook(bookId);
      
      if (Platform.OS === 'web') {
        window.alert('Le livre a été supprimé avec succès.');
        // Appeler le callback si fourni
        onBookDeleted?.();
        // Retourner à la liste des livres
        router.push('/(tabs)/books');
      } else {
        Alert.alert(
          'Livre supprimé',
          'Le livre a été supprimé avec succès.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Appeler le callback si fourni
                onBookDeleted?.();
                // Retourner à la liste des livres
                router.push('/(tabs)/books');
              }
            }
          ]
        );
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Une erreur est survenue lors de la suppression du livre.');
      } else {
        Alert.alert(
          'Erreur',
          'Une erreur est survenue lors de la suppression du livre.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.editButton]}
        onPress={handleEdit}
        disabled={isDeleting}
        activeOpacity={0.7}
      >
        <MaterialIcons name="edit" size={20} color="#ffffff" />
        <Text style={styles.buttonText}>Modifier</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.deleteButton]}
        onPress={handleDelete}
        disabled={isDeleting}
        activeOpacity={0.7}
      >
        <MaterialIcons name="delete" size={20} color="#ffffff" />
        <Text style={styles.buttonText}>
          {isDeleting ? 'Suppression...' : 'Supprimer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    cursor: 'pointer', // Améliore l'UX sur web
    userSelect: 'none', // Empêche la sélection de texte sur web
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});