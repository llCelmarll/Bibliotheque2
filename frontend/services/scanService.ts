// services/api/scanApi.ts
import axios from 'axios';
import {BookRead, BookCreate, ScanResult} from "@/types/scanTypes";
import API_CONFIG from '@/config/api';

// Configuration de base pour axios
const apiClient = axios.create({
	baseURL: API_CONFIG.BASE_URL,
	timeout: 10000, // 10 secondes
	headers: {
		'Content-Type': 'application/json',
	},
});

export const scanApi = {
	async getScanResult(isbn: string): Promise<ScanResult> {
		try {
			const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.SCAN}?isbn=${encodeURIComponent(isbn)}`);
			console.log('Résultat du scan:', response.data);
			return response.data;
		} catch (error) {
			console.error('Erreur API scan:', error);
			if (axios.isAxiosError(error)) {
				const message = error.response?.data?.detail || error.message;
				throw new Error(`Erreur lors du scan: ${message}`);
			}
			throw new Error('Erreur lors de la récupération des données du scan');
		}
	},
};