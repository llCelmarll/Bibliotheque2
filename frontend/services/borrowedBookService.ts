// services/borrowedBookService.ts
import axios from 'axios';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';
import { BorrowedBook, BorrowedBookCreate, BorrowStatistics } from '@/types/borrowedBook';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Créer client axios avec intercepteur d'authentification
const apiClient = axios.create({
	baseURL: API_URL,
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

// Statistiques
export const fetchBorrowStatistics = async (): Promise<BorrowStatistics> => {
	const response = await apiClient.get('/borrowed-books/statistics');
	return response.data;
};

// Supprimer emprunt
export const deleteBorrowedBook = async (id: number): Promise<void> => {
	await apiClient.delete(`/borrowed-books/${id}`);
};
