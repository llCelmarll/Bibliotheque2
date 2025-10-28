// services/api/scanApi.ts
import axios from 'axios';
import {BookRead, BookCreate, ScanResult} from "@/types/scanTypes";
import API_CONFIG from '@/config/api';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';

// Configuration de base pour axios
const apiClient = axios.create({
	baseURL: API_CONFIG.BASE_URL,
	timeout: 10000, // 10 secondes
	headers: {
		'Content-Type': 'application/json',
	},
});

// Ajouter l'intercepteur d'authentification
setupAuthInterceptor(apiClient);

export const scanApi = {
	async getScanResult(isbn: string): Promise<ScanResult> {
		try {
			console.log('🔍 Début du scan pour ISBN:', isbn);
			console.log('🔗 URL complète:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCAN}?isbn=${encodeURIComponent(isbn)}`);
			
			const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.SCAN}?isbn=${encodeURIComponent(isbn)}`);
			console.log('✅ Résultat du scan:', response.data);
			return response.data;
		} catch (error) {
			console.error('❌ Erreur API scan:', error);
			if (axios.isAxiosError(error)) {
				console.error('📝 Détails erreur:', {
					status: error.response?.status,
					statusText: error.response?.statusText,
					data: error.response?.data,
					headers: error.response?.headers
				});
				const message = error.response?.data?.detail || error.message;
				throw new Error(`Erreur lors du scan: ${message}`);
			}
			throw new Error('Erreur lors de la récupération des données du scan');
		}
	},
};