// services/api/types.ts

// Import des types de prêt pour éviter les dépendances circulaires
export interface LoanRead {
	id: number;
	book_id: number;
	borrower_id: number;
	borrower?: {
		id: number;
		name: string;
		email?: string;
		phone?: string;
	};
	loan_date: string;
	due_date?: string;
	return_date?: string;
	notes?: string;
	status: 'active' | 'returned' | 'overdue';
}

export interface BookRead {
	id: string;
	title: string;
	isbn?: string;
	published_date?: string;  // Aligné avec le backend
	page_count?: number;      // Aligné avec le backend
	barcode?: string;
	cover_url?: string;       // Aligné avec le backend
	created_at?: string;      // Aligné avec le backend
	updated_at?: string;      // Aligné avec le backend
	authors?: AuthorRead[];
	publisher?: PublisherRead;
	genres?: GenreRead[];
	current_loan?: LoanRead;  // Prêt actif si le livre est prêté
}

export interface BookCreate {
	title: string;
	isbn?: string;
	published_date?: string;  // Aligné avec le backend
	page_count?: number;      // Aligné avec le backend
	barcode?: string;
	cover_url?: string;       // Aligné avec le backend
	authors?: (number | string | {name: string; id?: number; exists?: boolean})[];
	publisher?: number | string | {name: string; id?: number; exists?: boolean};
	genres?: (number | string | {name: string; id?: number; exists?: boolean})[];
}

// Types enrichis pour les entités suggérées
export interface SuggestedAuthor {
	name: string;
	exists: boolean;
	id?: number;
}

export interface SuggestedPublisher {
	name: string;
	exists: boolean;
	id?: number;
}

export interface SuggestedGenre {
	name: string;
	exists: boolean;
	id?: number;
}

// Nouveau type pour le livre suggéré dans le scan - correspond au backend enrichi
export interface SuggestedBook {
	isbn?: string;
	title?: string;
	published_date?: string;
	page_count?: number;
	barcode?: string;
	cover_url?: string;
	authors: SuggestedAuthor[];
	publisher?: SuggestedPublisher;
	genres: SuggestedGenre[];
}

export interface ScanResult {
	base?: BookRead;
	suggested?: SuggestedBook;  // Changé de BookCreate à SuggestedBook
	title_match: BookRead[];    // Plus nullable
	google_book?: any;
	openlibrary?: any;
}

export interface AuthorRead {
	id: number;
	name: string;
}

export interface AuthorCreate {
	name: string;
}

export interface GenreRead {
	id: number;
	name: string;
}

export interface GenreCreate {
	name: string;
}

export interface PublisherRead {
	id: number;
	name: string;
}

export interface PublisherCreate {
	name: string;
}
