import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Alert, Platform, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { bookService } from '@/services/bookService';
import { loanService } from '@/services/loanService';
import { CurrentLoan } from '@/types/book';

interface BookActionsProps {
  bookId: string;
  bookTitle: string;
  currentLoan?: CurrentLoan;
  onBookDeleted?: () => void;
}

export function BookActions({ bookId, bookTitle, currentLoan, onBookDeleted }: BookActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoanActionLoading, setIsLoanActionLoading] = useState(false);
  
  // Détection de la taille de l'écran pour adapter le layout
  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 450; // Seuil ajusté

  const handleEdit = () => {
    console.log('🔧 Bouton Modifier cliqué - Navigation vers l\'écran d\'édition');
    // Navigation vers l'écran d'édition
    router.push(`/(tabs)/books/${bookId}/edit`);
  };

  const handleLoanAction = () => {
    if (currentLoan) {
      // Le livre est prêté, proposer de le retourner
      handleReturnBook();
    } else {
      // Le livre n'est pas prêté, naviguer vers l'écran de prêt
      router.push(`/(tabs)/loans/create?bookId=${bookId}`);
    }
  };

  const handleReturnBook = async () => {
    if (!currentLoan) return;

    console.log('📥 Bouton Retourner cliqué');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Retourner le livre prêté à ${currentLoan.borrower?.name || 'Emprunteur inconnu'} ?`
      );
      if (confirmed) {
        await confirmReturn();
      }
    } else {
      Alert.alert(
        'Retourner le livre',
        `Retourner le livre prêté à ${currentLoan.borrower?.name || 'Emprunteur inconnu'} ?`,
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Retourner',
            onPress: confirmReturn
          }
        ]
      );
    }
  };

  const confirmReturn = async () => {
    if (!currentLoan) return;

    setIsLoanActionLoading(true);
    try {
      await loanService.returnLoan(currentLoan.id);

      // Use setTimeout to defer UI updates, avoiding race conditions with test cleanup
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Le livre a été retourné avec succès.');
          window.location.reload(); // Rafraîchir la page
        } else {
          Alert.alert(
            'Livre retourné',
            'Le livre a été retourné avec succès.',
            [{
              text: 'OK',
              onPress: () => {
                // Rafraîchir l'écran
                router.replace(`/(tabs)/books/${bookId}?refresh=true`);
              }
            }]
          );
        }
      }, 0);
    } catch (error) {
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Une erreur est survenue lors du retour du livre.');
        } else {
          Alert.alert(
            'Erreur',
            'Une erreur est survenue lors du retour du livre.',
            [{ text: 'OK' }]
          );
        }
      }, 0);
    } finally {
      setIsLoanActionLoading(false);
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
    <View style={[styles.container, isSmallScreen && styles.containerSmall]}>
      {/* Bouton Prêter/Retourner */}
      <TouchableOpacity
        style={[
          styles.button,
          currentLoan ? styles.returnButton : styles.loanButton,
          isSmallScreen && styles.buttonSmall
        ]}
        onPress={handleLoanAction}
        disabled={isDeleting || isLoanActionLoading}
        activeOpacity={0.8}
      >
        <MaterialIcons
          name={currentLoan ? "assignment-return" : "assignment"}
          size={16}
          color="#ffffff"
        />
        <Text style={[styles.buttonText, isSmallScreen && styles.buttonTextSmall]}>
          {isLoanActionLoading
            ? (currentLoan ? 'Retour...' : 'Prêt...')
            : (currentLoan ? 'Retourner' : 'Prêter')
          }
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.editButton,
          isSmallScreen && styles.buttonSmall
        ]}
        onPress={handleEdit}
        disabled={isDeleting || isLoanActionLoading}
        activeOpacity={0.8}
      >
        <MaterialIcons name="edit" size={16} color="#ffffff" />
        <Text style={[styles.buttonText, isSmallScreen && styles.buttonTextSmall]}>
          Modifier
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.deleteButton,
          isSmallScreen && styles.buttonSmall
        ]}
        onPress={handleDelete}
        disabled={isDeleting || isLoanActionLoading}
        activeOpacity={0.8}
      >
        <MaterialIcons name="delete" size={16} color="#ffffff" />
        <Text style={[styles.buttonText, isSmallScreen && styles.buttonTextSmall]}>
          {isDeleting ? 'Suppression...' : 'Supprimer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Permettre le retour à la ligne
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-start',
  },
  containerSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Permettre le retour à la ligne sur petit écran
    gap: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    cursor: 'pointer',
    userSelect: 'none',
    minWidth: 85,
    flexShrink: 1, // Permettre la réduction si nécessaire
  },
  buttonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 3,
    minWidth: 70, // Réduire la largeur minimale
    flexShrink: 1,
  },
  editButton: {
    backgroundColor: '#3498db',
    shadowColor: '#2980b9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  loanButton: {
    backgroundColor: '#27ae60',
    shadowColor: '#229954',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  returnButton: {
    backgroundColor: '#f39c12',
    shadowColor: '#e67e22',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextSmall: {
    fontSize: 11,
    fontWeight: '500',
  },
});