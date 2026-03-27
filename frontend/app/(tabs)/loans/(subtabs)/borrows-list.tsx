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
import { BorrowStatus, BorrowedBook } from '@/types/borrowedBook';
import { useBorrows } from '@/hooks/useBorrows';
import { BorrowListItem } from '@/components/borrows/BorrowListItem';
import { UserLoanRequestListItem } from '@/components/loans/UserLoanRequestListItem';
import { useNotifications } from '@/contexts/NotificationsContext';
import { UserLoanRequest, UserLoanRequestStatus } from '@/types/userLoanRequest';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';

type SortOption = 'date' | 'borrowedFrom' | 'book' | 'dueDate';

function BorrowedBooksScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [filterStatus, setFilterStatus] = useState<BorrowStatus | 'all'>('all');
  const { borrows, loading, refresh } = useBorrows({ filterStatus });
  const { outgoingLoanRequests: outgoingRequests, loading: requestsLoading, refresh: refreshRequests } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Demandes de prêt inter-membres ACCEPTED envoyées (je suis le demandeur/emprunteur)
  const acceptedOutgoing = useMemo(() =>
    outgoingRequests.filter(r => r.status === UserLoanRequestStatus.ACCEPTED),
    [outgoingRequests]
  );

  // Demandes de prêt inter-membres RETURNED envoyées (historique)
  const returnedOutgoing = useMemo(() =>
    outgoingRequests.filter(r => r.status === UserLoanRequestStatus.RETURNED),
    [outgoingRequests]
  );

  useFocusEffect(useCallback(() => {
    refreshRequests();
  }, [refreshRequests]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshRequests()]);
    setRefreshing(false);
  };

  const handleCreateBorrow = () => {
    router.push('/(tabs)/borrows/create');
  };

  // Filtrer et trier les emprunts
  const filteredAndSortedBorrows = useMemo(() => {
    let filtered = [...borrows];

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(borrow =>
        borrow.book?.title.toLowerCase().includes(query) ||
        (borrow.contact?.name || borrow.borrowed_from).toLowerCase().includes(query) ||
        borrow.book?.authors?.some(a => a.name.toLowerCase().includes(query))
      );
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'borrowedFrom':
          return (a.contact?.name || a.borrowed_from).localeCompare(b.contact?.name || b.borrowed_from);
        case 'book':
          return (a.book?.title || '').localeCompare(b.book?.title || '');
        case 'dueDate':
          if (!a.expected_return_date) return 1;
          if (!b.expected_return_date) return -1;
          return new Date(a.expected_return_date).getTime() - new Date(b.expected_return_date).getTime();
        case 'date':
        default:
          const statusPriority: Record<BorrowStatus, number> = {
            [BorrowStatus.OVERDUE]: 0,
            [BorrowStatus.ACTIVE]: 1,
            [BorrowStatus.RETURNED]: 2,
          };

          const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
          if (priorityDiff !== 0) {
            return priorityDiff;
          }

          return new Date(b.borrowed_date).getTime() - new Date(a.borrowed_date).getTime();
      }
    });

    return filtered;
  }, [borrows, searchQuery, sortBy]);

  const renderFilterButton = (
    status: BorrowStatus | 'all',
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

    let message = 'Aucun emprunt';
    let icon = 'library-books';

    if (filterStatus === BorrowStatus.ACTIVE) {
      message = 'Aucun emprunt en cours';
      icon = 'check-circle';
    } else if (filterStatus === BorrowStatus.OVERDUE) {
      message = 'Aucun emprunt en retard';
      icon = 'thumb-up';
    }

    return (
      <View style={styles.emptyState}>
        <MaterialIcons name={icon as any} size={64} color={theme.borderMedium} />
        <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>{message}</Text>
        <TouchableOpacity style={[styles.emptyStateButton, { backgroundColor: theme.accent }]} onPress={handleCreateBorrow}>
          <Text style={[styles.emptyStateButtonText, { color: theme.textInverse }]}>Créer un emprunt</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Filtres de statut */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
        {renderFilterButton('all', 'Tous', 'list')}
        {renderFilterButton(BorrowStatus.ACTIVE, 'En cours', 'schedule')}
        {renderFilterButton(BorrowStatus.OVERDUE, 'En retard', 'warning')}
      </View>

      {/* Barre de recherche et tri */}
      <View style={[styles.searchSortContainer, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.bgInput }]}>
          <MaterialIcons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Rechercher un livre..."
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
          {(['date', 'borrowedFrom', 'book', 'dueDate'] as SortOption[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.sortButton, { backgroundColor: sortBy === opt ? theme.accent : theme.bgMuted }]}
              onPress={() => setSortBy(opt)}
            >
              <Text style={[styles.sortButtonText, { color: sortBy === opt ? theme.textInverse : theme.textSecondary, fontWeight: sortBy === opt ? '600' : '400' }]}>
                {opt === 'date' ? 'Date' : opt === 'borrowedFrom' ? 'Source' : opt === 'book' ? 'Livre' : 'Échéance'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Liste des emprunts */}
      {loading || requestsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={[
            ...acceptedOutgoing.map(r => ({ type: 'ulr' as const, data: r })),
            ...filteredAndSortedBorrows.map(b => ({ type: 'borrow' as const, data: b })),
            ...returnedOutgoing.map(r => ({ type: 'ulr' as const, data: r })),
          ]}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          renderItem={({ item }) =>
            item.type === 'ulr'
              ? <UserLoanRequestListItem request={item.data as UserLoanRequest} onAction={refreshRequests} />
              : <BorrowListItem borrow={item.data as BorrowedBook} onReturn={refresh} />
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            filteredAndSortedBorrows.length === 0 && acceptedOutgoing.length === 0 && returnedOutgoing.length === 0 ? styles.emptyListContainer : undefined
          }
        />
      )}

      {/* Bouton Flottant pour créer un emprunt */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={handleCreateBorrow}
        accessibilityLabel="Créer un nouvel emprunt"
      >
        <MaterialIcons name="add" size={28} color={theme.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

export default function BorrowsList() {
  return (
    <ProtectedRoute>
      <BorrowedBooksScreen />
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
