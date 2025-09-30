import axios from "axios";
import { API_URL } from "@/constants/api";


export interface Author {
    id: number;
    name: string;
}

export interface Publisher {
    id: number;
    name: string;
}

export interface Genre {
    id: number;
    name: string;
}

export interface Book {
    id: number;
    title: string;
    isbn?: string;
    published_date?: string;
    page_count?: number;
    authors?: Author[];
    publisher?: Publisher;
    cover_url?: string;
    genres: Genre[];
}

const PAGE_SIZE = 50;

export async function fetchBooks(
    page: number = 1,
    pageSize: number = PAGE_SIZE,
    sortBy: string = "title",
    order: "asc" | "desc" = "asc",
    searchQuery: string = ""  // Nouveau paramètre pour la recherche
): Promise<Book[]> {
    const skip = (page - 1) * pageSize;
    const endpoint = searchQuery
        ? `${API_URL}/books/search/simple`  // Utiliser l'endpoint de recherche simple
        : `${API_URL}/books/`;  // Endpoint standard pour la liste

    try {
        const res = await axios.get(endpoint, {
            params: {
                q: searchQuery,  // Ajout du paramètre pour la recherche
                skip,
                limit: pageSize,
                sort_by: sortBy,
                sort_order: order,
            },
        });
        console.log("Données reçues:", res.data);
        return res.data;
    } catch (error) {
        console.error("Erreur lors de la requête:", error);
        throw error;
    }
}