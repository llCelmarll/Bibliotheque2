import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLoanDetail } from '@/hooks/useLoanDetail';
import { LoanStatusBadge } from '@/components/loans/LoanStatusBadge';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoanStatus } from '@/types/loan';
import { CalendarReminderManager } from '@/components/calendar/CalendarReminderManager';
import { loanService } from '@/services/loanService';
import { calendarService } from '@/services/calendarService';

function LoanDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const loanId = parseInt(params.id as string);

  const {
    loan,
    loading,
    loadLoan,
    returnLoan,
    deleteLoan,
    getDaysOverdue,
    getDaysRemaining,
    isOverdue,
  } = useLoanDetail({ loanId });

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

  const handleReturn = () => {
    Alert.alert(
      'Retour du livre',
      'Confirmer le retour de ce livre ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setActionLoading(true);
            try {
              // Si un rappel calendrier existe, le supprimer automatiquement
              if (loan?.calendar_event_id) {
                try {
                  await calendarService.deleteBookReturnReminder(loan.calendar_event_id);
                } catch (error) {
                  console.warn('Impossible de supprimer le rappel calendrier:', error);
                  // Ne pas bloquer le retour du livre si la suppression échoue
                }
              }

              await returnLoan();
              Alert.alert('Succès', 'Le livre a été retourné');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de retourner le livre');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le prêt',
      'Êtes-vous sûr de vouloir supprimer ce prêt ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteLoan();
              Alert.alert(
                'Succès',
                'Le prêt a été supprimé',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le prêt');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewBook = () => {
    if (loan?.book_id) {
      router.push(`/(tabs)/books/${loan.book_id}`);
    }
  };

  const handleReminderCreated = async (eventId: string) => {
    try {
      await loanService.updateCalendarEventId(loanId, eventId);
      // Recharger le prêt pour obtenir le calendar_event_id mis à jour
      await loadLoan();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du calendar_event_id:', error);
    }
  };

  const handleReminderUpdated = async (eventId: string) => {
    try {
      await loanService.updateCalendarEventId(loanId, eventId);
      // Recharger le prêt
      await loadLoan();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du calendar_event_id:', error);
    }
  };

  const handleReminderDeleted = async () => {
    try {
      await loanService.updateCalendarEventId(loanId, null);
      // Recharger le prêt
      await loadLoan();
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

  if (!loan) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#E0E0E0" />
        <Text style={styles.errorText}>Prêt introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysOverdue = getDaysOverdue();
  const daysRemaining = getDaysRemaining();
  const isLoanOverdue = isOverdue();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
          accessibilityLabel="Retour"
          // @ts-ignore - title works on web for tooltip
          title="Retour"
        >
          <MaterialIcons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du prêt</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.headerDeleteButton}
          accessibilityLabel="Supprimer le prêt"
          accessibilityHint="Supprime définitivement ce prêt"
          // @ts-ignore - title works on web for tooltip
          title="Supprimer le prêt"
        >
          <MaterialIcons name="delete" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Livre */}
        <TouchableOpacity style={styles.bookSection} onPress={handleViewBook}>
          <BookCover
            url={loan.book.cover_url}
            style={styles.bookCover}
            containerStyle={styles.bookCoverContainer}
            resizeMode="cover"
          />
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{loan.book.title}</Text>
            {loan.book.authors && loan.book.authors.length > 0 && (
              <Text style={styles.bookAuthors}>
                {loan.book.authors.map((a) => a.name).join(', ')}
              </Text>
            )}
            <View style={styles.viewBookButton}>
              <Text style={styles.viewBookButtonText}>Voir le livre</Text>
              <MaterialIcons name="chevron-right" size={20} color="#2196F3" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Statut */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut</Text>
          <LoanStatusBadge
            status={loan.status}
            daysOverdue={daysOverdue}
            daysRemaining={daysRemaining}
          />
        </View>

        {/* Emprunteur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emprunteur</Text>
          <View style={styles.borrowerContainer}>
            <MaterialIcons name="person" size={32} color="#2196F3" />
            <View style={styles.borrowerInfo}>
              <Text style={styles.borrowerName}>{loan.borrower.name}</Text>
              {loan.borrower.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={16} color="#757575" />
                  <Text style={styles.contactText}>{loan.borrower.email}</Text>
                </View>
              )}
              {loan.borrower.phone && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="phone" size={16} color="#757575" />
                  <Text style={styles.contactText}>{loan.borrower.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>

          <View style={styles.dateRow}>
            <MaterialIcons name="calendar-today" size={20} color="#757575" />
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Date de prêt</Text>
              <Text style={styles.dateValue}>{formatDate(loan.loan_date)}</Text>
            </View>
          </View>

          {loan.due_date && (
            <View style={styles.dateRow}>
              <MaterialIcons
                name="event"
                size={20}
                color={isLoanOverdue ? '#F44336' : '#757575'}
              />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Retour prévu</Text>
                <Text style={[styles.dateValue, isLoanOverdue && styles.dateOverdue]}>
                  {formatDate(loan.due_date)}
                </Text>
              </View>
            </View>
          )}

          {loan.return_date && (
            <View style={styles.dateRow}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Date de retour</Text>
                <Text style={styles.dateValue}>{formatDate(loan.return_date)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        {loan.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{loan.notes}</Text>
          </View>
        )}

        {/* Rappel calendrier */}
        <CalendarReminderManager
          bookTitle={loan.book.title}
          dueDate={loan.due_date}
          borrowerName={loan.borrower.name}
          existingEventId={loan.calendar_event_id}
          onReminderCreated={handleReminderCreated}
          onReminderUpdated={handleReminderUpdated}
          onReminderDeleted={handleReminderDeleted}
          type="loan"
        />
      </ScrollView>

      {/* Actions */}
      {(loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE) && (
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

export default function LoanDetail() {
  return (
    <ProtectedRoute>
      <LoanDetailScreen />
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
  borrowerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  borrowerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  borrowerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
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
