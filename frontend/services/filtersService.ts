import axios from 'axios';
import API_CONFIG from "@/config/api";
import { FilterType, BookFilter } from "@/types/filter";
import { Author, Publisher, Genre, BookSeries } from "@/types/book";

// Configuration de base pour axios
const apiClient = axios.create({
	baseURL: API_CONFIG.BASE_URL,
	timeout: 10000, // 10 secondes
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * Récupère la liste des auteurs pour le filtre
* @returns {Promise<Author[]>} Liste des auteurs
 */

export async function fetchAuthors(): Promise<Author[]> {
	try{
		const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTHORS);
		return response.data;
	} catch (error) {
		console.error("Erreur lors de la récupération des auteurs :", error);
		return [];
	}
}

/**
 * Récupère la liste des éditeurs pour le filtre
 * @returns {Promise <Publisher[]>} Liste des éditeurs
 */
export async function fetchPublishers(): Promise<Publisher[]> {
	try {
		const response = await apiClient.get(API_CONFIG.ENDPOINTS.PUBLISHERS);
		return response.data;
	} catch (error) {
		console.error("Erreur lors de la récupération des éditeurs :", error);
		return [];
	}
}

/**
 * Récupère la liste des genres pour le filtre
 * @returns {Promise <Genre[]>} liste des genres
 */
export async function fetchGenres(): Promise<Genre[]> {
	try {
		const response = await apiClient.get(API_CONFIG.ENDPOINTS.GENRES);
		return response.data;
	} catch (error) {
		console.error("Erreur lors de la récupération des genres :", error);
		return [];
	}
}

/**
 * Récupère la liste des séries pour le filtre
 */
export async function fetchSeries(): Promise<BookSeries[]> {
	try {
		const response = await apiClient.get(API_CONFIG.ENDPOINTS.SERIES);
		return response.data;
	} catch (error) {
		console.error("Erreur lors de la récupération des séries :", error);
		return [];
	}
}

/**
 * Récupère tous les filtres disponibles
 */
export async function fetchAllFilters() {
	try {
		const [authors, publishers, genres, series] = await Promise.all([
			fetchAuthors(),
			fetchPublishers(),
			fetchGenres(),
			fetchSeries()
		]);
		return { authors, publishers, genres, series };
	} catch (error) {
		console.error("Erreur lors de la récupération des filtres:", error);
		return { authors: [], publishers: [], genres: [], series: []}
	}
}

/**
 * Convertit un élément filtrable en BookFilter
 * @param {FilterType} type - Type du filtre
 * @param {Author | Publisher | Genre} item - élément à convertir
 * @returns {BookFilter} Filtre formaté
 */
export function createFilter(
	type: FilterType,
	item: Author | Publisher | Genre | BookSeries | { id: number; name: string }
): BookFilter {
	return {
		type,
		id: item.id,
		name: item.name
	};
}

/** Vérifie si un filtre est actif
 * @param {BookFilter[]} activeFilters - Liste des filtres actifs
 * @param {FilterType} type - Type du filtre à vérifier
 * @param {number} id - ID de lélément à vérifier
 * @returns {boolean} True si le filtre est actif
 */
export function isFilterActive(
	activeFilters: BookFilter[],
	type: FilterType,
	id: number
): boolean {
	return activeFilters.some(
		(filter) => filter.type === type && filter.id === id
	);
}