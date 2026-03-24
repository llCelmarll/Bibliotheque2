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
import { useContacts } from '@/hooks/useContacts';
import { ContactListItem } from '@/components/loans/ContactListItem';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Contact } from '@/types/contact';
import { useLoans } from '@/hooks/useLoans';
import { useTheme } from '@/contexts/ThemeContext';

function ContactsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { contacts, loading, refresh, searchQuery, setSearchQuery, handleSearch } = useContacts();
  const { statistics: loanStats } = useLoans({ autoLoad: true });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCreateContact = () => {
    router.push('/(tabs)/loans/contacts/create');
  };

  const handleContactPress = (contact: Contact) => {
    router.push(`/(tabs)/loans/contacts/${contact.id}`);
  };

  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="people" size={64} color={theme.borderMedium} />
        <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>
          {searchQuery ? 'Aucun contact trouvé' : 'Aucun contact'}
        </Text>
        {!searchQuery && (
          <TouchableOpacity style={[styles.emptyStateButton, { backgroundColor: theme.accent }]} onPress={handleCreateContact}>
            <Text style={[styles.emptyStateButtonText, { color: theme.textInverse }]}>Créer un contact</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* En-tête avec statistiques */}
      <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.accent }]}>{contacts.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Contacts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.accent }]}>
              {contacts.filter(c => (c.active_loans_count && c.active_loans_count > 0) || (c.active_borrows_count && c.active_borrows_count > 0)).length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Avec activité</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.accent }]}>{loanStats?.total_loans || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Prêts totaux</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.accent }, loanStats?.overdue_loans ? { color: theme.danger } : null]}>
              {loanStats?.overdue_loans || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>En retard</Text>
          </View>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
        <MaterialIcons name="search" size={20} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Rechercher un contact..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des contacts */}
      {loading && contacts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ContactListItem
              contact={item}
              onPress={handleContactPress}
              showStats={true}
            />
          )}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            contacts.length === 0 ? styles.emptyListContainer : styles.listContent
          }
        />
      )}

      {/* Bouton Flottant pour créer un contact */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.accent }]} onPress={handleCreateContact}>
        <MaterialIcons name="add" size={28} color={theme.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

export default function ContactsList() {
  return (
    <ProtectedRoute>
      <ContactsScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
  },
  header: {
    borderBottomWidth: 1,
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
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
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
