// services/booksService.ts
import axios from "axios";
import { API_URL } from "@/constants/api";
import { Book } from "@/types/book";
import { FilterType } from "@/types/filter";

const PAGE_SIZE = 50;

/**
 * Récupère une liste de livres avec pagination et tri
 * @param {number} page - Numéro de la page à récupérer
 * @param {number} pageSize - Nombre d'éléments par page
 * @param {string} sortBy - Champ de tri
 * @param {("asc"|"desc")} order - Ordre de tri
 * @param {string} searchQuery - Terme de recherche
 * @returns {Promise<Book[]>} Liste des livres
 */
export async function fetchBooks(
    page: number = 1,
    pageSize: number = PAGE_SIZE,
    sortBy: string = "title",
    order: "asc" | "desc" = "asc",
    searchQuery: string = ""
): Promise<Book[]> {
    const skip = (page - 1) * pageSize;
    const endpoint = searchQuery
        ? `${API_URL}/books/search/simple`
        : `${API_URL}/books/`;

    try {
        const res = await axios.get(endpoint, {
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

/**
 * Récupère les livres filtrés par type et ID
 * @param {FilterType} type - Type de filtre
 * @param {number} id - Identifiant du filtre
 * @returns {Promise<Book[]>} Liste des livres filtrés
 */
export async function fetchBooksBy(
    type: FilterType,
    id: number
): Promise<Book[]> {
    if (!type || !id) {
        console.error("Type ou ID manquant dans fetchBooksBy");
        return [];
    }

    let endpoint = `${API_URL}/books/`;

    if (type === "author") {
        endpoint += `by-author/${id}`;
    } else if (type === "publisher") {
        endpoint += `by-publisher/${id}`;
    } else if (type === "genre") {
        endpoint += `by-genre/${id}`;
    }

    try {
        const res = await axios.get(endpoint);
        return res.data;
    } catch (error) {
        console.error("Erreur lors de la requête:", error);
        throw error;
    }
}