import axios from "axios";
import { API_URL } from "@/constants/api";

export interface Book {
    id: number;
    title: string;
    isbn?: string;
    published_date?: string;
    page_count?: number;
}

export async function fetchBooks(): Promise<Book[]> {
    const res = await axios.get(`${API_URL}/books`);
    return res.data;
}