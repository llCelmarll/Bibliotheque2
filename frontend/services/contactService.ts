// services/contactService.ts
import axios from 'axios';
import API_CONFIG from '@/config/api';
import { Contact, ContactCreate, ContactUpdate } from '@/types/contact';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';

// Configuration axios avec intercepteur d'authentification
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter l'intercepteur d'authentification
setupAuthInterceptor(apiClient);

class ContactService {

  /**
   * Récupère tous les contacts de l'utilisateur connecté
   */
  async getAllContacts(): Promise<Contact[]> {
    console.log('📋 Récupération de tous les contacts');

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.CONTACTS}`);
      console.log('✅ Contacts récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des contacts:', error);
      throw error;
    }
  }

  /**
   * Récupère un contact par son ID
   */
  async getContactById(id: number): Promise<Contact> {
    console.log('🔍 Récupération contact - ID:', id);

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.CONTACTS}/${id}`);
      console.log('✅ Contact récupéré:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du contact:', error);
      throw error;
    }
  }

  /**
   * Recherche fuzzy de contacts par nom
   */
  async searchContacts(query: string): Promise<Contact[]> {
    console.log('🔎 Recherche contacts - query:', query);

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.CONTACTS}/search`, {
        params: { query }
      });
      console.log('✅ Résultats de recherche:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de contacts:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau contact
   */
  async createContact(contactData: ContactCreate): Promise<Contact> {
    console.log('➕ Création contact - données:', JSON.stringify(contactData, null, 2));

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.CONTACTS, contactData);
      console.log('✅ Contact créé avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la création du contact:', error);
      throw error;
    }
  }

  /**
   * Met à jour un contact existant
   */
  async updateContact(id: number, contactData: ContactUpdate): Promise<Contact> {
    console.log('📝 Mise à jour contact - ID:', id, 'données:', JSON.stringify(contactData, null, 2));

    try {
      const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.CONTACTS}/${id}`, contactData);
      console.log('✅ Contact mis à jour avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du contact:', error);
      throw error;
    }
  }

  /**
   * Supprime un contact
   */
  async deleteContact(id: number): Promise<void> {
    console.log('🗑️ Suppression contact - ID:', id);

    try {
      await apiClient.delete(`${API_CONFIG.ENDPOINTS.CONTACTS}/${id}`);
      console.log('✅ Contact supprimé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du contact:', error);
      throw error;
    }
  }

  /**
   * Valide les données du contact avant envoi
   */
  validateContactData(contactData: ContactCreate | ContactUpdate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Nom obligatoire pour la création
    if ('name' in contactData && contactData.name !== undefined) {
      if (!contactData.name?.trim()) {
        errors.push('Le nom est obligatoire');
      }
    }

    // Email valide si fourni
    if (contactData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      errors.push('L\'adresse email doit être valide');
    }

    // Téléphone valide si fourni (format flexible)
    if (contactData.phone && !/^[\d\s\-\+\(\)\.]+$/.test(contactData.phone)) {
      errors.push('Le numéro de téléphone contient des caractères invalides');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const contactService = new ContactService();
