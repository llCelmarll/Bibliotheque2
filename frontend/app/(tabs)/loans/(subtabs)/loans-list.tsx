import React, { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LoanStatus, Loan } from '@/types/loan';
import { useLoans } from '@/hooks/useLoans';
import { LoanListItem } from '@/components/loans/LoanListItem';
import { UserLoanRequestListItem } from '@/components/loans/UserLoanRequestListItem';
import { useNotifications } from '@/contexts/NotificationsContext';
import { UserLoanRequest, UserLoanRequestStatus } from '@/types/userLoanRequest';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

type SortOption = 'date' | 'contact' | 'book' | 'dueDate';

function LoansScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [filterStatus, setFilterStatus] = useState<LoanStatus | 'all'>('all');
  const { loans, loading, refresh } = useLoans({ filterStatus });
  const { incomingLoanRequests: incomingRequests, loading: requestsLoading, refresh: refreshRequests } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Demandes de prêt inter-membres PENDING reçues (je suis le prêteur, en attente de ma décision)
  const pendingIncoming = useMemo(() =>
    incomingRequests.filter(r => r.status === UserLoanRequestStatus.PENDING),
    [incomingRequests]
  );

  // Demandes de prêt inter-membres ACCEPTED reçues (je suis le prêteur)
  const acceptedIncoming = useMemo(() =>
    incomingRequests.filter(r => r.status === UserLoanRequestStatus.ACCEPTED),
    [incomingRequests]
  );

  // Demandes de prêt inter-membres RETURNED reçues (historique)
  const returnedIncoming = useMemo(() =>
    incomingRequests.filter(r => r.status === UserLoanRequestStatus.RETURNED),
    [incomingRequests]
  );

  useFocusEffect(useCallback(() => {
    refreshRequests();
  }, [refreshRequests]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshRequests()]);
    setRefreshing(false);
  };

  const handleCreateLoan = () => {
    router.push('/(tabs)/loans/create');
  };

  // Filtrer et trier les prêts
  const filteredAndSortedLoans = useMemo(() => {
    let filtered = [...loans];

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(loan =>
        loan.book.title.toLowerCase().includes(query) ||
        loan.contact.name.toLowerCase().includes(query) ||
        loan.book.authors?.some(a => a.name.toLowerCase().includes(query))
      );
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'contact':
          return a.contact.name.localeCompare(b.contact.name);
        case 'book':
          return a.book.title.localeCompare(b.book.title);
        case 'dueDate':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'date':
        default:
          // Tri par défaut: priorité au statut puis date d'emprunt
          // 1. En retard (OVERDUE) en premier
          // 2. En cours (ACTIVE) ensuite
          // 3. Retournés (RETURNED) à la fin
          // Puis par date d'emprunt (plus récent en premier)

          const statusPriority: Record<LoanStatus, number> = {
            [LoanStatus.OVERDUE]: 0,
            [LoanStatus.ACTIVE]: 1,
            [LoanStatus.RETURNED]: 2,
          };

          const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
          if (priorityDiff !== 0) {
            return priorityDiff;
          }

          // Même statut, trier par date d'emprunt (plus récent en premier)
          return new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime();
      }
    });

    return filtered;
  }, [loans, searchQuery, sortBy]);

  const renderFilterButton = (
    status: LoanStatus | 'all',
    label: string,
    icon: string
  ) => {
    const isActive = filterStatus === status;
    return (
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: isActive ? theme.accent : theme.bgMuted }]}
        onPress={() => setFilterStatus(status)}
      >
        <MaterialIcons
          name={icon as any}
          size={20}
          color={isActive ? theme.textInverse : theme.textMuted}
        />
        <Text style={[styles.filterButtonText, { color: isActive ? theme.textInverse : theme.textSecondary, fontWeight: isActive ? '600' : '400' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    let message = 'Aucun prêt';
    let icon = 'library-books';

    if (filterStatus === LoanStatus.ACTIVE) {
      message = 'Aucun prêt en cours';
      icon = 'check-circle';
    } else if (filterStatus === LoanStatus.OVERDUE) {
      message = 'Aucun prêt en retard';
      icon = 'thumb-up';
    }

    return (
      <View style={styles.emptyState}>
        <MaterialIcons name={icon as any} size={64} color={theme.borderMedium} />
        <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>{message}</Text>
        <TouchableOpacity style={[styles.emptyStateButton, { backgroundColor: theme.accent }]} onPress={handleCreateLoan}>
          <Text style={[styles.emptyStateButtonText, { color: theme.textInverse }]}>Créer un prêt</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Filtres de statut */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
        {renderFilterButton('all', 'Tous', 'list')}
        {renderFilterButton(LoanStatus.ACTIVE, 'En cours', 'schedule')}
        {renderFilterButton(LoanStatus.OVERDUE, 'En retard', 'warning')}
      </View>

      {/* Barre de recherche et tri */}
      <View style={[styles.searchSortContainer, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.bgInput }]}>
          <MaterialIcons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Rechercher un livre ou contact..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sortContainer}>
          <MaterialIcons name="sort" size={20} color={theme.textMuted} />
          {(['date', 'contact', 'book', 'dueDate'] as SortOption[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.sortButton, { backgroundColor: sortBy === opt ? theme.accent : theme.bgMuted }]}
              onPress={() => setSortBy(opt)}
            >
              <Text style={[styles.sortButtonText, { color: sortBy === opt ? theme.textInverse : theme.textSecondary, fontWeight: sortBy === opt ? '600' : '400' }]}>
                {opt === 'date' ? 'Date' : opt === 'contact' ? 'Contact' : opt === 'book' ? 'Livre' : 'Échéance'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Liste des prêts */}
      {loading || requestsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={[
            ...pendingIncoming.map(r => ({ type: 'ulr' as const, data: r })),
            ...acceptedIncoming.map(r => ({ type: 'ulr' as const, data: r })),
            ...filteredAndSortedLoans.map(l => ({ type: 'loan' as const, data: l })),
            ...returnedIncoming.map(r => ({ type: 'ulr' as const, data: r })),
          ]}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          renderItem={({ item }) =>
            item.type === 'ulr'
              ? <UserLoanRequestListItem request={item.data as UserLoanRequest} onAction={refreshRequests} />
              : <LoanListItem loan={item.data as Loan} onReturn={refresh} />
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            filteredAndSortedLoans.length === 0 && acceptedIncoming.length === 0 && pendingIncoming.length === 0 && returnedIncoming.length === 0 ? styles.emptyListContainer : undefined
          }
        />
      )}

      {/* Bouton Flottant pour créer un prêt */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={handleCreateLoan}
        accessibilityLabel="Créer un nouveau prêt"
        // @ts-ignore - title works on web for tooltip
        title="Créer un nouveau prêt"
      >
        <MaterialIcons name="add" size={28} color={theme.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

export default function Index() {
  return (
    <ProtectedRoute>
      <LoansScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  searchSortContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  filterButtonText: {
    fontSize: 14,
    marginLeft: 6,
  },
  filterButtonTextActive: {
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
