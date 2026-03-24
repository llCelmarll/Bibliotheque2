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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { borrowerService } from '@/services/borrowerService';
import { loanService } from '@/services/loanService';
import { Borrower } from '@/types/borrower';
import { Loan, LoanStatus } from '@/types/loan';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';

function BorrowerDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const borrowerId = parseInt(params.id as string);

  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBorrowerDetail();
  }, [borrowerId]);

  const loadBorrowerDetail = async () => {
    setLoading(true);
    try {
      const [borrowerData, loansData] = await Promise.all([
        borrowerService.getBorrowerById(borrowerId),
        loanService.getLoansByBorrower(borrowerId),
      ]);
      setBorrower(borrowerData);
      setLoans(loansData);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'emprunteur:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'emprunteur');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'emprunteur',
      'Êtes-vous sûr de vouloir supprimer cet emprunteur ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await borrowerService.deleteBorrower(borrowerId);
              Alert.alert(
                'Succès',
                'L\'emprunteur a été supprimé',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              Alert.alert(
                'Erreur',
                error.response?.data?.detail || 'Impossible de supprimer l\'emprunteur'
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateLoan = () => {
    router.push({
      pathname: '/(tabs)/loans/create',
      params: { borrowerId: borrowerId.toString() }
    });
  };

  const handleLoanPress = (loan: Loan) => {
    router.push(`/(tabs)/loans/${loan.id}`);
  };

  const handleReturnLoan = (loanId: number, bookTitle: string) => {
    if (Platform.OS === 'web') {
      // Sur web, utiliser window.confirm
      const confirmed = window.confirm(
        `Confirmer le retour de "${bookTitle}" ?`
      );
      if (confirmed) {
        confirmReturnLoan(loanId);
      }
    } else {
      // Sur mobile, utiliser Alert.alert
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
      loadBorrowerDetail();
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

  // Tri des prêts : OVERDUE → ACTIVE → RETURNED, puis par date de prêt
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

  if (!borrower) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.borderLight} />
          <Text style={[styles.errorText, { color: theme.textMuted }]}>Emprunteur introuvable</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: theme.textInverse }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeLoans = loans.filter(l => l.status === 'active');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const returnedLoans = loans.filter(l => l.status === 'returned');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
          accessibilityLabel="Retour"
          // @ts-ignore - title works on web for tooltip
          title="Retour"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Détails emprunteur</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.headerDeleteButton}
          accessibilityLabel="Supprimer l'emprunteur"
          accessibilityHint="Supprime définitivement cet emprunteur"
          // @ts-ignore - title works on web for tooltip
          title="Supprimer l'emprunteur"
        >
          <MaterialIcons name="delete" size={24} color={theme.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Informations de l'emprunteur */}
        <View style={[styles.infoCard, { backgroundColor: theme.bgCard }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
            <MaterialIcons name="person" size={32} color={theme.accent} />
          </View>
          <Text style={[styles.borrowerName, { color: theme.textPrimary }]}>{borrower.name}</Text>

          {borrower.email && (
            <View style={styles.contactRow}>
              <MaterialIcons name="email" size={16} color={theme.textSecondary} />
              <Text style={[styles.contactText, { color: theme.textSecondary }]}>{borrower.email}</Text>
            </View>
          )}

          {borrower.phone && (
            <View style={styles.contactRow}>
              <MaterialIcons name="phone" size={16} color={theme.textSecondary} />
              <Text style={[styles.contactText, { color: theme.textSecondary }]}>{borrower.phone}</Text>
            </View>
          )}

          {borrower.notes && (
            <View style={[styles.notesContainer, { borderTopColor: theme.borderLight }]}>
              <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: theme.textPrimary }]}>{borrower.notes}</Text>
            </View>
          )}
        </View>

        {/* Statistiques */}
        <View style={[styles.statsCard, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Statistiques</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{loans.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total prêts</Text>
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

        {/* Historique des prêts */}
        <View style={[styles.loansCard, { backgroundColor: theme.bgCard }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Historique des prêts</Text>
            <TouchableOpacity
              onPress={handleCreateLoan}
              accessibilityLabel="Créer un nouveau prêt"
              // @ts-ignore - title works on web for tooltip
              title="Créer un nouveau prêt"
            >
              <MaterialIcons name="add-circle" size={24} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {loans.length === 0 ? (
            <View style={styles.emptyLoans}>
              <MaterialIcons name="library-books" size={48} color={theme.borderLight} />
              <Text style={[styles.emptyLoansText, { color: theme.textMuted }]}>Aucun prêt</Text>
              <TouchableOpacity style={[styles.createLoanButton, { backgroundColor: theme.accent }]} onPress={handleCreateLoan}>
                <Text style={[styles.createLoanButtonText, { color: theme.textInverse }]}>Créer un prêt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedLoans.map((loan) => {
              const canReturn = loan.status === 'active' || loan.status === 'overdue';

              return (
                <View key={loan.id} style={[styles.loanItemContainer, { borderBottomColor: theme.bgSecondary }]}>
                  <TouchableOpacity
                    style={styles.loanItem}
                    onPress={() => handleLoanPress(loan)}
                  >
                    <View style={styles.loanInfo}>
                      <Text style={[styles.loanTitle, { color: theme.textPrimary }]} numberOfLines={1}>{loan.book.title}</Text>
                      <Text style={[styles.loanDate, { color: theme.textSecondary }]}>
                        Prêté à : {loan.borrower.name}
                      </Text>
                      <Text style={[styles.loanDate, { color: theme.textSecondary }]}>
                        Prêté le {formatDate(loan.loan_date)}
                      </Text>
                      {loan.due_date && (
                        <Text style={[styles.loanDate, { color: theme.textSecondary }]}>
                          Retour prévu : {formatDate(loan.due_date)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.loanStatus}>
                      {loan.status === 'overdue' && (
                        <View style={[styles.statusBadge, { backgroundColor: theme.dangerBg }]}>
                          <Text style={[styles.statusText, { color: theme.danger }]}>En retard</Text>
                        </View>
                      )}
                      {loan.status === 'active' && (
                        <View style={[styles.statusBadge, { backgroundColor: theme.successBg }]}>
                          <Text style={[styles.statusText, { color: theme.success }]}>En cours</Text>
                        </View>
                      )}
                      {loan.status === 'returned' && (
                        <View style={[styles.statusBadge, { backgroundColor: theme.bgSecondary }]}>
                          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Retourné</Text>
                        </View>
                      )}
                      {canReturn ? (
                        <TouchableOpacity
                          onPress={() => handleReturnLoan(loan.id, loan.book.title)}
                          style={styles.returnIconButton}
                          disabled={actionLoading}
                          accessibilityLabel="Marquer comme retourné"
                          accessibilityHint={`Enregistrer le retour de ${loan.book.title}`}
                          // @ts-ignore - title works on web for tooltip
                          title="Marquer comme retourné"
                        >
                          <MaterialIcons
                            name="assignment-return"
                            size={20}
                            color={actionLoading ? theme.textMuted : theme.success}
                          />
                        </TouchableOpacity>
                      ) : (
                        <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function BorrowerDetail() {
  return (
    <ProtectedRoute>
      <BorrowerDetailScreen />
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
  borrowerName: {
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
});
