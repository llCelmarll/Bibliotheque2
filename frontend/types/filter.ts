// types/filter.ts
/**
 * Types de filtres disponibles pour les livres
 * @typedef {("author" | "genre" | "publisher")} FilterType
 */
export type FilterType = "author" | "genre" | "publisher" | "series";

/**
 * Représente un filtre actif
 * @interface BookFilter
 * @property {FilterType} type - Type du filtre (auteur, genre ou éditeur)
 * @property {number} id - Identifiant de l'élément filtré
 * @property {string} [name] - Nom lisible du filtre (optionnel)
 */
export interface BookFilter {
    type: FilterType;
    id: number;
    name?: string;
}