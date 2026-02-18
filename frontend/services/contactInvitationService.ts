import axios from 'axios';
import API_CONFIG from '@/config/api';
import { ContactInvitation, ContactInvitationCreate } from '@/types/contactInvitation';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';

const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

setupAuthInterceptor(apiClient);

class ContactInvitationService {

    async getReceived(): Promise<ContactInvitation[]> {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.CONTACT_INVITATIONS}/received`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur getReceived:', error);
            throw error;
        }
    }

    async getSent(): Promise<ContactInvitation[]> {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.CONTACT_INVITATIONS}/sent`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur getSent:', error);
            throw error;
        }
    }

    async getPendingCount(): Promise<number> {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.CONTACT_INVITATIONS}/received/count`);
            return response.data.count;
        } catch (error) {
            console.error('❌ Erreur getPendingCount:', error);
            throw error;
        }
    }

    async send(data: ContactInvitationCreate): Promise<ContactInvitation> {
        try {
            const response = await apiClient.post(API_CONFIG.ENDPOINTS.CONTACT_INVITATIONS, data);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur send:', error);
            throw error;
        }
    }

    async accept(id: number): Promise<ContactInvitation> {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.CONTACT_INVITATIONS}/${id}/accept`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur accept:', error);
            throw error;
        }
    }

    async decline(id: number): Promise<ContactInvitation> {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.CONTACT_INVITATIONS}/${id}/decline`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur decline:', error);
            throw error;
        }
    }

    async cancel(id: number): Promise<ContactInvitation> {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.CONTACT_INVITATIONS}/${id}/cancel`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur cancel:', error);
            throw error;
        }
    }

    async searchUsers(query: string): Promise<{ id: number; username: string }[]> {
        try {
            const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS_SEARCH, { params: { q: query } });
            return response.data;
        } catch (error) {
            console.error('❌ Erreur searchUsers:', error);
            throw error;
        }
    }
}

export const contactInvitationService = new ContactInvitationService();
