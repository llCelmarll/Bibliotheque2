// services/borrowedBookService.ts
import axios from 'axios';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';
import { BorrowedBook, BorrowedBookCreate, BorrowedBookUpdate, BorrowStatistics } from '@/types/borrowedBook';
import API_CONFIG from '@/config/api';

// Créer client axios avec intercepteur d'authentification
const apiClient = axios.create({
	baseURL: API_CONFIG.BASE_URL,
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Ajouter l'intercepteur (gère automatiquement le token)
setupAuthInterceptor(apiClient);

// Lister tous les emprunts
export const fetchBorrowedBooks = async (): Promise<BorrowedBook[]> => {
	const response = await apiClient.get('/borrowed-books');
	return response.data;
};

// Lister emprunts actifs uniquement
export const fetchActiveBorrowedBooks = async (): Promise<BorrowedBook[]> => {
	const response = await apiClient.get('/borrowed-books/active');
	return response.data;
};

// Récupérer un emprunt par ID
export const getBorrowedBookById = async (id: number): Promise<BorrowedBook> => {
	const response = await apiClient.get(`/borrowed-books/${id}`);
	return response.data;
};

// Créer emprunt
export const createBorrowedBook = async (data: BorrowedBookCreate): Promise<BorrowedBook> => {
	const response = await apiClient.post('/borrowed-books', data);
	return response.data;
};

// Retourner livre emprunté
export const returnBorrowedBook = async (id: number): Promise<BorrowedBook> => {
	const response = await apiClient.put(`/borrowed-books/${id}/return`, {});
	return response.data;
};

// Modifier un emprunt
export const updateBorrowedBook = async (id: number, data: BorrowedBookUpdate): Promise<BorrowedBook> => {
	const response = await apiClient.put(`/borrowed-books/${id}`, data);
	return response.data;
};

// Statistiques
export const fetchBorrowStatistics = async (): Promise<BorrowStatistics> => {
	const response = await apiClient.get('/borrowed-books/statistics');
	return response.data;
};

// Lister emprunts par contact
export const fetchBorrowsByContact = async (contactId: number): Promise<BorrowedBook[]> => {
	const response = await apiClient.get(`/borrowed-books/by-contact/${contactId}`);
	return response.data;
};

// Supprimer emprunt
export const deleteBorrowedBook = async (id: number): Promise<void> => {
	await apiClient.delete(`/borrowed-books/${id}`);
};

// Mettre à jour calendar_event_id
export const updateCalendarEventId = async (id: number, calendarEventId: string | null): Promise<BorrowedBook> => {
	console.log('📅 Mise à jour calendar_event_id - ID emprunt:', id, 'eventId:', calendarEventId);

	try {
		const response = await apiClient.put(`/borrowed-books/${id}`, {
			calendar_event_id: calendarEventId
		});
		console.log('✅ calendar_event_id mis à jour avec succès');
		return response.data;
	} catch (error) {
		console.error('❌ Erreur lors de la mise à jour du calendar_event_id:', error);
		throw error;
	}
};

// Export default pour utilisation cohérente
export const borrowedBookService = {
	fetchBorrowedBooks,
	fetchActiveBorrowedBooks,
	getBorrowedBookById,
	createBorrowedBook,
	updateBorrowedBook,
	returnBorrowedBook,
	fetchBorrowStatistics,
	fetchBorrowsByContact,
	deleteBorrowedBook,
	updateCalendarEventId,
};
