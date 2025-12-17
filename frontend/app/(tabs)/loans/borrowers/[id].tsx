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

function BorrowerDetailScreen() {
  const router = useRouter();
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  if (!borrower) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#E0E0E0" />
          <Text style={styles.errorText}>Emprunteur introuvable</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <Text style={styles.headerTitle}>Détails emprunteur</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.headerDeleteButton}
          accessibilityLabel="Supprimer l'emprunteur"
          accessibilityHint="Supprime définitivement cet emprunteur"
          // @ts-ignore - title works on web for tooltip
          title="Supprimer l'emprunteur"
        >
          <MaterialIcons name="delete" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Informations de l'emprunteur */}
        <View style={styles.infoCard}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="person" size={32} color="#2196F3" />
          </View>
          <Text style={styles.borrowerName}>{borrower.name}</Text>

          {borrower.email && (
            <View style={styles.contactRow}>
              <MaterialIcons name="email" size={16} color="#757575" />
              <Text style={styles.contactText}>{borrower.email}</Text>
            </View>
          )}

          {borrower.phone && (
            <View style={styles.contactRow}>
              <MaterialIcons name="phone" size={16} color="#757575" />
              <Text style={styles.contactText}>{borrower.phone}</Text>
            </View>
          )}

          {borrower.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{borrower.notes}</Text>
            </View>
          )}
        </View>

        {/* Statistiques */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loans.length}</Text>
              <Text style={styles.statLabel}>Total prêts</Text>
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

        {/* Historique des prêts */}
        <View style={styles.loansCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Historique des prêts</Text>
            <TouchableOpacity
              onPress={handleCreateLoan}
              accessibilityLabel="Créer un nouveau prêt"
              // @ts-ignore - title works on web for tooltip
              title="Créer un nouveau prêt"
            >
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
                        Prêté à : {loan.borrower.name}
                      </Text>
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
                          accessibilityLabel="Marquer comme retourné"
                          accessibilityHint={`Enregistrer le retour de ${loan.book.title}`}
                          // @ts-ignore - title works on web for tooltip
                          title="Marquer comme retourné"
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
  borrowerName: {
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
});
