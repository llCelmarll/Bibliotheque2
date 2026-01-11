import {useState, useEffect} from "react";
import API_CONFIG from "@/config/api";
import axios from "axios";
import {BookDetail} from "@/types/book";
import { setupAuthInterceptor } from "@/services/api/authInterceptor";

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

export function useBookDetail(bookId: string) {
	const [book, setBook] = useState(<BookDetail | null>(null));
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchBookDetail = async () => {
		try{
			setLoading(true);
			const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}`);
			setBook(response.data);
			setError(null);
		} catch (error) {
			setError("Impossible de charger les détails du livre: " + error);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchBookDetail();
	}, [bookId])

	return {book, loading, error, refetch: fetchBookDetail}
}