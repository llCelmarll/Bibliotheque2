import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Borrower } from '@/types/borrower';
import { useBorrowers } from '@/hooks/useBorrowers';
import { BorrowerListItem } from '../loans/BorrowerListItem';
import { useTheme } from '@/contexts/ThemeContext';

interface BorrowerSelectorProps {
  selectedBorrower: Borrower | string | null;
  onBorrowerChange: (borrower: Borrower | string) => void;
  disabled?: boolean;
  error?: string;
}

export const BorrowerSelector: React.FC<BorrowerSelectorProps> = ({
  selectedBorrower,
  onBorrowerChange,
  disabled = false,
  error,
}) => {
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { borrowers, loading, searchBorrowers, loadBorrowers } = useBorrowers({ autoLoad: false });

  useEffect(() => {
    if (isModalOpen) {
      loadBorrowers();
    }
  }, [isModalOpen]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchBorrowers(searchQuery.trim());
    } else {
      await loadBorrowers();
    }
  };

  const handleSelectBorrower = (borrower: Borrower) => {
    onBorrowerChange(borrower);
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      onBorrowerChange(searchQuery.trim());
      setIsModalOpen(false);
      setSearchQuery('');
    }
  };

  const handleRemoveBorrower = () => {
    onBorrowerChange(null as any);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Emprunteur</Text>

      {selectedBorrower ? (
        <View style={[styles.selectedContainer, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }]}>
          <View style={styles.selectedInfo}>
            <MaterialIcons name="person" size={24} color={theme.accent} />
            <View style={styles.selectedTextContainer}>
              <Text style={[styles.selectedName, { color: theme.textPrimary }]}>
                {typeof selectedBorrower === 'string' ? selectedBorrower : selectedBorrower.name}
              </Text>
              {typeof selectedBorrower === 'object' && selectedBorrower.email && (
                <Text style={[styles.selectedEmail, { color: theme.textSecondary }]}>{selectedBorrower.email}</Text>
              )}
              {typeof selectedBorrower === 'string' && (
                <Text style={[styles.selectedEmail, { color: theme.textSecondary }]}>Nouveau (sera créé)</Text>
              )}
            </View>
          </View>
          {!disabled && (
            <TouchableOpacity onPress={handleRemoveBorrower}>
              <MaterialIcons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: theme.bgCard, borderColor: theme.accent }, disabled && { borderColor: theme.borderLight, backgroundColor: theme.bgSecondary }]}
          onPress={() => setIsModalOpen(true)}
          disabled={disabled}
        >
          <MaterialIcons name="person-add" size={20} color={disabled ? theme.textMuted : theme.accent} />
          <Text style={[styles.selectButtonText, { color: theme.accent }, disabled && { color: theme.textMuted }]}>
            Sélectionner un emprunteur
          </Text>
        </TouchableOpacity>
      )}

      {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.bgCard }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Sélectionner un emprunteur</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <MaterialIcons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { borderBottomColor: theme.borderLight }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.bgSecondary, color: theme.textPrimary }]}
              placeholder="Rechercher ou créer un emprunteur..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <MaterialIcons name="search" size={24} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {searchQuery.trim() && (
            <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.successBg, borderBottomColor: theme.borderLight }]} onPress={handleCreateNew}>
              <MaterialIcons name="add-circle" size={24} color={theme.success} />
              <Text style={[styles.createButtonText, { color: theme.success }]}>
                Créer "{searchQuery}"
              </Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : (
            <FlatList
              data={borrowers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <BorrowerListItem
                  borrower={item}
                  onPress={handleSelectBorrower}
                  showContact={true}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {searchQuery ? 'Aucun emprunteur trouvé' : 'Aucun emprunteur'}
                  </Text>
                  {searchQuery && (
                    <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
                      Appuyez sur "Créer" pour ajouter cet emprunteur
                    </Text>
                  )}
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  selectButtonText: {
    fontSize: 14,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  searchButton: {
    marginLeft: 8,
    padding: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
