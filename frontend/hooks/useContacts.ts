import { useState, useCallback, useEffect } from 'react';
import { Contact, ContactCreate, ContactUpdate } from '@/types/contact';
import { contactService } from '@/services/contactService';
import { useAuth } from '@/contexts/AuthContext';

interface UseContactsParams {
  autoLoad?: boolean;
}

export function useContacts({
  autoLoad = true,
}: UseContactsParams = {}) {
  const { isAuthenticated } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Charge tous les contacts
   */
  const loadContacts = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await contactService.getAllContacts();
      setContacts(data);
    } catch (err) {
      console.error('Erreur lors du chargement des contacts:', err);
      setError('Impossible de charger les contacts');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Recherche des contacts par nom
   */
  const searchContacts = useCallback(async (query: string) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await contactService.searchContacts(query);
      setContacts(data);
    } catch (err) {
      console.error('Erreur lors de la recherche de contacts:', err);
      setError('Impossible de rechercher les contacts');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Crée un nouveau contact
   */
  const createContact = useCallback(async (contactData: ContactCreate) => {
    try {
      const newContact = await contactService.createContact(contactData);
      setContacts(prev => [newContact, ...prev]);
      return newContact;
    } catch (err) {
      console.error('Erreur lors de la création du contact:', err);
      throw err;
    }
  }, []);

  /**
   * Met à jour un contact
   */
  const updateContact = useCallback(async (id: number, contactData: ContactUpdate) => {
    try {
      const updated = await contactService.updateContact(id, contactData);
      setContacts(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du contact:', err);
      throw err;
    }
  }, []);

  /**
   * Supprime un contact
   */
  const deleteContact = useCallback(async (id: number) => {
    try {
      await contactService.deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression du contact:', err);
      throw err;
    }
  }, []);

  /**
   * Gère le changement de la requête de recherche
   */
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Exécute la recherche
   */
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim()) {
      await searchContacts(searchQuery);
    } else {
      await loadContacts();
    }
  }, [searchQuery, searchContacts, loadContacts]);

  /**
   * Recharge la liste des contacts
   */
  const refresh = useCallback(async () => {
    await loadContacts();
  }, [loadContacts]);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadContacts();
    }
  }, [autoLoad, loadContacts]);

  return {
    contacts,
    loading,
    error,
    searchQuery,
    setSearchQuery: handleSearchChange,
    loadContacts,
    searchContacts,
    createContact,
    updateContact,
    deleteContact,
    handleSearch,
    refresh,
  };
}
