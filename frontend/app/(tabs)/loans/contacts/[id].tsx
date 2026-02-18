import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { contactService } from '@/services/contactService';
import { loanService } from '@/services/loanService';
import { borrowedBookService } from '@/services/borrowedBookService';
import { Contact, ContactUpdate } from '@/types/contact';
import { Loan, LoanStatus } from '@/types/loan';
import { BorrowedBook, BorrowStatus } from '@/types/borrowedBook';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function ContactDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contactId = parseInt(params.id as string);

  const [contact, setContact] = useState<Contact | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrows, setBorrows] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ContactUpdate>({});

  useEffect(() => {
    loadContactDetail();
  }, [contactId]);

  const loadContactDetail = async () => {
    setLoading(true);
    try {
      const [contactData, loansData, borrowsData] = await Promise.all([
        contactService.getContactById(contactId),
        loanService.getLoansByContact(contactId),
        borrowedBookService.fetchBorrowsByContact(contactId),
      ]);
      setContact(contactData);
      setLoans(loansData);
      setBorrows(borrowsData);
    } catch (error) {
      console.error('Erreur lors du chargement du contact:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le contact',
      'Êtes-vous sûr de vouloir supprimer ce contact ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await contactService.deleteContact(contactId);
              Alert.alert(
                'Succès',
                'Le contact a été supprimé',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              Alert.alert(
                'Erreur',
                error.response?.data?.detail || 'Impossible de supprimer le contact'
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const startEditing = () => {
    if (contact) {
      setEditForm({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
      });
      setEditing(true);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editForm.name?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await contactService.updateContact(contactId, editForm);
      setContact(updated);
      setEditing(false);
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de modifier le contact'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLoan = () => {
    router.push({
      pathname: '/(tabs)/loans/create',
      params: { contactId: contactId.toString() }
    });
  };

  const handleToggleLibraryShared = async (value: boolean) => {
    if (!contact?.linked_user_id) return;
    setActionLoading(true);
    try {
      const updated = await contactService.updateContact(contactId, { library_shared: value });
      setContact(updated);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de modifier le partage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLibrary = () => {
    if (contact?.linked_user_id) {
      const username = encodeURIComponent(contact.linked_user_username || '');
      router.push(`/(tabs)/loans/library/${contact.linked_user_id}?username=${username}` as any);
    }
  };

  const handleLoanPress = (loan: Loan) => {
    router.push(`/(tabs)/loans/${loan.id}`);
  };

  const handleReturnLoan = (loanId: number, bookTitle: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Confirmer le retour de "${bookTitle}" ?`
      );
      if (confirmed) {
        confirmReturnLoan(loanId);
      }
    } else {
      Alert.alert(
        'Retour du livre',
        `Confirmer le retour de "${bookTitle}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: () => confirmReturnLoan(loanId),
          },
        ]
      );
    }
  };

  const confirmReturnLoan = async (loanId: number) => {
    setActionLoading(true);
    try {
      await loanService.returnLoan(loanId);
      if (Platform.OS === 'web') {
        window.alert('Le livre a été retourné avec succès.');
      } else {
        Alert.alert('Succès', 'Le livre a été retourné');
      }
      loadContactDetail();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible de retourner le livre');
      } else {
        Alert.alert('Erreur', 'Impossible de retourner le livre');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Tri des prêts : OVERDUE -> ACTIVE -> RETURNED, puis par date de prêt
  const sortedLoans = useMemo(() => {
    const statusPriority: Record<LoanStatus, number> = {
      [LoanStatus.OVERDUE]: 0,
      [LoanStatus.ACTIVE]: 1,
      [LoanStatus.RETURNED]: 2,
    };

    return [...loans].sort((a, b) => {
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime();
    });
  }, [loans]);

  // Tri des emprunts : OVERDUE -> ACTIVE -> RETURNED, puis par date
  const sortedBorrows = useMemo(() => {
    const statusPriority: Record<string, number> = {
      [BorrowStatus.OVERDUE]: 0,
      [BorrowStatus.ACTIVE]: 1,
      [BorrowStatus.RETURNED]: 2,
    };
    return [...borrows].sort((a, b) => {
      const priorityDiff = (statusPriority[a.status] ?? 3) - (statusPriority[b.status] ?? 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.borrowed_date).getTime() - new Date(a.borrowed_date).getTime();
    });
  }, [borrows]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#E0E0E0" />
          <Text style={styles.errorText}>Contact introuvable</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeLoans = loans.filter(l => l.status === 'active');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const returnedLoans = loans.filter(l => l.status === 'returned');

  const activeBorrows = borrows.filter(b => b.status === 'active');
  const overdueBorrows = borrows.filter(b => b.status === 'overdue');
  const returnedBorrows = borrows.filter(b => b.status === 'returned');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
          accessibilityLabel="Retour"
        >
          <MaterialIcons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails contact</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={startEditing}
            style={styles.headerActionButton}
            accessibilityLabel="Modifier le contact"
          >
            <MaterialIcons name="edit" size={24} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerActionButton}
            accessibilityLabel="Supprimer le contact"
          >
            <MaterialIcons name="delete" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Informations du contact (mode lecture ou édition) */}
        {editing ? (
          <View style={styles.infoCard}>
            <Text style={styles.editSectionTitle}>Modifier le contact</Text>
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Nom *</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="Nom du contact"
              />
            </View>
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Email</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Téléphone</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Téléphone"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Notes</Text>
              <TextInput
                style={[styles.editInput, styles.editTextarea]}
                value={editForm.notes}
                onChangeText={(text) => setEditForm({ ...editForm, notes: text })}
                placeholder="Notes"
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, actionLoading && styles.buttonDisabled]}
                onPress={handleSaveEdit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person" size={32} color="#2196F3" />
            </View>
            <Text style={styles.contactName}>{contact.name}</Text>

            {contact.email && (
              <View style={styles.contactRow}>
                <MaterialIcons name="email" size={16} color="#757575" />
                <Text style={styles.contactText}>{contact.email}</Text>
              </View>
            )}

            {contact.phone && (
              <View style={styles.contactRow}>
                <MaterialIcons name="phone" size={16} color="#757575" />
                <Text style={styles.contactText}>{contact.phone}</Text>
              </View>
            )}

            {contact.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{contact.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Section Utilisateur lié */}
        {contact.linked_user_id ? (
          <View style={styles.linkedUserCard}>
            <View style={styles.linkedUserHeader}>
              <MaterialIcons name="account-circle" size={20} color="#7C3AED" />
              <Text style={styles.linkedUserTitle}>Utilisateur lié</Text>
            </View>
            <Text style={styles.linkedUserName}>{contact.linked_user_username}</Text>
            <View style={styles.librarySharedRow}>
              <View style={styles.librarySharedLabel}>
                <MaterialIcons name="menu-book" size={16} color="#757575" />
                <Text style={styles.librarySharedText}>Partager ma bibliothèque</Text>
              </View>
              <Switch
                value={contact.library_shared}
                onValueChange={handleToggleLibraryShared}
                disabled={actionLoading}
                trackColor={{ false: '#E0E0E0', true: '#C4B5FD' }}
                thumbColor={contact.library_shared ? '#7C3AED' : '#9E9E9E'}
              />
            </View>
            <TouchableOpacity style={styles.viewLibraryButton} onPress={handleViewLibrary}>
              <MaterialIcons name="library-books" size={16} color="#7C3AED" />
              <Text style={styles.viewLibraryButtonText}>Voir sa bibliothèque</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Statistiques Prêts */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Prêts</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loans.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{activeLoans.length}</Text>
              <Text style={styles.statLabel}>En cours</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F44336' }]}>{overdueLoans.length}</Text>
              <Text style={styles.statLabel}>En retard</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#757575' }]}>{returnedLoans.length}</Text>
              <Text style={styles.statLabel}>Retournés</Text>
            </View>
          </View>
        </View>

        {/* Statistiques Emprunts */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Emprunts</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{borrows.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{activeBorrows.length}</Text>
              <Text style={styles.statLabel}>En cours</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F44336' }]}>{overdueBorrows.length}</Text>
              <Text style={styles.statLabel}>En retard</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#757575' }]}>{returnedBorrows.length}</Text>
              <Text style={styles.statLabel}>Retournés</Text>
            </View>
          </View>
        </View>

        {/* Historique des prêts */}
        <View style={styles.loansCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Historique des prêts</Text>
            <TouchableOpacity onPress={handleCreateLoan}>
              <MaterialIcons name="add-circle" size={24} color="#2196F3" />
            </TouchableOpacity>
          </View>

          {loans.length === 0 ? (
            <View style={styles.emptyLoans}>
              <MaterialIcons name="library-books" size={48} color="#E0E0E0" />
              <Text style={styles.emptyLoansText}>Aucun prêt</Text>
              <TouchableOpacity style={styles.createLoanButton} onPress={handleCreateLoan}>
                <Text style={styles.createLoanButtonText}>Créer un prêt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedLoans.map((loan) => {
              const canReturn = loan.status === 'active' || loan.status === 'overdue';

              return (
                <View key={loan.id} style={styles.loanItemContainer}>
                  <TouchableOpacity
                    style={styles.loanItem}
                    onPress={() => handleLoanPress(loan)}
                  >
                    <View style={styles.loanInfo}>
                      <Text style={styles.loanTitle} numberOfLines={1}>{loan.book.title}</Text>
                      <Text style={styles.loanDate}>
                        Prêté le {formatDate(loan.loan_date)}
                      </Text>
                      {loan.due_date && (
                        <Text style={styles.loanDate}>
                          Retour prévu : {formatDate(loan.due_date)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.loanStatus}>
                      {loan.status === 'overdue' && (
                        <View style={[styles.statusBadge, styles.statusOverdue]}>
                          <Text style={styles.statusText}>En retard</Text>
                        </View>
                      )}
                      {loan.status === 'active' && (
                        <View style={[styles.statusBadge, styles.statusActive]}>
                          <Text style={styles.statusText}>En cours</Text>
                        </View>
                      )}
                      {loan.status === 'returned' && (
                        <View style={[styles.statusBadge, styles.statusReturned]}>
                          <Text style={styles.statusText}>Retourné</Text>
                        </View>
                      )}
                      {canReturn ? (
                        <TouchableOpacity
                          onPress={() => handleReturnLoan(loan.id, loan.book.title)}
                          style={styles.returnIconButton}
                          disabled={actionLoading}
                        >
                          <MaterialIcons
                            name="assignment-return"
                            size={20}
                            color={actionLoading ? '#BDBDBD' : '#4CAF50'}
                          />
                        </TouchableOpacity>
                      ) : (
                        <MaterialIcons name="chevron-right" size={20} color="#BDBDBD" />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Historique des emprunts */}
        <View style={styles.loansCard}>
          <Text style={styles.cardTitle}>Historique des emprunts</Text>

          {borrows.length === 0 ? (
            <View style={styles.emptyLoans}>
              <MaterialIcons name="menu-book" size={48} color="#E0E0E0" />
              <Text style={styles.emptyLoansText}>Aucun emprunt</Text>
            </View>
          ) : (
            sortedBorrows.map((borrow) => (
              <View key={`borrow-${borrow.id}`} style={styles.loanItemContainer}>
                <TouchableOpacity
                  style={styles.loanItem}
                  onPress={() => router.push(`/(tabs)/borrows/${borrow.id}`)}
                >
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanTitle} numberOfLines={1}>
                      {borrow.book?.title || 'Livre inconnu'}
                    </Text>
                    <Text style={styles.loanDate}>
                      Emprunté le {formatDate(borrow.borrowed_date)}
                    </Text>
                    {borrow.expected_return_date && (
                      <Text style={styles.loanDate}>
                        Retour prévu : {formatDate(borrow.expected_return_date)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.loanStatus}>
                    {borrow.status === 'overdue' && (
                      <View style={[styles.statusBadge, styles.statusOverdue]}>
                        <Text style={styles.statusText}>En retard</Text>
                      </View>
                    )}
                    {borrow.status === 'active' && (
                      <View style={[styles.statusBadge, styles.statusActive]}>
                        <Text style={styles.statusText}>En cours</Text>
                      </View>
                    )}
                    {borrow.status === 'returned' && (
                      <View style={[styles.statusBadge, styles.statusReturned]}>
                        <Text style={styles.statusText}>Retourné</Text>
                      </View>
                    )}
                    <MaterialIcons name="chevron-right" size={20} color="#BDBDBD" />
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ContactDetail() {
  return (
    <ProtectedRoute>
      <ContactDetailScreen />
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
    gap: 12,
  },
  headerActionButton: {
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  notesContainer: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 11,
    color: '#757575',
    marginTop: 4,
  },
  loansCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyLoans: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyLoansText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 12,
    marginBottom: 16,
  },
  createLoanButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createLoanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loanItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  loanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loanInfo: {
    flex: 1,
  },
  loanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  loanDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  loanStatus: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  returnIconButton: {
    padding: 4,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusOverdue: {
    backgroundColor: '#FFEBEE',
  },
  statusReturned: {
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center',
  },
  editField: {
    width: '100%',
    marginBottom: 12,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#FAFAFA',
  },
  editTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkedUserCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  linkedUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  linkedUserTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  linkedUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  librarySharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  librarySharedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  librarySharedText: {
    fontSize: 14,
    color: '#424242',
  },
  viewLibraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F0FF',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewLibraryButtonText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
  },
});
