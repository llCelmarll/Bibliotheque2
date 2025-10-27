// services/booksService.ts
import axios from "axios";
import API_CONFIG from "@/config/api";
import { Book } from "@/types/book";
import { BookFilter } from "@/types/filter";
import { setupAuthInterceptor } from "@/services/api/authInterceptor";

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

interface FetchBooksParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    order?: "asc" | "desc";
    searchQuery?: string;
    filters?: BookFilter[];
}

const PAGE_SIZE = 50;

/**
 * Récupère une liste de livres avec pagination et tri
 * @param {FetchBooksParams} params - Parametres de la requete
 * @returns {Promise<Book[]>} Liste des livres
 */
export async function fetchBooks({
        page = 1,
        pageSize = PAGE_SIZE,
        sortBy = "title",
        order = "asc",
        searchQuery = "",
        filters = [],
 } : FetchBooksParams = {}): Promise<Book[]> {
    const skip = (page - 1) * pageSize;
    const endpoint = `${API_CONFIG.ENDPOINTS.BOOKS}/search/simple`;

    try {
        const res = await apiClient.post(
            endpoint,
            filters.map(f => ({
                type: f.type.toLowerCase(),
                id: f.id
            })),
            {
            params: {
                q: searchQuery,
                skip,
                limit: pageSize,
                sort_by: sortBy,
                sort_order: order,

            },
        });
        return res.data;
    } catch (error) {
        console.error("Erreur lors de la requête:", error);
        throw error;
    }
}


