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
import { useBorrowDetail } from '@/hooks/useBorrowDetail';
import { BorrowStatusBadge } from '@/components/borrows/BorrowStatusBadge';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { CalendarReminderManager } from '@/components/calendar/CalendarReminderManager';
import { borrowedBookService } from '@/services/borrowedBookService';
import { calendarService } from '@/services/calendarService';
import { calendarPreferencesService } from '@/services/calendarPreferences';
import { BorrowStatus, BorrowedBookUpdate } from '@/types/borrowedBook';
import { useTheme } from '@/contexts/ThemeContext';

function BorrowDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const borrowId = parseInt(params.id as string);

  const { borrow, loading, refetch, updateBorrow, returnBorrow, deleteBorrow, getDaysOverdue, getDaysRemaining, isOverdue } = useBorrowDetail({ borrowId });

  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<BorrowedBookUpdate>({});

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const formatDateToDisplay = (dateString?: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatDateToApi = (dateString?: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const handleReturn = async () => {
    setActionLoading(true);
    try {
      if (borrow?.calendar_event_id) {
        try { await calendarService.deleteBookReturnReminder(borrow.calendar_event_id); } catch {}
      }
      await returnBorrow();
      setActionLoading(false);
      if (Platform.OS === 'web') {
        window.alert('Le livre a été marqué comme retourné'); router.back();
      } else {
        Alert.alert('Succès', 'Le livre a été marqué comme retourné', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (error: any) {
      setActionLoading(false);
      const msg = error.message || 'Impossible de retourner le livre';
      Platform.OS === 'web' ? window.alert(`Erreur: ${msg}`) : Alert.alert('Erreur', msg);
    }
  };

  const handleDelete = () => {
    Alert.alert("Supprimer l'emprunt", "Êtes-vous sûr de vouloir supprimer cet emprunt ? Cette action est irréversible.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            if (borrow?.calendar_event_id) {
              try { await calendarService.deleteBookReturnReminder(borrow.calendar_event_id); } catch {}
            }
            await deleteBorrow();
            Alert.alert('Succès', "L'emprunt a été supprimé", [{ text: 'OK', onPress: () => router.back() }]);
          } catch {
            Alert.alert('Erreur', "Impossible de supprimer l'emprunt");
          } finally { setActionLoading(false); }
        },
      },
    ]);
  };

  const handleEdit = () => {
    if (!borrow) return;
    setEditData({ borrowed_date: formatDateToDisplay(borrow.borrowed_date), expected_return_date: formatDateToDisplay(borrow.expected_return_date), notes: borrow.notes || '' });
    setEditMode(true);
  };

  const handleCancelEdit = () => { setEditMode(false); setEditData({}); };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      const dataToSend: BorrowedBookUpdate = { ...editData, borrowed_date: formatDateToApi(editData.borrowed_date), expected_return_date: formatDateToApi(editData.expected_return_date) };
      const oldReturnDate = borrow?.expected_return_date?.split('T')[0];
      const newReturnDate = dataToSend.expected_return_date;
      const hasReminderAndDateChanged = borrow?.calendar_event_id && oldReturnDate !== newReturnDate && newReturnDate;
      await updateBorrow(dataToSend);
      setEditMode(false); setEditData({});
      if (hasReminderAndDateChanged) {
        Alert.alert('Mettre à jour le rappel ?', 'La date de retour a changé. Voulez-vous mettre à jour le rappel calendrier ?', [
          { text: 'Non', style: 'cancel' },
          { text: 'Oui', onPress: async () => {
            try {
              const prefs = await calendarPreferencesService.getPreferences();
              await calendarService.deleteBookReturnReminder(borrow.calendar_event_id!);
              const newEventId = await calendarService.createBookReturnReminder({ bookTitle: borrow.book?.title || 'Livre', lenderName: borrow.contact?.name || borrow.borrowed_from, dueDate: new Date(newReturnDate!), reminderOffsetDays: prefs.defaultReminderOffsetDays, calendarId: prefs.defaultCalendarId || '' });
              if (newEventId) { await borrowedBookService.updateCalendarEventId(borrowId, newEventId); await refetch(); Alert.alert('Succès', 'Le rappel a été mis à jour'); }
            } catch { Alert.alert('Erreur', 'Impossible de mettre à jour le rappel'); }
          }},
        ]);
      } else {
        Platform.OS === 'web' ? window.alert('Emprunt modifié avec succès') : Alert.alert('Succès', 'Emprunt modifié avec succès');
      }
    } catch (error: any) {
      const msg = error.message || "Impossible de modifier l'emprunt";
      Platform.OS === 'web' ? window.alert(`Erreur: ${msg}`) : Alert.alert('Erreur', msg);
    } finally { setActionLoading(false); }
  };

  const handleReminderCreated = async (eventId: string) => { try { await borrowedBookService.updateCalendarEventId(borrowId, eventId); await refetch(); } catch {} };
  const handleReminderUpdated = async (eventId: string) => { try { await borrowedBookService.updateCalendarEventId(borrowId, eventId); await refetch(); } catch {} };
  const handleReminderDeleted = async () => { try { await borrowedBookService.updateCalendarEventId(borrowId, null); await refetch(); } catch {} };

  if (loading) {
    return <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  if (!borrow) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.bgPrimary }]}>
        <MaterialIcons name="error-outline" size={64} color={theme.borderMedium} />
        <Text style={[styles.errorText, { color: theme.textMuted }]}>Emprunt introuvable</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: theme.textInverse }]}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysOverdue = getDaysOverdue();
  const daysRemaining = getDaysRemaining();
  const isBorrowOverdue = isOverdue();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={editMode ? handleCancelEdit : () => router.back()} style={styles.headerBackButton}>
          <MaterialIcons name={editMode ? 'close' : 'arrow-back'} size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{editMode ? "Modifier l'emprunt" : "Détails de l'emprunt"}</Text>
        <View style={styles.headerActions}>
          {!editMode && borrow.status !== BorrowStatus.RETURNED && (
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
        {borrow.book && (
          <TouchableOpacity style={[styles.bookSection, { backgroundColor: theme.bgCard }]} onPress={() => borrow.book_id && router.push(`/(tabs)/books/${borrow.book_id}`)}>
            <BookCover url={borrow.book.cover_url} style={styles.bookCover} containerStyle={styles.bookCoverContainer} resizeMode="cover" />
            <View style={styles.bookInfo}>
              <Text style={[styles.bookTitle, { color: theme.textPrimary }]}>{borrow.book.title}</Text>
              {borrow.book.authors && borrow.book.authors.length > 0 && (
                <Text style={[styles.bookAuthors, { color: theme.textSecondary }]}>{borrow.book.authors.map(a => a.name).join(', ')}</Text>
              )}
              <View style={styles.viewBookButton}>
                <Text style={[styles.viewBookButtonText, { color: theme.accent }]}>Voir le livre</Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.accent} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Statut</Text>
          <BorrowStatusBadge status={borrow.status} daysOverdue={daysOverdue} daysRemaining={daysRemaining} />
        </View>

        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Emprunté à</Text>
          <View style={styles.borrowFromContainer}>
            <MaterialIcons name="person" size={32} color={theme.accent} />
            <View style={styles.borrowFromInfo}>
              <Text style={[styles.borrowFromName, { color: theme.textPrimary }]}>{borrow.contact?.name || borrow.borrowed_from}</Text>
              {borrow.contact?.email && <Text style={[styles.borrowFromEmail, { color: theme.textSecondary }]}>{borrow.contact.email}</Text>}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Dates</Text>
          {editMode ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Date d'emprunt</Text>
                <TextInput style={[styles.input, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]} value={editData.borrowed_date} onChangeText={text => setEditData({ ...editData, borrowed_date: text })} placeholder="JJ/MM/AAAA" placeholderTextColor={theme.textMuted} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Date de retour prévue</Text>
                <TextInput style={[styles.input, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]} value={editData.expected_return_date} onChangeText={text => setEditData({ ...editData, expected_return_date: text })} placeholder="JJ/MM/AAAA" placeholderTextColor={theme.textMuted} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.dateRow}>
                <MaterialIcons name="calendar-today" size={20} color={theme.textMuted} />
                <View style={styles.dateInfo}>
                  <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Date d'emprunt</Text>
                  <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(borrow.borrowed_date)}</Text>
                </View>
              </View>
              {borrow.expected_return_date && (
                <View style={styles.dateRow}>
                  <MaterialIcons name="event" size={20} color={isBorrowOverdue ? theme.danger : theme.textMuted} />
                  <View style={styles.dateInfo}>
                    <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Retour prévu</Text>
                    <Text style={[styles.dateValue, { color: isBorrowOverdue ? theme.danger : theme.textPrimary }, isBorrowOverdue && { fontWeight: '600' }]}>{formatDate(borrow.expected_return_date)}</Text>
                  </View>
                </View>
              )}
              {borrow.return_date && (
                <View style={styles.dateRow}>
                  <MaterialIcons name="check-circle" size={20} color={theme.success} />
                  <View style={styles.dateInfo}>
                    <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Date de retour</Text>
                    <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(borrow.return_date)}</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {(borrow.notes || editMode) && (
          <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Notes</Text>
            {editMode ? (
              <TextInput style={[styles.input, styles.textArea, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]} value={editData.notes} onChangeText={text => setEditData({ ...editData, notes: text })} placeholder="Notes sur l'emprunt..." placeholderTextColor={theme.textMuted} multiline numberOfLines={4} />
            ) : (
              <Text style={[styles.notesText, { color: theme.textSecondary }]}>{borrow.notes}</Text>
            )}
          </View>
        )}

        {borrow.book && (
          <CalendarReminderManager bookTitle={borrow.book.title} dueDate={borrow.expected_return_date} lenderName={borrow.contact?.name || borrow.borrowed_from} existingEventId={borrow.calendar_event_id} onReminderCreated={handleReminderCreated} onReminderUpdated={handleReminderUpdated} onReminderDeleted={handleReminderDeleted} type="borrow" />
        )}
      </ScrollView>

      {editMode ? (
        <View style={[styles.footer, { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight }]}>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }, actionLoading && styles.buttonDisabled]} onPress={handleSaveEdit} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color={theme.textInverse} /> : (
              <><MaterialIcons name="check" size={20} color={theme.textInverse} /><Text style={[styles.saveButtonText, { color: theme.textInverse }]}>Enregistrer</Text></>
            )}
          </TouchableOpacity>
        </View>
      ) : (borrow.status === BorrowStatus.ACTIVE || borrow.status === BorrowStatus.OVERDUE) && (
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

export default function BorrowDetail() {
  return <ProtectedRoute><BorrowDetailScreen /></ProtectedRoute>;
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
  borrowFromContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  borrowFromInfo: { marginLeft: 12, flex: 1 },
  borrowFromName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  borrowFromEmail: { fontSize: 13 },
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
