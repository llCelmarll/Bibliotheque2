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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLoanDetail } from '@/hooks/useLoanDetail';
import { LoanStatusBadge } from '@/components/loans/LoanStatusBadge';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoanStatus, LoanUpdate } from '@/types/loan';
import { CalendarReminderManager } from '@/components/calendar/CalendarReminderManager';
import { loanService } from '@/services/loanService';
import { calendarService } from '@/services/calendarService';
import { calendarPreferencesService } from '@/services/calendarPreferences';

function LoanDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const loanId = parseInt(params.id as string);

  const {
    loan,
    loading,
    loadLoan,
    updateLoan,
    returnLoan,
    deleteLoan,
    getDaysOverdue,
    getDaysRemaining,
    isOverdue,
  } = useLoanDetail({ loanId });

  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<LoanUpdate>({});

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
              // Supprimer le rappel calendrier s'il existe
              if (loan?.calendar_event_id) {
                try {
                  await calendarService.deleteBookReturnReminder(loan.calendar_event_id);
                } catch (error) {
                  console.warn('Impossible de supprimer le rappel calendrier:', error);
                }
              }

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

  // Convertir YYYY-MM-DD vers JJ/MM/AAAA pour l'affichage dans le formulaire
  const formatDateToDisplay = (dateString?: string): string => {
    if (!dateString) return '';
    const isoDate = dateString.split('T')[0]; // YYYY-MM-DD
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // JJ/MM/AAAA
  };

  // Convertir JJ/MM/AAAA vers YYYY-MM-DD pour l'API
  const formatDateToApi = (dateString?: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString; // Retourner tel quel si format invalide
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
  };

  const handleEdit = () => {
    if (!loan) return;
    setEditData({
      loan_date: formatDateToDisplay(loan.loan_date),
      due_date: formatDateToDisplay(loan.due_date),
      notes: loan.notes || '',
    });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      const dataToSend: LoanUpdate = {
        loan_date: formatDateToApi(editData.loan_date) || undefined,
        due_date: formatDateToApi(editData.due_date) || undefined,
        notes: editData.notes || undefined,
      };

      // Vérifier si la date de retour a changé ET qu'un rappel existe
      const oldDueDate = loan?.due_date?.split('T')[0];
      const newDueDate = dataToSend.due_date;
      const hasReminderAndDateChanged =
        loan?.calendar_event_id &&
        oldDueDate !== newDueDate &&
        newDueDate;

      await updateLoan(dataToSend);
      setEditMode(false);
      setEditData({});

      // Proposer de mettre à jour le rappel si la date a changé
      if (hasReminderAndDateChanged) {
        Alert.alert(
          'Mettre à jour le rappel ?',
          'La date de retour a changé. Voulez-vous mettre à jour le rappel calendrier ?',
          [
            { text: 'Non', style: 'cancel' },
            {
              text: 'Oui',
              onPress: async () => {
                try {
                  const prefs = await calendarPreferencesService.getPreferences();

                  // Supprimer l'ancien rappel
                  await calendarService.deleteBookReturnReminder(loan.calendar_event_id!);

                  // Créer un nouveau rappel avec la nouvelle date
                  const newEventId = await calendarService.createBookReturnReminder({
                    bookTitle: loan.book?.title || 'Livre',
                    borrowerName: loan.contact.name,
                    dueDate: new Date(newDueDate!),
                    reminderOffsetDays: prefs.defaultReminderOffsetDays,
                    calendarId: prefs.defaultCalendarId || '',
                  });

                  if (newEventId) {
                    await loanService.updateCalendarEventId(loanId, newEventId);
                    await loadLoan();
                    Alert.alert('Succès', 'Le rappel a été mis à jour');
                  }
                } catch (error) {
                  console.error('Erreur mise à jour rappel:', error);
                  Alert.alert('Erreur', 'Impossible de mettre à jour le rappel');
                }
              },
            },
          ]
        );
      } else {
        if (Platform.OS === 'web') {
          window.alert('Prêt modifié avec succès');
        } else {
          Alert.alert('Succès', 'Prêt modifié avec succès');
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Impossible de modifier le prêt';
      if (Platform.OS === 'web') {
        window.alert(`Erreur: ${errorMsg}`);
      } else {
        Alert.alert('Erreur', errorMsg);
      }
    } finally {
      setActionLoading(false);
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
          onPress={editMode ? handleCancelEdit : () => router.back()}
          style={styles.headerBackButton}
          accessibilityLabel={editMode ? "Annuler" : "Retour"}
        >
          <MaterialIcons name={editMode ? "close" : "arrow-back"} size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editMode ? "Modifier le prêt" : "Détails du prêt"}</Text>
        <View style={styles.headerActions}>
          {!editMode && loan.status !== LoanStatus.RETURNED && (
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.headerEditButton}
              accessibilityLabel="Modifier le prêt"
            >
              <MaterialIcons name="edit" size={24} color="#2196F3" />
            </TouchableOpacity>
          )}
          {!editMode && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.headerDeleteButton}
              accessibilityLabel="Supprimer le prêt"
            >
              <MaterialIcons name="delete" size={24} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
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

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.borrowerContainer}>
            <MaterialIcons name="person" size={32} color="#2196F3" />
            <View style={styles.borrowerInfo}>
              <Text style={styles.borrowerName}>{loan.contact.name}</Text>
              {loan.contact.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={16} color="#757575" />
                  <Text style={styles.contactText}>{loan.contact.email}</Text>
                </View>
              )}
              {loan.contact.phone && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="phone" size={16} color="#757575" />
                  <Text style={styles.contactText}>{loan.contact.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>

          {editMode ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date de prêt</Text>
                <TextInput
                  style={styles.input}
                  value={editData.loan_date}
                  onChangeText={(text) => setEditData({ ...editData, loan_date: text })}
                  placeholder="JJ/MM/AAAA"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date de retour prévue</Text>
                <TextInput
                  style={styles.input}
                  value={editData.due_date}
                  onChangeText={(text) => setEditData({ ...editData, due_date: text })}
                  placeholder="JJ/MM/AAAA"
                />
              </View>
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        {/* Notes */}
        {(loan.notes || editMode) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {editMode ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editData.notes}
                onChangeText={(text) => setEditData({ ...editData, notes: text })}
                placeholder="Notes sur le prêt..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.notesText}>{loan.notes}</Text>
            )}
          </View>
        )}

        {/* Rappel calendrier */}
        <CalendarReminderManager
          bookTitle={loan.book.title}
          dueDate={loan.due_date}
          borrowerName={loan.contact.name}
          existingEventId={loan.calendar_event_id}
          onReminderCreated={handleReminderCreated}
          onReminderUpdated={handleReminderUpdated}
          onReminderDeleted={handleReminderDeleted}
          type="loan"
        />
      </ScrollView>

      {/* Actions */}
      {editMode ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, actionLoading && styles.buttonDisabled]}
            onPress={handleSaveEdit}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE) && (
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEditButton: {
    padding: 4,
    marginRight: 8,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
  },
});
