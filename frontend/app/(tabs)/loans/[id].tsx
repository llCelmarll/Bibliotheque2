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
import { useTheme } from '@/contexts/ThemeContext';

function LoanDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
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
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const formatDateToDisplay = (dateString?: string): string => {
    if (!dateString) return '';
    const isoDate = dateString.split('T')[0];
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatDateToApi = (dateString?: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const handleReturn = () => {
    Alert.alert('Retour du livre', 'Confirmer le retour de ce livre ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          setActionLoading(true);
          try {
            if (loan?.calendar_event_id) {
              try { await calendarService.deleteBookReturnReminder(loan.calendar_event_id); } catch {}
            }
            await returnLoan();
            Alert.alert('Succès', 'Le livre a été retourné');
          } catch {
            Alert.alert('Erreur', 'Impossible de retourner le livre');
          } finally { setActionLoading(false); }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Supprimer le prêt', 'Êtes-vous sûr de vouloir supprimer ce prêt ? Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            if (loan?.calendar_event_id) {
              try { await calendarService.deleteBookReturnReminder(loan.calendar_event_id); } catch {}
            }
            await deleteLoan();
            Alert.alert('Succès', 'Le prêt a été supprimé', [{ text: 'OK', onPress: () => router.back() }]);
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer le prêt');
          } finally { setActionLoading(false); }
        },
      },
    ]);
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

  const handleCancelEdit = () => { setEditMode(false); setEditData({}); };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      const dataToSend: LoanUpdate = {
        loan_date: formatDateToApi(editData.loan_date) || undefined,
        due_date: formatDateToApi(editData.due_date) || undefined,
        notes: editData.notes || undefined,
      };
      const oldDueDate = loan?.due_date?.split('T')[0];
      const newDueDate = dataToSend.due_date;
      const hasReminderAndDateChanged = loan?.calendar_event_id && oldDueDate !== newDueDate && newDueDate;
      await updateLoan(dataToSend);
      setEditMode(false); setEditData({});
      if (hasReminderAndDateChanged) {
        Alert.alert('Mettre à jour le rappel ?', 'La date de retour a changé. Voulez-vous mettre à jour le rappel calendrier ?', [
          { text: 'Non', style: 'cancel' },
          { text: 'Oui', onPress: async () => {
            try {
              const prefs = await calendarPreferencesService.getPreferences();
              await calendarService.deleteBookReturnReminder(loan.calendar_event_id!);
              const newEventId = await calendarService.createBookReturnReminder({
                bookTitle: loan.book?.title || 'Livre',
                borrowerName: loan.contact.name,
                dueDate: new Date(newDueDate!),
                reminderOffsetDays: prefs.defaultReminderOffsetDays,
                calendarId: prefs.defaultCalendarId || '',
              });
              if (newEventId) { await loanService.updateCalendarEventId(loanId, newEventId); await loadLoan(); Alert.alert('Succès', 'Le rappel a été mis à jour'); }
            } catch { Alert.alert('Erreur', 'Impossible de mettre à jour le rappel'); }
          }},
        ]);
      } else {
        Platform.OS === 'web' ? window.alert('Prêt modifié avec succès') : Alert.alert('Succès', 'Prêt modifié avec succès');
      }
    } catch (error: any) {
      const msg = error.message || 'Impossible de modifier le prêt';
      Platform.OS === 'web' ? window.alert(`Erreur: ${msg}`) : Alert.alert('Erreur', msg);
    } finally { setActionLoading(false); }
  };

  const handleReminderCreated = async (eventId: string) => {
    try { await loanService.updateCalendarEventId(loanId, eventId); await loadLoan(); } catch {}
  };
  const handleReminderUpdated = async (eventId: string) => {
    try { await loanService.updateCalendarEventId(loanId, eventId); await loadLoan(); } catch {}
  };
  const handleReminderDeleted = async () => {
    try { await loanService.updateCalendarEventId(loanId, null); await loadLoan(); } catch {}
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.bgPrimary }]}>
        <MaterialIcons name="error-outline" size={64} color={theme.borderMedium} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>Prêt introuvable</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: theme.textInverse }]}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysOverdue = getDaysOverdue();
  const daysRemaining = getDaysRemaining();
  const isLoanOverdue = isOverdue();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={editMode ? handleCancelEdit : () => router.back()} style={styles.headerBackButton}>
          <MaterialIcons name={editMode ? 'close' : 'arrow-back'} size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{editMode ? 'Modifier le prêt' : 'Détails du prêt'}</Text>
        <View style={styles.headerActions}>
          {!editMode && loan.status !== LoanStatus.RETURNED && (
            <TouchableOpacity onPress={handleEdit} style={styles.headerEditButton}>
              <MaterialIcons name="edit" size={24} color={theme.accent} />
            </TouchableOpacity>
          )}
          {!editMode && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerDeleteButton}>
              <MaterialIcons name="delete" size={24} color={theme.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Livre */}
        <TouchableOpacity style={[styles.bookSection, { backgroundColor: theme.bgCard }]} onPress={() => loan.book_id && router.push(`/(tabs)/books/${loan.book_id}`)}>
          <BookCover url={loan.book.cover_url} style={styles.bookCover} containerStyle={styles.bookCoverContainer} resizeMode="cover" />
          <View style={styles.bookInfo}>
            <Text style={[styles.bookTitle, { color: theme.textPrimary }]}>{loan.book.title}</Text>
            {loan.book.authors && loan.book.authors.length > 0 && (
              <Text style={[styles.bookAuthors, { color: theme.textSecondary }]}>{loan.book.authors.map(a => a.name).join(', ')}</Text>
            )}
            <View style={styles.viewBookButton}>
              <Text style={[styles.viewBookButtonText, { color: theme.accent }]}>Voir le livre</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.accent} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Statut */}
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Statut</Text>
          <LoanStatusBadge status={loan.status} daysOverdue={daysOverdue} daysRemaining={daysRemaining} />
        </View>

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Contact</Text>
          <View style={styles.borrowerContainer}>
            <MaterialIcons name="person" size={32} color={theme.accent} />
            <View style={styles.borrowerInfo}>
              <Text style={[styles.borrowerName, { color: theme.textPrimary }]}>{loan.contact.name}</Text>
              {loan.contact.email && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="email" size={16} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]}>{loan.contact.email}</Text>
                </View>
              )}
              {loan.contact.phone && (
                <View style={styles.contactRow}>
                  <MaterialIcons name="phone" size={16} color={theme.textMuted} />
                  <Text style={[styles.contactText, { color: theme.textSecondary }]}>{loan.contact.phone}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Dates</Text>
          {editMode ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Date de prêt</Text>
                <TextInput style={[styles.input, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]} value={editData.loan_date} onChangeText={text => setEditData({ ...editData, loan_date: text })} placeholder="JJ/MM/AAAA" placeholderTextColor={theme.textMuted} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Date de retour prévue</Text>
                <TextInput style={[styles.input, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]} value={editData.due_date} onChangeText={text => setEditData({ ...editData, due_date: text })} placeholder="JJ/MM/AAAA" placeholderTextColor={theme.textMuted} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.dateRow}>
                <MaterialIcons name="calendar-today" size={20} color={theme.textMuted} />
                <View style={styles.dateInfo}>
                  <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Date de prêt</Text>
                  <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(loan.loan_date)}</Text>
                </View>
              </View>
              {loan.due_date && (
                <View style={styles.dateRow}>
                  <MaterialIcons name="event" size={20} color={isLoanOverdue ? theme.danger : theme.textMuted} />
                  <View style={styles.dateInfo}>
                    <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Retour prévu</Text>
                    <Text style={[styles.dateValue, { color: isLoanOverdue ? theme.danger : theme.textPrimary }, isLoanOverdue && { fontWeight: '600' }]}>{formatDate(loan.due_date)}</Text>
                  </View>
                </View>
              )}
              {loan.return_date && (
                <View style={styles.dateRow}>
                  <MaterialIcons name="check-circle" size={20} color={theme.success} />
                  <View style={styles.dateInfo}>
                    <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Date de retour</Text>
                    <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(loan.return_date)}</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Notes */}
        {(loan.notes || editMode) && (
          <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Notes</Text>
            {editMode ? (
              <TextInput style={[styles.input, styles.textArea, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]} value={editData.notes} onChangeText={text => setEditData({ ...editData, notes: text })} placeholder="Notes sur le prêt..." placeholderTextColor={theme.textMuted} multiline numberOfLines={4} />
            ) : (
              <Text style={[styles.notesText, { color: theme.textSecondary }]}>{loan.notes}</Text>
            )}
          </View>
        )}

        <CalendarReminderManager bookTitle={loan.book.title} dueDate={loan.due_date} borrowerName={loan.contact.name} existingEventId={loan.calendar_event_id} onReminderCreated={handleReminderCreated} onReminderUpdated={handleReminderUpdated} onReminderDeleted={handleReminderDeleted} type="loan" />
      </ScrollView>

      {/* Footer */}
      {editMode ? (
        <View style={[styles.footer, { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight }]}>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }, actionLoading && styles.buttonDisabled]} onPress={handleSaveEdit} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color={theme.textInverse} /> : (
              <><MaterialIcons name="check" size={20} color={theme.textInverse} /><Text style={[styles.saveButtonText, { color: theme.textInverse }]}>Enregistrer</Text></>
            )}
          </TouchableOpacity>
        </View>
      ) : (loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE) && (
        <View style={[styles.footer, { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight }]}>
          <TouchableOpacity style={[styles.returnButton, { backgroundColor: theme.success }, actionLoading && styles.buttonDisabled]} onPress={handleReturn} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color={theme.textInverse} /> : (
              <><MaterialIcons name="assignment-return" size={20} color={theme.textInverse} /><Text style={[styles.returnButtonText, { color: theme.textInverse }]}>Marquer comme retourné</Text></>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function LoanDetail() {
  return <ProtectedRoute><LoanDetailScreen /></ProtectedRoute>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerBackButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerEditButton: { padding: 4, marginRight: 8 },
  headerDeleteButton: { padding: 4 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, marginTop: 16, marginBottom: 24 },
  backButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backButtonText: { fontSize: 14, fontWeight: '600' },
  bookSection: { flexDirection: 'row', padding: 16, marginBottom: 8 },
  bookCover: { width: 80, height: 120 },
  bookCoverContainer: { width: 80, height: 120, marginRight: 16 },
  bookInfo: { flex: 1, justifyContent: 'space-between' },
  bookTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  bookAuthors: { fontSize: 14, marginBottom: 8 },
  viewBookButton: { flexDirection: 'row', alignItems: 'center' },
  viewBookButtonText: { fontSize: 14, fontWeight: '600' },
  section: { padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  borrowerContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  borrowerInfo: { marginLeft: 12, flex: 1 },
  borrowerName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  contactText: { fontSize: 14, marginLeft: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  dateInfo: { marginLeft: 12, flex: 1 },
  dateLabel: { fontSize: 12, marginBottom: 2 },
  dateValue: { fontSize: 14 },
  notesText: { fontSize: 14, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1 },
  returnButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8 },
  buttonDisabled: { opacity: 0.6 },
  returnButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8 },
  saveButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, marginBottom: 4 },
});
