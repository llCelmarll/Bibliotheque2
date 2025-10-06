import axios from 'axios';
import { API_URL } from "@/constants/api";
import { FilterType, BookFilter } from "@/types/filter";
import { Author, Publisher, Genre } from "@/types/book";

/**
 * Récupère la liste des auteurs pour le filtre
* @returns {Promise<Author[]>} Liste des auteurs
 */

export async function fetchAuthors(): Promise<Author[]> {
	try{
		const response = await axios.get(`${API_URL}/authors`);
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
		const response = await axios.get(`${API_URL}/publishers`);
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
		const response = await axios.get(`${API_URL}/genres`);
		return response.data;
	} catch (error) {
		console.error("Erreur lors de la récupération des genres :", error);
		return [];
	}
}

/**
 * Récupère tous les filtres disponibles
 * @returns {Promise<{authors: Author[], publishers: Publisher[], genres: Genre[]}>}
 */
export async function fetchAllFilters() {
	try {
		const [authors, publishers, genres] = await Promise.all([
			fetchAuthors(),
			fetchPublishers(),
			fetchGenres()
		]);
		return { authors, publishers, genres };
	} catch (error) {
		console.error("Erreur lors de la récupération des filtes:", error);
		return { authors: [], publishers: [], genres: []}
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
	item: Author | Publisher | Genre
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