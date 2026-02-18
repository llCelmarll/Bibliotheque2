import axios from 'axios';
import API_CONFIG from '@/config/api';
import {
    UserLoanRequest,
    UserLoanRequestCreate,
    UserLoanRequestAccept,
    UserLoanRequestDecline,
    LibraryPage,
} from '@/types/userLoanRequest';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';

const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

setupAuthInterceptor(apiClient);

class UserLoanRequestService {

    async getIncoming(): Promise<UserLoanRequest[]> {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.USER_LOANS}/incoming`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur getIncoming:', error);
            throw error;
        }
    }

    async getOutgoing(): Promise<UserLoanRequest[]> {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.USER_LOANS}/outgoing`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur getOutgoing:', error);
            throw error;
        }
    }

    async getPendingCount(): Promise<number> {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.USER_LOANS}/incoming/count`);
            return response.data.count;
        } catch (error) {
            console.error('❌ Erreur getPendingCount:', error);
            throw error;
        }
    }

    async getById(id: number): Promise<UserLoanRequest> {
        try {
            const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.USER_LOANS}/${id}`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur getById:', error);
            throw error;
        }
    }

    async create(data: UserLoanRequestCreate): Promise<UserLoanRequest> {
        try {
            const response = await apiClient.post(API_CONFIG.ENDPOINTS.USER_LOANS, data);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur create:', error);
            throw error;
        }
    }

    async accept(id: number, data?: UserLoanRequestAccept): Promise<UserLoanRequest> {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.USER_LOANS}/${id}/accept`, data || {});
            return response.data;
        } catch (error) {
            console.error('❌ Erreur accept:', error);
            throw error;
        }
    }

    async decline(id: number, data?: UserLoanRequestDecline): Promise<UserLoanRequest> {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.USER_LOANS}/${id}/decline`, data || {});
            return response.data;
        } catch (error) {
            console.error('❌ Erreur decline:', error);
            throw error;
        }
    }

    async cancel(id: number): Promise<UserLoanRequest> {
        try {
            const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.USER_LOANS}/${id}/cancel`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur cancel:', error);
            throw error;
        }
    }

    async returnBook(id: number): Promise<UserLoanRequest> {
        try {
            const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.USER_LOANS}/${id}/return`);
            return response.data;
        } catch (error) {
            console.error('❌ Erreur returnBook:', error);
            throw error;
        }
    }

    async getUserLibrary(
        userId: number,
        params?: { search?: string; skip?: number; limit?: number }
    ): Promise<LibraryPage> {
        try {
            const response = await apiClient.get(API_CONFIG.ENDPOINTS.USER_LIBRARY(userId), { params });
            return response.data;
        } catch (error) {
            console.error('❌ Erreur getUserLibrary:', error);
            throw error;
        }
    }
}

export const userLoanRequestService = new UserLoanRequestService();
