import {useState, useEffect} from "react";
import API_CONFIG from "@/config/api";
import axios from "axios";
import {BookDetail} from "@/types/book";

export function useBookDetail(bookId: string) {
	const [book, setBook] = useState(<BookDetail | null>(null));
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchBookDetail = async () => {
		try{
			setLoading(true);
			const response = await axios.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}`);
			setBook(response.data);
			console.log(response.data);
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