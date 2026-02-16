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

export interface FetchBooksParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    order?: "asc" | "desc";
    searchQuery?: string;
    filters?: BookFilter[];
    isRead?: boolean | null;
    ratingMin?: number | null;
}

export interface FetchBooksAdvancedParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    order?: "asc" | "desc";
    title?: string;
    author?: string;
    publisher?: string;
    genre?: string;
    isbn?: string;
    yearMin?: number | null;
    yearMax?: number | null;
    pageMin?: number | null;
    pageMax?: number | null;
    isRead?: boolean | null;
    ratingMin?: number | null;
    notes?: string;
}

const PAGE_SIZE = 50;

/**
 * Récupère une liste de livres avec pagination et tri (recherche simple)
 */
export async function fetchBooks({
        page = 1,
        pageSize = PAGE_SIZE,
        sortBy = "title",
        order = "asc",
        searchQuery = "",
        filters = [],
        isRead,
        ratingMin,
}: FetchBooksParams = {}): Promise<Book[]> {
    const skip = (page - 1) * pageSize;
    const endpoint = `${API_CONFIG.ENDPOINTS.BOOKS}/search/simple`;

    try {
        const params: Record<string, string | number | boolean | undefined> = {
            q: searchQuery,
            skip,
            limit: pageSize,
            sort_by: sortBy,
            sort_order: order,
        };
        if (isRead !== undefined && isRead !== null) params.is_read = isRead;
        if (ratingMin !== undefined && ratingMin !== null) params.rating_min = ratingMin;

        const res = await apiClient.post(
            endpoint,
            (filters ?? []).map(f => ({
                type: f.type.toLowerCase(),
                id: f.id
            })),
            { params }
        );
        return res.data;
    } catch (error) {
        console.error("Erreur lors de la requête:", error);
        throw error;
    }
}

/**
 * Recherche avancée avec critères détaillés (GET /books/search/advanced)
 */
export async function fetchBooksAdvanced({
        page = 1,
        pageSize = PAGE_SIZE,
        sortBy = "title",
        order = "asc",
        title,
        author,
        publisher,
        genre,
        isbn,
        yearMin,
        yearMax,
        pageMin,
        pageMax,
        isRead,
        ratingMin,
        notes,
}: FetchBooksAdvancedParams = {}): Promise<Book[]> {
    const skip = (page - 1) * pageSize;
    const endpoint = `${API_CONFIG.ENDPOINTS.BOOKS}/search/advanced`;

    try {
        const params: Record<string, string | number | boolean | undefined> = {
            skip,
            limit: pageSize,
            sort_by: sortBy,
            sort_order: order,
        };
        if (title != null && title !== "") params.title = title;
        if (author != null && author !== "") params.author = author;
        if (publisher != null && publisher !== "") params.publisher = publisher;
        if (genre != null && genre !== "") params.genre = genre;
        if (isbn != null && isbn !== "") params.isbn = isbn;
        if (yearMin != null) params.year_min = yearMin;
        if (yearMax != null) params.year_max = yearMax;
        if (pageMin != null) params.page_min = pageMin;
        if (pageMax != null) params.page_max = pageMax;
        if (isRead !== undefined && isRead !== null) params.is_read = isRead;
        if (ratingMin !== undefined && ratingMin !== null) params.rating_min = ratingMin;
        if (notes != null && notes !== "") params.notes = notes;

        const res = await apiClient.get(endpoint, { params });
        return res.data;
    } catch (error) {
        console.error("Erreur lors de la recherche avancée:", error);
        throw error;
    }
}


