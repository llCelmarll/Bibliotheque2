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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { contactService } from '@/services/contactService';
import { loanService } from '@/services/loanService';
import { borrowedBookService } from '@/services/borrowedBookService';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { Contact, ContactUpdate } from '@/types/contact';
import { Loan, LoanStatus } from '@/types/loan';
import { BorrowedBook, BorrowStatus } from '@/types/borrowedBook';
import { UserLoanRequest, UserLoanRequestStatus } from '@/types/userLoanRequest';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';

function ContactDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const contactId = parseInt(params.id as string);

  const [contact, setContact] = useState<Contact | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrows, setBorrows] = useState<BorrowedBook[]>([]);
  const [userLoanRequests, setUserLoanRequests] = useState<UserLoanRequest[]>([]);
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
      // Charger les demandes inter-membres si le contact est un utilisateur lié
      if (contactData.linked_user_id) {
        const ulrData = await userLoanRequestService.getByLinkedUser(contactData.linked_user_id);
        setUserLoanRequests(ulrData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du contact:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ? Cette action est irréversible.')
      : await new Promise<boolean>((resolve) =>
          Alert.alert(
            'Supprimer le contact',
            'Êtes-vous sûr de vouloir supprimer ce contact ? Cette action est irréversible.',
            [
              { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
            ]
          )
        );

    if (!confirmed) return;

    setActionLoading(true);
    try {
      await contactService.deleteContact(contactId);
      if (Platform.OS === 'web') {
        window.alert('Le contact a été supprimé');
        router.back();
      } else {
        Alert.alert('Succès', 'Le contact a été supprimé', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Impossible de supprimer le contact';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erreur', msg);
    } finally {
      setActionLoading(false);
    }
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

  // ULR où je suis prêteur (le linked_user est le requester)
  const userLoanRequestsAsLender = useMemo(() =>
    userLoanRequests.filter(r => r.requester_id === contact?.linked_user_id),
    [userLoanRequests, contact]
  );

  // ULR où je suis emprunteur (le linked_user est le lender)
  const userLoanRequestsAsBorrower = useMemo(() =>
    userLoanRequests.filter(r => r.lender_id === contact?.linked_user_id),
    [userLoanRequests, contact]
  );

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.borderLight} />
          <Text style={[styles.errorText, { color: theme.textMuted }]}>Contact introuvable</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: theme.textInverse }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeLoans = [
    ...loans.filter(l => l.status === 'active'),
    ...userLoanRequestsAsLender.filter(r => r.status === UserLoanRequestStatus.ACCEPTED),
  ];
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const returnedLoans = [
    ...loans.filter(l => l.status === 'returned'),
    ...userLoanRequestsAsLender.filter(r => r.status === UserLoanRequestStatus.RETURNED),
  ];

  const activeBorrows = [
    ...borrows.filter(b => b.status === 'active'),
    ...userLoanRequestsAsBorrower.filter(r => r.status === UserLoanRequestStatus.ACCEPTED),
  ];
  const overdueBorrows = borrows.filter(b => b.status === 'overdue');
  const returnedBorrows = [
    ...borrows.filter(b => b.status === 'returned'),
    ...userLoanRequestsAsBorrower.filter(r => r.status === UserLoanRequestStatus.RETURNED),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
          accessibilityLabel="Retour"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Détails contact</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={startEditing}
            style={styles.headerActionButton}
            accessibilityLabel="Modifier le contact"
          >
            <MaterialIcons name="edit" size={24} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerActionButton}
            accessibilityLabel="Supprimer le contact"
          >
            <MaterialIcons name="delete" size={24} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Informations du contact (mode lecture ou édition) */}
        {editing ? (
          <View style={[styles.infoCard, { backgroundColor: theme.bgCard }]}>
            <Text style={[styles.editSectionTitle, { color: theme.textPrimary }]}>Modifier le contact</Text>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Nom *</Text>
              <TextInput
                style={[styles.editInput, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="Nom du contact"
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.editInput, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Téléphone</Text>
              <TextInput
                style={[styles.editInput, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Téléphone"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Notes</Text>
              <TextInput
                style={[styles.editInput, styles.editTextarea, { borderColor: theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]}
                value={editForm.notes}
                onChangeText={(text) => setEditForm({ ...editForm, notes: text })}
                placeholder="Notes"
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.borderLight }]} onPress={cancelEditing}>
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent }, actionLoading && styles.buttonDisabled]}
                onPress={handleSaveEdit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={theme.textInverse} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.textInverse }]}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.infoCard, { backgroundColor: theme.bgCard }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
              <MaterialIcons name="person" size={32} color={theme.accent} />
            </View>
            <Text style={[styles.contactName, { color: theme.textPrimary }]}>{contact.name}</Text>

            {contact.email && (
              <View style={styles.contactRow}>
                <MaterialIcons name="email" size={16} color={theme.textSecondary} />
                <Text style={[styles.contactText, { color: theme.textSecondary }]}>{contact.email}</Text>
              </View>
            )}

            {contact.phone && (
              <View style={styles.contactRow}>
                <MaterialIcons name="phone" size={16} color={theme.textSecondary} />
                <Text style={[styles.contactText, { color: theme.textSecondary }]}>{contact.phone}</Text>
              </View>
            )}

            {contact.notes && (
              <View style={[styles.notesContainer, { borderTopColor: theme.borderLight }]}>
                <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>Notes</Text>
                <Text style={[styles.notesText, { color: theme.textPrimary }]}>{contact.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Section Utilisateur lié */}
        {contact.linked_user_id ? (
          <View style={[styles.linkedUserCard, { backgroundColor: theme.bgCard, borderLeftColor: theme.accentMedium }]}>
            <View style={styles.linkedUserHeader}>
              <MaterialIcons name="account-circle" size={20} color={theme.accentMedium} />
              <Text style={[styles.linkedUserTitle, { color: theme.accentMedium }]}>Utilisateur lié</Text>
            </View>
            <Text style={[styles.linkedUserName, { color: theme.textPrimary }]}>{contact.linked_user_username}</Text>
            <View style={styles.librarySharedRow}>
              <View style={styles.librarySharedLabel}>
                <MaterialIcons name="menu-book" size={16} color={theme.textSecondary} />
                <Text style={[styles.librarySharedText, { color: theme.textPrimary }]}>Partager ma bibliothèque</Text>
              </View>
              <ThemedSwitch
                value={contact.library_shared}
                onValueChange={handleToggleLibraryShared}
                disabled={actionLoading}
              />
            </View>
            <TouchableOpacity style={[styles.viewLibraryButton, { backgroundColor: theme.bgMuted }]} onPress={handleViewLibrary}>
              <MaterialIcons name="library-books" size={16} color={theme.accentMedium} />
              <Text style={[styles.viewLibraryButtonText, { color: theme.accentMedium }]}>Voir sa bibliothèque</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Statistiques Prêts */}
        <View style={[styles.statsCard, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Prêts</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{loans.length + userLoanRequestsAsLender.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.success }]}>{activeLoans.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En cours</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.danger }]}>{overdueLoans.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En retard</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textSecondary }]}>{returnedLoans.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Retournés</Text>
            </View>
          </View>
        </View>

        {/* Statistiques Emprunts */}
        <View style={[styles.statsCard, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Emprunts</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{borrows.length + userLoanRequestsAsBorrower.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.success }]}>{activeBorrows.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En cours</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.danger }]}>{overdueBorrows.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En retard</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textSecondary }]}>{returnedBorrows.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Retournés</Text>
            </View>
          </View>
        </View>

        {/* Historique des prêts */}
        <View style={[styles.loansCard, { backgroundColor: theme.bgCard }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Historique des prêts</Text>
            {!contact.linked_user_id && (
              <TouchableOpacity onPress={handleCreateLoan}>
                <MaterialIcons name="add-circle" size={24} color={theme.accent} />
              </TouchableOpacity>
            )}
          </View>

          {loans.length === 0 && userLoanRequestsAsLender.length === 0 ? (
            <View style={styles.emptyLoans}>
              <MaterialIcons name="library-books" size={48} color={theme.borderLight} />
              <Text style={[styles.emptyLoansText, { color: theme.textMuted }]}>Aucun prêt</Text>
              {!contact.linked_user_id && (
                <TouchableOpacity style={[styles.createLoanButton, { backgroundColor: theme.accent }]} onPress={handleCreateLoan}>
                  <Text style={[styles.createLoanButtonText, { color: theme.textInverse }]}>Créer un prêt</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {sortedLoans.map((loan) => {
                const canReturn = loan.status === 'active' || loan.status === 'overdue';
                return (
                  <View key={`loan-${loan.id}`} style={[styles.loanItemContainer, { borderBottomColor: theme.bgSecondary }]}>
                    <TouchableOpacity style={styles.loanItem} onPress={() => handleLoanPress(loan)}>
                      <View style={styles.loanInfo}>
                        <Text style={[styles.loanTitle, { color: theme.textPrimary }]} numberOfLines={1}>{loan.book.title}</Text>
                        <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Prêté le {formatDate(loan.loan_date)}</Text>
                        {loan.due_date && (
                          <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Retour prévu : {formatDate(loan.due_date)}</Text>
                        )}
                      </View>
                      <View style={styles.loanStatus}>
                        {loan.status === 'overdue' && <View style={[styles.statusBadge, { backgroundColor: theme.dangerBg }]}><Text style={[styles.statusText, { color: theme.danger }]}>En retard</Text></View>}
                        {loan.status === 'active' && <View style={[styles.statusBadge, { backgroundColor: theme.successBg }]}><Text style={[styles.statusText, { color: theme.success }]}>En cours</Text></View>}
                        {loan.status === 'returned' && <View style={[styles.statusBadge, { backgroundColor: theme.bgSecondary }]}><Text style={[styles.statusText, { color: theme.textSecondary }]}>Retourné</Text></View>}
                        {canReturn ? (
                          <TouchableOpacity onPress={() => handleReturnLoan(loan.id, loan.book.title)} style={styles.returnIconButton} disabled={actionLoading}>
                            <MaterialIcons name="assignment-return" size={20} color={actionLoading ? theme.textMuted : theme.success} />
                          </TouchableOpacity>
                        ) : (
                          <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {userLoanRequestsAsLender.map((req) => (
                <View key={`ulr-lender-${req.id}`} style={[styles.loanItemContainer, { borderBottomColor: theme.bgSecondary }]}>
                  <TouchableOpacity style={styles.loanItem} onPress={() => router.push(`/(tabs)/loans/user-loan-request/${req.id}` as any)}>
                    <View style={styles.loanInfo}>
                      <Text style={[styles.loanTitle, { color: theme.textPrimary }]} numberOfLines={1}>{req.book?.title || 'Livre inconnu'}</Text>
                      <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Prêté le {formatDate(req.request_date)}</Text>
                      {req.due_date && <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Retour prévu : {formatDate(req.due_date)}</Text>}
                    </View>
                    <View style={styles.loanStatus}>
                      {req.status === UserLoanRequestStatus.ACCEPTED && <View style={[styles.statusBadge, { backgroundColor: theme.successBg }]}><Text style={[styles.statusText, { color: theme.success }]}>En cours</Text></View>}
                      {req.status === UserLoanRequestStatus.RETURNED && <View style={[styles.statusBadge, { backgroundColor: theme.bgSecondary }]}><Text style={[styles.statusText, { color: theme.textSecondary }]}>Retourné</Text></View>}
                      {req.status === UserLoanRequestStatus.PENDING && <View style={[styles.statusBadge, { backgroundColor: theme.bgMuted }]}><Text style={[styles.statusText, { color: theme.textSecondary }]}>En attente</Text></View>}
                      {req.status === UserLoanRequestStatus.DECLINED && <View style={[styles.statusBadge, { backgroundColor: theme.dangerBg }]}><Text style={[styles.statusText, { color: theme.danger }]}>Refusé</Text></View>}
                      <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Historique des emprunts */}
        <View style={[styles.loansCard, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Historique des emprunts</Text>

          {borrows.length === 0 && userLoanRequestsAsBorrower.length === 0 ? (
            <View style={styles.emptyLoans}>
              <MaterialIcons name="menu-book" size={48} color={theme.borderLight} />
              <Text style={[styles.emptyLoansText, { color: theme.textMuted }]}>Aucun emprunt</Text>
            </View>
          ) : (
            <>
              {sortedBorrows.map((borrow) => (
                <View key={`borrow-${borrow.id}`} style={[styles.loanItemContainer, { borderBottomColor: theme.bgSecondary }]}>
                  <TouchableOpacity style={styles.loanItem} onPress={() => router.push(`/(tabs)/borrows/${borrow.id}`)}>
                    <View style={styles.loanInfo}>
                      <Text style={[styles.loanTitle, { color: theme.textPrimary }]} numberOfLines={1}>{borrow.book?.title || 'Livre inconnu'}</Text>
                      <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Emprunté le {formatDate(borrow.borrowed_date)}</Text>
                      {borrow.expected_return_date && <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Retour prévu : {formatDate(borrow.expected_return_date)}</Text>}
                    </View>
                    <View style={styles.loanStatus}>
                      {borrow.status === 'overdue' && <View style={[styles.statusBadge, { backgroundColor: theme.dangerBg }]}><Text style={[styles.statusText, { color: theme.danger }]}>En retard</Text></View>}
                      {borrow.status === 'active' && <View style={[styles.statusBadge, { backgroundColor: theme.successBg }]}><Text style={[styles.statusText, { color: theme.success }]}>En cours</Text></View>}
                      {borrow.status === 'returned' && <View style={[styles.statusBadge, { backgroundColor: theme.bgSecondary }]}><Text style={[styles.statusText, { color: theme.textSecondary }]}>Retourné</Text></View>}
                      <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
              {userLoanRequestsAsBorrower.map((req) => (
                <View key={`ulr-borrower-${req.id}`} style={[styles.loanItemContainer, { borderBottomColor: theme.bgSecondary }]}>
                  <TouchableOpacity style={styles.loanItem} onPress={() => router.push(`/(tabs)/loans/user-loan-request/${req.id}` as any)}>
                    <View style={styles.loanInfo}>
                      <Text style={[styles.loanTitle, { color: theme.textPrimary }]} numberOfLines={1}>{req.book?.title || 'Livre inconnu'}</Text>
                      <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Demandé le {formatDate(req.request_date)}</Text>
                      {req.due_date && <Text style={[styles.loanDate, { color: theme.textSecondary }]}>Retour prévu : {formatDate(req.due_date)}</Text>}
                    </View>
                    <View style={styles.loanStatus}>
                      {req.status === UserLoanRequestStatus.ACCEPTED && <View style={[styles.statusBadge, { backgroundColor: theme.successBg }]}><Text style={[styles.statusText, { color: theme.success }]}>En cours</Text></View>}
                      {req.status === UserLoanRequestStatus.RETURNED && <View style={[styles.statusBadge, { backgroundColor: theme.bgSecondary }]}><Text style={[styles.statusText, { color: theme.textSecondary }]}>Retourné</Text></View>}
                      {req.status === UserLoanRequestStatus.PENDING && <View style={[styles.statusBadge, { backgroundColor: theme.bgMuted }]}><Text style={[styles.statusText, { color: theme.textSecondary }]}>En attente</Text></View>}
                      {req.status === UserLoanRequestStatus.DECLINED && <View style={[styles.statusBadge, { backgroundColor: theme.dangerBg }]}><Text style={[styles.statusText, { color: theme.danger }]}>Refusé</Text></View>}
                      <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 22,
    fontWeight: '700',
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
    marginLeft: 8,
  },
  notesContainer: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  loansCard: {
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
    marginTop: 12,
    marginBottom: 16,
  },
  createLoanButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createLoanButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loanItemContainer: {
    borderBottomWidth: 1,
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
    marginBottom: 4,
  },
  loanDate: {
    fontSize: 12,
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
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
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
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkedUserCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
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
  },
  linkedUserName: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  viewLibraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewLibraryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
