import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Contact } from '@/types/contact';
import { useContacts } from '@/hooks/useContacts';
import { ContactListItem } from '../loans/ContactListItem';

interface ContactSelectorProps {
  selectedContact: Contact | string | null;
  onContactChange: (contact: Contact | string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export const ContactSelector: React.FC<ContactSelectorProps> = ({
  selectedContact,
  onContactChange,
  disabled = false,
  error,
  label = 'Contact',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { contacts, loading, searchContacts, loadContacts } = useContacts({ autoLoad: false });

  useEffect(() => {
    if (isModalOpen) {
      loadContacts();
    }
  }, [isModalOpen]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchContacts(searchQuery.trim());
    } else {
      await loadContacts();
    }
  };

  const handleSelectContact = (contact: Contact) => {
    onContactChange(contact);
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      onContactChange(searchQuery.trim());
      setIsModalOpen(false);
      setSearchQuery('');
    }
  };

  const handleRemoveContact = () => {
    onContactChange(null as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {selectedContact ? (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedInfo}>
            <MaterialIcons name="person" size={24} color="#2196F3" />
            <View style={styles.selectedTextContainer}>
              <Text style={styles.selectedName}>
                {typeof selectedContact === 'string' ? selectedContact : selectedContact.name}
              </Text>
              {typeof selectedContact === 'object' && selectedContact.email && (
                <Text style={styles.selectedEmail}>{selectedContact.email}</Text>
              )}
              {typeof selectedContact === 'string' && (
                <Text style={styles.selectedEmail}>Nouveau (sera créé)</Text>
              )}
            </View>
          </View>
          {!disabled && (
            <TouchableOpacity onPress={handleRemoveContact}>
              <MaterialIcons name="close" size={24} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.selectButton, disabled && styles.selectButtonDisabled]}
          onPress={() => setIsModalOpen(true)}
          disabled={disabled}
        >
          <MaterialIcons name="person-add" size={20} color={disabled ? '#BDBDBD' : '#2196F3'} />
          <Text style={[styles.selectButtonText, disabled && styles.selectButtonTextDisabled]}>
            Sélectionner un contact
          </Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un contact</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <MaterialIcons name="close" size={28} color="#212121" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher ou créer un contact..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <MaterialIcons name="search" size={24} color="#2196F3" />
            </TouchableOpacity>
          </View>

          {searchQuery.trim() && (
            <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
              <MaterialIcons name="add-circle" size={24} color="#4CAF50" />
              <Text style={styles.createButtonText}>
                Créer "{searchQuery}"
              </Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <ContactListItem
                  contact={item}
                  onPress={handleSelectContact}
                  showContact={true}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Aucun contact trouvé' : 'Aucun contact'}
                  </Text>
                  {searchQuery && (
                    <Text style={styles.emptyHint}>
                      Appuyez sur "Créer" pour ajouter ce contact
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
    color: '#424242',
    marginBottom: 8,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#212121',
  },
  selectedEmail: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  selectButtonDisabled: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
  },
  selectButtonTextDisabled: {
    color: '#BDBDBD',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#E8F5E9',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
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
    color: '#757575',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    color: '#BDBDBD',
    textAlign: 'center',
    marginTop: 8,
  },
});
