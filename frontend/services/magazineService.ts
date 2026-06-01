import axios from 'axios';
import { Platform } from 'react-native';
import API_CONFIG from '@/config/api';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';
import {
    MagazineSeries, MagazineSeriesCreate, MagazineSeriesUpdate,
    MagazineIssue, MagazineIssueCreate, MagazineIssueUpdate,
    MagazineIssueBulkCreate, MagazineLoanCreate,
} from '@/types/magazine';

const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});
setupAuthInterceptor(apiClient);

class MagazineService {

    // ── Series ────────────────────────────────────────────────────────────────

    async getAllSeries(): Promise<MagazineSeries[]> {
        const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.MAGAZINE_SERIES}`, {
            params: { limit: 1000 },
        });
        return response.data;
    }

    async getSeriesById(seriesId: number): Promise<MagazineSeries> {
        const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.MAGAZINE_SERIES}/${seriesId}`);
        return response.data;
    }

    async createSeries(data: MagazineSeriesCreate): Promise<MagazineSeries> {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.MAGAZINE_SERIES, data);
        return response.data;
    }

    async updateSeries(seriesId: number, data: MagazineSeriesUpdate): Promise<MagazineSeries> {
        const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.MAGAZINE_SERIES}/${seriesId}`, data);
        return response.data;
    }

    async deleteSeries(seriesId: number): Promise<void> {
        await apiClient.delete(`${API_CONFIG.ENDPOINTS.MAGAZINE_SERIES}/${seriesId}`);
    }

    async uploadSeriesCover(seriesId: number, imageUri: string): Promise<string> {
        const formData = new FormData();
        if (Platform.OS === 'web') {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            formData.append('file', blob, 'cover.jpg');
        } else {
            formData.append('file', { uri: imageUri, name: 'cover.jpg', type: 'image/jpeg' } as any);
        }
        const response = await apiClient.post(
            `${API_CONFIG.ENDPOINTS.MAGAZINE_SERIES}/${seriesId}/cover`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data.cover_url;
    }

    // ── Issues ────────────────────────────────────────────────────────────────

    async getIssuesBySeries(seriesId: number): Promise<MagazineIssue[]> {
        const response = await apiClient.get(
            `${API_CONFIG.ENDPOINTS.MAGAZINE_SERIES}/${seriesId}/issues`,
            { params: { limit: 1000 } },
        );
        return response.data;
    }

    async getIssueById(issueId: number): Promise<MagazineIssue> {
        const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.MAGAZINE_ISSUES}/${issueId}`);
        return response.data;
    }

    async createIssue(data: MagazineIssueCreate): Promise<MagazineIssue> {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.MAGAZINE_ISSUES, data);
        return response.data;
    }

    async bulkCreateIssues(seriesId: number, data: Omit<MagazineIssueBulkCreate, 'series_id'>): Promise<MagazineIssue[]> {
        const response = await apiClient.post(
            `${API_CONFIG.ENDPOINTS.MAGAZINE_SERIES}/${seriesId}/issues/bulk`,
            { ...data, series_id: seriesId },
        );
        return response.data;
    }

    async updateIssue(issueId: number, data: MagazineIssueUpdate): Promise<MagazineIssue> {
        const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.MAGAZINE_ISSUES}/${issueId}`, data);
        return response.data;
    }

    async updateReadStatus(issueId: number, isRead: boolean | null): Promise<MagazineIssue> {
        const response = await apiClient.patch(
            `${API_CONFIG.ENDPOINTS.MAGAZINE_ISSUES}/${issueId}/read-status`,
            { is_read: isRead },
        );
        return response.data;
    }

    async deleteIssue(issueId: number): Promise<void> {
        await apiClient.delete(`${API_CONFIG.ENDPOINTS.MAGAZINE_ISSUES}/${issueId}`);
    }

    async uploadIssueCover(issueId: number, imageUri: string): Promise<string> {
        const formData = new FormData();
        if (Platform.OS === 'web') {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            formData.append('file', blob, 'cover.jpg');
        } else {
            formData.append('file', { uri: imageUri, name: 'cover.jpg', type: 'image/jpeg' } as any);
        }
        const response = await apiClient.post(
            `${API_CONFIG.ENDPOINTS.MAGAZINE_ISSUES}/${issueId}/cover`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data.cover_url;
    }

    // ── Loans ─────────────────────────────────────────────────────────────────

    async createLoan(data: MagazineLoanCreate): Promise<any> {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.MAGAZINE_LOANS, data);
        return response.data;
    }

    async returnLoan(loanId: number): Promise<any> {
        const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.MAGAZINE_LOANS}/${loanId}/return`, {});
        return response.data;
    }

    async deleteLoan(loanId: number): Promise<void> {
        await apiClient.delete(`${API_CONFIG.ENDPOINTS.MAGAZINE_LOANS}/${loanId}`);
    }
}

export const magazineService = new MagazineService();
