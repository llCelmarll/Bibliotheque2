import { AuthorCreate, AuthorRead, PublisherCreate, PublisherRead, GenreCreate, GenreRead, SeriesCreate, SeriesRead } from './scanTypes';
import { LoanStatus } from './loan';
import { BorrowedBook } from './borrowedBook';

/**
 * Prêt simplifié pour éviter les dépendances circulaires
 * (sans le champ book)
 */
export interface CurrentLoan {
    id: number;
    contact_id: number;
    contact?: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
    };
    loan_date: string;
    due_date?: string;
    return_date?: string;
    status: LoanStatus;
    notes?: string;
}

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
 * Représente une série de livres avec numéro de tome optionnel
 */
export interface BookSeries {
    id: number;
    name: string;
    volume_number?: number;
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
 * @property {CurrentLoan} [current_loan] - Prêt actif si le livre est prêté
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
	is_read?: boolean | null;
	read_date?: string;
	genres?: Genre[];
	series?: BookSeries[];
	created_at?: string;
	updated_at?: string;
	current_loan?: CurrentLoan;
}

export interface BookBase {
    id: number;
    title: string;
    isbn: string;
    publisher?: Publisher;
    authors?: Author[];
    genres?: Genre[];
    series?: BookSeries[];
    published_date: string;
    page_count?: number;
    cover_url: string | null;
    is_read: boolean | null;
    read_date?: string | null;
    publisher_id: number;
    barcode: string | null;
    genre_id: number | null;
    created_at: string;
    updated_at: string | null;
    current_loan?: CurrentLoan;
    borrowed_book?: BorrowedBook;
    has_borrow_history?: boolean;
}

export interface GoogleBooksData {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    categories?: string[];
    imageLinks?: {
        smallThumbnail?: string;
        thumbnail?: string;
    };
    language?: string;
    pageCount?: number;
    subtitle?: string;
    infoLink?: string;
}

export interface OpenLibraryData {
    other_titles: string[];
    publishers: string[];
    description: {
        value: string;
    };
    publish_places: string[];
    subjects: string[];
    contributors: Contributor[] | string[];
    number_of_pages: number;
    publish_date: string;
    by_statement: string;
    links: Array<{
        title: string;
        url: string;
    }>;
    key: string;
}

type Contributor = {
    role: string;
    name: string;
} | string;

export interface BookDetail {
    base: BookBase;
    google_books: GoogleBooksData;
    open_library: OpenLibraryData;
}

/**
 * Interface pour les données de modification d'un livre
 * Supporte maintenant les objets d'entités comme BookCreate
 */
export interface BookUpdate {
    title?: string;
    isbn?: string;
    published_date?: string;
    page_count?: number;
    barcode?: string;
    cover_url?: string;
    is_read?: boolean | null;
    read_date?: string | null;
    authors?: (AuthorCreate | AuthorRead)[];
    publisher?: PublisherCreate | PublisherRead;
    genres?: (GenreCreate | GenreRead)[];
    series?: (SeriesCreate | SeriesRead | { id: number; name: string; volume_number?: number })[];
}