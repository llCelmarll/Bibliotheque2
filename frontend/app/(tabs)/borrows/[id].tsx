import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useBorrowDetail } from '@/hooks/useBorrowDetail';
import { BorrowStatusBadge } from '@/components/borrows/BorrowStatusBadge';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BorrowStatus } from '@/types/borrowedBook';
import { CalendarReminderManager } from '@/components/calendar/CalendarReminderManager';
import { borrowedBookService } from '@/services/borrowedBookService';
import { calendarService } from '@/services/calendarService';

function BorrowDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const borrowId = parseInt(params.id as string);

  const {
    borrow,
    loading,
    refetch,
    returnBorrow,
    deleteBorrow,
    getDaysOverdue,
    getDaysRemaining,
    isOverdue,
  } = useBorrowDetail({ borrowId });

  const [actionLoading, setActionLoading] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleReturn = async () => {
    setActionLoading(true);
    try {
      // Si un rappel calendrier existe, le supprimer automatiquement
      if (borrow?.calendar_event_id) {
        try {
          await calendarService.deleteBookReturnReminder(borrow.calendar_event_id);
        } catch (error) {
          console.warn('Impossible de supprimer le rappel calendrier:', error);
          // Ne pas bloquer le retour du livre si la suppression échoue
        }
      }

      await returnBorrow();
      setActionLoading(false);

      if (Platform.OS === 'web') {
        window.alert('Le livre a été marqué comme retourné');
        router.back();
      } else {
        Alert.alert(
          'Succès',
          'Le livre a été marqué comme retourné',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      setActionLoading(false);
      const errorMsg = error.message || 'Impossible de retourner le livre';

      if (Platform.OS === 'web') {
        window.alert(`Erreur: ${errorMsg}`);
      } else {
        Alert.alert('Erreur', errorMsg);
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'emprunt',
      'Êtes-vous sûr de vouloir supprimer cet emprunt ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteBorrow();
              Alert.alert(
                'Succès',
                'L\'emprunt a été supprimé',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'emprunt');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewBook = () => {
    if (borrow?.book_id) {
      router.push(`/(tabs)/books/${borrow.book_id}`);
    }
  };

  const handleReminderCreated = async (eventId: string) => {
    try {
      await borrowedBookService.updateCalendarEventId(borrowId, eventId);
      // Recharger l'emprunt pour obtenir le calendar_event_id mis à jour
      await refetch();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du calendar_event_id:', error);
    }
  };

  const handleReminderUpdated = async (eventId: string) => {
    try {
      await borrowedBookService.updateCalendarEventId(borrowId, eventId);
      // Recharger l'emprunt
      await refetch();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du calendar_event_id:', error);
    }
  };

  const handleReminderDeleted = async () => {
    try {
      await borrowedBookService.updateCalendarEventId(borrowId, null);
      // Recharger l'emprunt
      await refetch();
    } catch (error) {
      console.error('Erreur lors de la suppression du calendar_event_id:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!borrow) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#E0E0E0" />
        <Text style={styles.errorText}>Emprunt introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysOverdue = getDaysOverdue();
  const daysRemaining = getDaysRemaining();
  const isBorrowOverdue = isOverdue();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
          accessibilityLabel="Retour"
        >
          <MaterialIcons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de l'emprunt</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.headerDeleteButton}
          accessibilityLabel="Supprimer l'emprunt"
        >
          <MaterialIcons name="delete" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Livre */}
        {borrow.book && (
          <TouchableOpacity style={styles.bookSection} onPress={handleViewBook}>
            <BookCover
              url={borrow.book.cover_url}
              style={styles.bookCover}
              containerStyle={styles.bookCoverContainer}
              resizeMode="cover"
            />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{borrow.book.title}</Text>
              {borrow.book.authors && borrow.book.authors.length > 0 && (
                <Text style={styles.bookAuthors}>
                  {borrow.book.authors.map((a) => a.name).join(', ')}
                </Text>
              )}
              <View style={styles.viewBookButton}>
                <Text style={styles.viewBookButtonText}>Voir le livre</Text>
                <MaterialIcons name="chevron-right" size={20} color="#2196F3" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Statut */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut</Text>
          <BorrowStatusBadge
            status={borrow.status}
            daysOverdue={daysOverdue}
            daysRemaining={daysRemaining}
          />
        </View>

        {/* Emprunté à */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emprunté à</Text>
          <View style={styles.borrowFromContainer}>
            <MaterialIcons name="person" size={32} color="#2196F3" />
            <View style={styles.borrowFromInfo}>
              <Text style={styles.borrowFromName}>{borrow.borrowed_from}</Text>
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>

          <View style={styles.dateRow}>
            <MaterialIcons name="calendar-today" size={20} color="#757575" />
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Date d'emprunt</Text>
              <Text style={styles.dateValue}>{formatDate(borrow.borrowed_date)}</Text>
            </View>
          </View>

          {borrow.expected_return_date && (
            <View style={styles.dateRow}>
              <MaterialIcons
                name="event"
                size={20}
                color={isBorrowOverdue ? '#F44336' : '#757575'}
              />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Retour prévu</Text>
                <Text style={[styles.dateValue, isBorrowOverdue && styles.dateOverdue]}>
                  {formatDate(borrow.expected_return_date)}
                </Text>
              </View>
            </View>
          )}

          {borrow.return_date && (
            <View style={styles.dateRow}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Date de retour</Text>
                <Text style={styles.dateValue}>{formatDate(borrow.return_date)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        {borrow.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{borrow.notes}</Text>
          </View>
        )}

        {/* Rappel calendrier */}
        {borrow.book && (
          <CalendarReminderManager
            bookTitle={borrow.book.title}
            dueDate={borrow.expected_return_date}
            lenderName={borrow.borrowed_from}
            existingEventId={borrow.calendar_event_id}
            onReminderCreated={handleReminderCreated}
            onReminderUpdated={handleReminderUpdated}
            onReminderDeleted={handleReminderDeleted}
            type="borrow"
          />
        )}
      </ScrollView>

      {/* Actions */}
      {(borrow.status === BorrowStatus.ACTIVE || borrow.status === BorrowStatus.OVERDUE) && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.returnButton, actionLoading && styles.buttonDisabled]}
            onPress={handleReturn}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="assignment-return" size={20} color="#FFFFFF" />
                <Text style={styles.returnButtonText}>Marquer comme retourné</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function BorrowDetail() {
  return (
    <ProtectedRoute>
      <BorrowDetailScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  headerDeleteButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bookSection: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  bookCover: {
    width: 80,
    height: 120,
  },
  bookCoverContainer: {
    width: 80,
    height: 120,
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  bookAuthors: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  viewBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewBookButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  section: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  borrowFromContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  borrowFromInfo: {
    marginLeft: 12,
    flex: 1,
  },
  borrowFromName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    color: '#212121',
  },
  dateOverdue: {
    color: '#F44336',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
