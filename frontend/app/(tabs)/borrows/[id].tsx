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
import { BorrowStatus, BorrowedBookUpdate } from '@/types/borrowedBook';

function BorrowDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const borrowId = parseInt(params.id as string);

  const {
    borrow,
    loading,
    updateBorrow,
    returnBorrow,
    deleteBorrow,
    getDaysOverdue,
    getDaysRemaining,
    isOverdue,
  } = useBorrowDetail({ borrowId });

  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<BorrowedBookUpdate>({});

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

  const handleEdit = () => {
    if (!borrow) return;
    setEditData({
      borrowed_from: borrow.borrowed_from,
      borrowed_date: formatDateToDisplay(borrow.borrowed_date),
      expected_return_date: formatDateToDisplay(borrow.expected_return_date),
      notes: borrow.notes || '',
    });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (!editData.borrowed_from?.trim()) {
      Alert.alert('Erreur', 'Le champ "Emprunté à" est requis');
      return;
    }

    setActionLoading(true);
    try {
      // Convertir les dates au format API (YYYY-MM-DD)
      const dataToSend: BorrowedBookUpdate = {
        ...editData,
        borrowed_date: formatDateToApi(editData.borrowed_date),
        expected_return_date: formatDateToApi(editData.expected_return_date),
      };
      await updateBorrow(dataToSend);
      setEditMode(false);
      setEditData({});

      if (Platform.OS === 'web') {
        window.alert('Emprunt modifié avec succès');
      } else {
        Alert.alert('Succès', 'Emprunt modifié avec succès');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Impossible de modifier l\'emprunt';
      if (Platform.OS === 'web') {
        window.alert(`Erreur: ${errorMsg}`);
      } else {
        Alert.alert('Erreur', errorMsg);
      }
    } finally {
      setActionLoading(false);
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
          onPress={editMode ? handleCancelEdit : () => router.back()}
          style={styles.headerBackButton}
          accessibilityLabel={editMode ? "Annuler" : "Retour"}
        >
          <MaterialIcons name={editMode ? "close" : "arrow-back"} size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editMode ? "Modifier l'emprunt" : "Détails de l'emprunt"}</Text>
        <View style={styles.headerActions}>
          {!editMode && borrow.status !== BorrowStatus.RETURNED && (
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.headerEditButton}
              accessibilityLabel="Modifier l'emprunt"
            >
              <MaterialIcons name="edit" size={24} color="#2196F3" />
            </TouchableOpacity>
          )}
          {!editMode && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.headerDeleteButton}
              accessibilityLabel="Supprimer l'emprunt"
            >
              <MaterialIcons name="delete" size={24} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
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
          <Text style={styles.sectionTitle}>Emprunté à {editMode && '*'}</Text>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={editData.borrowed_from}
              onChangeText={(text) => setEditData({ ...editData, borrowed_from: text })}
              placeholder="Nom de la personne ou bibliothèque"
            />
          ) : (
            <View style={styles.borrowFromContainer}>
              <MaterialIcons name="person" size={32} color="#2196F3" />
              <View style={styles.borrowFromInfo}>
                <Text style={styles.borrowFromName}>{borrow.borrowed_from}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>

          {editMode ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date d'emprunt</Text>
                <TextInput
                  style={styles.input}
                  value={editData.borrowed_date}
                  onChangeText={(text) => setEditData({ ...editData, borrowed_date: text })}
                  placeholder="JJ/MM/AAAA"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date de retour prévue</Text>
                <TextInput
                  style={styles.input}
                  value={editData.expected_return_date}
                  onChangeText={(text) => setEditData({ ...editData, expected_return_date: text })}
                  placeholder="JJ/MM/AAAA"
                />
              </View>
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        {/* Notes */}
        {(borrow.notes || editMode) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {editMode ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editData.notes}
                onChangeText={(text) => setEditData({ ...editData, notes: text })}
                placeholder="Notes sur l'emprunt..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.notesText}>{borrow.notes}</Text>
            )}
          </View>
        )}
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
      ) : (borrow.status === BorrowStatus.ACTIVE || borrow.status === BorrowStatus.OVERDUE) && (
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
