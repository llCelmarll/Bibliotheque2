/**
 * Représente un auteur de livre
 * @interface Author
 * @property {number} id - Identifiant unique de l'auteur
 * @property {string} name - Nom de l'auteur
 */
export interface Author {
    id: number;
    name: string;
}

/**
 * Représente un éditeur de livre
 * @interface Publisher
 * @property {number} id - Identifiant unique de l'éditeur
 * @property {string} name - Nom de l'éditeur
 */
export interface Publisher {
    id: number;
    name: string;
}

/**
 * Représente un genre littéraire
 * @interface Genre
 * @property {number} id - Identifiant unique du genre
 * @property {string} name - Nom du genre
 */
export interface Genre {
    id: number;
    name: string;
}

/**
 * Représente un livre avec toutes ses propriétés
 * @interface Book
 * @property {number} id - Identifiant unique du livre
 * @property {string} title - Titre du livre
 * @property {string} [isbn] - ISBN du livre (optionnel)
 * @property {string} [published_date] - Date de publication (optionnel)
 * @property {number} [page_count] - Nombre de pages (optionnel)
 * @property {Author[]} [authors] - Liste des auteurs (optionnel)
 * @property {Publisher} [publisher] - Éditeur du livre (optionnel)
 * @property {string} [cover_url] - URL de la couverture du livre (optionnel)
 * @property {Genre[]} [genres] - Liste des genres du livre
 * @property {string} [created_at] - Date d'integration du livre à la bibliothèque
 * @property {string} [updated_at] - Date de dernière modification du livre
 */
export interface Book {
    id: number;
    title: string;
    isbn?: string;
    published_date?: string;
    page_count?: number;
    authors?: Author[];
    publisher?: Publisher;
    cover_url?: string;
	genres?: Genre[];
	created_at?: string;
	updated_at?: string;
}