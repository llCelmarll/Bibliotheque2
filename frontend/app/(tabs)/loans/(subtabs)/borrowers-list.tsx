import React, { useState } from 'react';
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
import { useBorrowers } from '@/hooks/useBorrowers';
import { BorrowerListItem } from '@/components/loans/BorrowerListItem';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Borrower } from '@/types/borrower';
import { useLoans } from '@/hooks/useLoans';

function BorrowersScreen() {
  const router = useRouter();
  const { borrowers, loading, refresh, searchQuery, setSearchQuery, handleSearch } = useBorrowers();
  const { statistics: loanStats } = useLoans({ autoLoad: true });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCreateBorrower = () => {
    router.push('/(tabs)/loans/borrowers/create');
  };

  const handleBorrowerPress = (borrower: Borrower) => {
    router.push(`/(tabs)/loans/borrowers/${borrower.id}`);
  };

  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="people" size={64} color="#E0E0E0" />
        <Text style={styles.emptyStateText}>
          {searchQuery ? 'Aucun emprunteur trouvé' : 'Aucun emprunteur'}
        </Text>
        {!searchQuery && (
          <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreateBorrower}>
            <Text style={styles.emptyStateButtonText}>Créer un emprunteur</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* En-tête avec statistiques */}
      <View style={styles.header}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{borrowers.length}</Text>
            <Text style={styles.statLabel}>Emprunteurs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {borrowers.filter(b => b.active_loans_count && b.active_loans_count > 0).length}
            </Text>
            <Text style={styles.statLabel}>Avec prêts actifs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{loanStats?.total_loans || 0}</Text>
            <Text style={styles.statLabel}>Prêts totaux</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, loanStats?.overdue_loans ? styles.statValueDanger : null]}>
              {loanStats?.overdue_loans || 0}
            </Text>
            <Text style={styles.statLabel}>En retard</Text>
          </View>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un emprunteur..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des emprunteurs */}
      {loading && borrowers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={borrowers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <BorrowerListItem
              borrower={item}
              onPress={handleBorrowerPress}
              showStats={true}
            />
          )}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            borrowers.length === 0 ? styles.emptyListContainer : styles.listContent
          }
        />
      )}

      {/* Bouton Flottant pour créer un emprunteur */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateBorrower}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

export default function BorrowersList() {
  return (
    <ProtectedRoute>
      <BorrowersScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  statValueDanger: {
    color: '#F44336',
  },
  statLabel: {
    fontSize: 11,
    color: '#757575',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#212121',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 80,
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
