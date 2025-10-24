// services/api/types.ts
export interface BookRead {
	id: string;
	title: string;
	isbn?: string;
	publishedDate?: string;
	pageCount?: number;
	barcode?: string;
	coverUrl?: string;
	createdAt?: string;
	authors?: AuthorRead[];
	publisher?: PublisherRead;
	genres?: GenreRead[];
}

export interface BookCreate {
	title: string;
	isbn?: string
	publishedDate?: string;
	pageCount?: number;
	barcode?: string;
	coverUrl?: string;
	authors?: (AuthorCreate | AuthorRead)[];
	publisher?: PublisherCreate | PublisherRead;
	genres?: (GenreCreate | GenreRead)[];
}

// Nouveau type pour le livre suggéré dans le scan - correspond au backend
export interface SuggestedBook {
	isbn?: string;
	title?: string;
	published_date?: string;
	page_count?: number;
	barcode?: string;
	cover_url?: string;
	authors: string[];
	publisher?: string;
	genres: string[];
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
