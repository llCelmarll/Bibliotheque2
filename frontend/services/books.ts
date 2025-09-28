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

export interface Book {
    id: number;
    title: string;
    isbn?: string;
    published_date?: string;
    page_count?: number;
    authors?: Author[];
    publisher?: Publisher;
    cover_url?: string;
}

const PAGE_SIZE = 50;

export async function fetchBooks(page: number = 1, pageSize = PAGE_SIZE): Promise<Book[]> {
    const skip = (page - 1) * pageSize;
    try {
        const res = await axios.get(`${API_URL}/books`, {
            params: {
                skip,
                limit: pageSize
            }
        });
        console.log("Données reçues:", res.data);
        return res.data;
    } catch (error) {
        console.error("Erreur lors de la requête:", error);
        throw error;
    }
}