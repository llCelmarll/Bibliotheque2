import React, { useState, useMemo } from 'react';
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
import { LoanStatus, Loan } from '@/types/loan';
import { useLoans } from '@/hooks/useLoans';
import { LoanListItem } from '@/components/loans/LoanListItem';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

type SortOption = 'date' | 'borrower' | 'book' | 'dueDate';

function LoansScreen() {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<LoanStatus | 'all'>('all');
  const { loans, loading, refresh } = useLoans({ filterStatus });
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
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
        loan.borrower.name.toLowerCase().includes(query) ||
        loan.book.authors?.some(a => a.name.toLowerCase().includes(query))
      );
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'borrower':
          return a.borrower.name.localeCompare(b.borrower.name);
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
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setFilterStatus(status)}
      >
        <MaterialIcons
          name={icon as any}
          size={20}
          color={isActive ? '#FFFFFF' : '#757575'}
        />
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive,
          ]}
        >
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
        <MaterialIcons name={icon as any} size={64} color="#E0E0E0" />
        <Text style={styles.emptyStateText}>{message}</Text>
        <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreateLoan}>
          <Text style={styles.emptyStateButtonText}>Créer un prêt</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filtres de statut */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'Tous', 'list')}
        {renderFilterButton(LoanStatus.ACTIVE, 'En cours', 'schedule')}
        {renderFilterButton(LoanStatus.OVERDUE, 'En retard', 'warning')}
      </View>

      {/* Barre de recherche et tri */}
      <View style={styles.searchSortContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un livre ou emprunteur..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9E9E9E"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#757575" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sortContainer}>
          <MaterialIcons name="sort" size={20} color="#757575" />
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
              Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'borrower' && styles.sortButtonActive]}
            onPress={() => setSortBy('borrower')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'borrower' && styles.sortButtonTextActive]}>
              Emprunteur
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'book' && styles.sortButtonActive]}
            onPress={() => setSortBy('book')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'book' && styles.sortButtonTextActive]}>
              Livre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'dueDate' && styles.sortButtonActive]}
            onPress={() => setSortBy('dueDate')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'dueDate' && styles.sortButtonTextActive]}>
              Échéance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des prêts */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedLoans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <LoanListItem loan={item} onReturn={refresh} />}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            filteredAndSortedLoans.length === 0 ? styles.emptyListContainer : undefined
          }
        />
      )}

      {/* Bouton Flottant pour créer un prêt */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateLoan}
        accessibilityLabel="Créer un nouveau prêt"
        // @ts-ignore - title works on web for tooltip
        title="Créer un nouveau prêt"
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
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
    backgroundColor: '#F5F5F5',
    paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchSortContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
    color: '#212121',
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
    backgroundColor: '#F5F5F5',
  },
  sortButtonActive: {
    backgroundColor: '#2196F3',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
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
    color: '#9E9E9E',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
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
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
