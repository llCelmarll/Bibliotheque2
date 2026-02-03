import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BorrowedBook, BorrowStatus } from '@/types/borrowedBook';
import { BorrowStatusBadge } from './BorrowStatusBadge';
import BookCover from '@/components/BookCover';
import { useRouter } from 'expo-router';
import { borrowedBookService } from '@/services/borrowedBookService';
import { calendarService } from '@/services/calendarService';

interface BorrowListItemProps {
  borrow: BorrowedBook;
  onReturn?: () => void;
}

export const BorrowListItem: React.FC<BorrowListItemProps> = ({ borrow, onReturn }) => {
  const router = useRouter();
  const [returning, setReturning] = useState(false);

  const handlePress = () => {
    router.push(`/(tabs)/borrows/${borrow.id}`);
  };

  const handleReturn = (e: any) => {
    e?.stopPropagation?.();

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Confirmer le retour de "${borrow.book?.title || 'ce livre'}" ?`
      );
      if (confirmed) {
        confirmReturn();
      }
    } else {
      Alert.alert(
        'Retour du livre',
        `Confirmer le retour de "${borrow.book?.title || 'ce livre'}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: confirmReturn,
          },
        ]
      );
    }
  };

  const confirmReturn = async () => {
    setReturning(true);
    try {
      // Si un rappel calendrier existe, le supprimer automatiquement
      if (borrow.calendar_event_id) {
        try {
          await calendarService.deleteBookReturnReminder(borrow.calendar_event_id);
        } catch (error) {
          console.warn('Impossible de supprimer le rappel calendrier:', error);
          // Ne pas bloquer le retour du livre si la suppression échoue
        }
      }

      await borrowedBookService.returnBorrowedBook(borrow.id);
      if (Platform.OS === 'web') {
        window.alert('Le livre a été marqué comme retourné avec succès.');
      } else {
        Alert.alert('Succès', 'Le livre a été marqué comme retourné');
      }
      onReturn?.();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible de retourner le livre');
      } else {
        Alert.alert('Erreur', 'Impossible de retourner le livre');
      }
    } finally {
      setReturning(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysOverdue = (): number => {
    if (!borrow.expected_return_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(borrow.expected_return_date);
    dueDate.setHours(0, 0, 0, 0);

    if (today <= dueDate) return 0;

    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysRemaining = (): number => {
    if (!borrow.expected_return_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(borrow.expected_return_date);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) return 0;

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysOverdue = getDaysOverdue();
  const daysRemaining = getDaysRemaining();
  const canReturn = borrow.status === BorrowStatus.ACTIVE || borrow.status === BorrowStatus.OVERDUE;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={`borrow-item-${borrow.id}`}
    >
      <BookCover
        url={borrow.book?.cover_url}
        style={styles.cover}
        containerStyle={styles.coverContainer}
        resizeMode="cover"
      />

      <View style={styles.infoContainer}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {borrow.book?.title || 'Sans titre'}
        </Text>

        <Text style={styles.borrowedFromText}>
          Emprunté à : <Text style={styles.borrowedFromBold}>{borrow.contact?.name || borrow.borrowed_from}</Text>
        </Text>

        <View style={styles.datesContainer}>
          <Text style={styles.dateText}>
            Emprunté le {formatDate(borrow.borrowed_date)}
          </Text>
          {borrow.expected_return_date && (
            <Text style={styles.dateText}>
              Retour prévu : {formatDate(borrow.expected_return_date)}
            </Text>
          )}
        </View>

        <BorrowStatusBadge
          status={borrow.status}
          daysOverdue={daysOverdue}
          daysRemaining={daysRemaining}
        />
      </View>

      {canReturn && (
        <Pressable
          style={styles.returnButton}
          onPress={handleReturn}
          disabled={returning}
          accessibilityLabel="Marquer comme retourné"
        >
          <MaterialIcons
            name="assignment-return"
            size={20}
            color={returning ? '#BDBDBD' : '#4CAF50'}
          />
          <Text style={[styles.returnButtonText, returning && styles.returnButtonTextDisabled]}>
            Retourner
          </Text>
        </Pressable>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  coverContainer: {
    width: 60,
    height: 90,
    marginRight: 12,
  },
  cover: {
    width: 60,
    height: 90,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  borrowedFromText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  borrowedFromBold: {
    fontWeight: '600',
    color: '#424242',
  },
  datesContainer: {
    marginVertical: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 2,
  },
  returnButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    marginLeft: 8,
  },
  returnButtonText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  returnButtonTextDisabled: {
    color: '#BDBDBD',
  },
});
