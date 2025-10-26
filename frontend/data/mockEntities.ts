// data/mockEntities.ts
import { Author, Publisher, Genre } from '@/types/entityTypes';

export const MOCK_AUTHORS: Author[] = [
	{
		id: 1,
		name: "Victor Hugo",
		exists: true,
		metadata: { bookCount: 45, isPopular: true }
	},
	{
		id: 2,
		name: "J.K. Rowling",
		exists: true,
		metadata: { bookCount: 12, isPopular: true }
	},
	{
		id: 3,
		name: "George Orwell",
		exists: true,
		metadata: { bookCount: 8, isPopular: true }
	},
	{
		id: 4,
		name: "Agatha Christie",
		exists: true,
		metadata: { bookCount: 33, isPopular: true }
	},
	{
		id: 5,
		name: "Jules Verne",
		exists: true,
		metadata: { bookCount: 22, isPopular: true }
	},
	{
		id: 6,
		name: "Stephen King",
		exists: true,
		metadata: { bookCount: 18, isPopular: true }
	},
	{
		id: 7,
		name: "Isaac Asimov",
		exists: true,
		metadata: { bookCount: 15, isPopular: true }
	},
	{
		id: 8,
		name: "Tolkien",
		exists: true,
		metadata: { bookCount: 6, isPopular: true }
	}
];

export const MOCK_PUBLISHERS: Publisher[] = [
	{
		id: 1,
		name: "Gallimard",
		exists: true,
		metadata: { bookCount: 156, country: "France" }
	},
	{
		id: 2,
		name: "Le Livre de Poche",
		exists: true,
		metadata: { bookCount: 89, country: "France" }
	},
	{
		id: 3,
		name: "Flammarion",
		exists: true,
		metadata: { bookCount: 67, country: "France" }
	},
	{
		id: 4,
		name: "Penguin Books",
		exists: true,
		metadata: { bookCount: 234, country: "UK" }
	},
	{
		id: 5,
		name: "Hachette",
		exists: true,
		metadata: { bookCount: 123, country: "France" }
	},
	{
		id: 6,
		name: "Seuil",
		exists: true,
		metadata: { bookCount: 78, country: "France" }
	}
];

export const MOCK_GENRES: Genre[] = [
	{
		id: 1,
		name: "Roman",
		exists: true,
		metadata: { bookCount: 345, isMainGenre: true }
	},
	{
		id: 2,
		name: "Science-Fiction",
		exists: true,
		metadata: { bookCount: 89, isMainGenre: true }
	},
	{
		id: 3,
		name: "Fantasy",
		exists: true,
		metadata: { bookCount: 76, isMainGenre: true }
	},
	{
		id: 4,
		name: "Thriller",
		exists: true,
		metadata: { bookCount: 112, isMainGenre: true }
	},
	{
		id: 5,
		name: "Policier",
		exists: true,
		metadata: { bookCount: 134, isMainGenre: true }
	},
	{
		id: 6,
		name: "Biographie",
		exists: true,
		metadata: { bookCount: 45, isMainGenre: false }
	},
	{
		id: 7,
		name: "Histoire",
		exists: true,
		metadata: { bookCount: 67, isMainGenre: false }
	},
	{
		id: 8,
		name: "Essai",
		exists: true,
		metadata: { bookCount: 56, isMainGenre: false }
	},
	{
		id: 9,
		name: "Poésie",
		exists: true,
		metadata: { bookCount: 23, isMainGenre: false }
	},
	{
		id: 10,
		name: "Jeunesse",
		exists: true,
		metadata: { bookCount: 178, isMainGenre: true }
	}
];

// Fonction utilitaire pour simuler une recherche
export const mockSearch = <T>(
	items: T[], 
	query: string, 
	getName: (item: T) => string,
	limit: number = 10
): T[] => {
	if (!query || query.length < 2) return items.slice(0, limit);
	
	const lowerQuery = query.toLowerCase();
	return items
		.filter(item => getName(item).toLowerCase().includes(lowerQuery))
		.slice(0, limit);
};

// Fonctions de recherche spécialisées
export const searchMockAuthors = (query: string, limit?: number) => 
	mockSearch(MOCK_AUTHORS, query, (author) => author.name, limit);

export const searchMockPublishers = (query: string, limit?: number) => 
	mockSearch(MOCK_PUBLISHERS, query, (publisher) => publisher.name, limit);

export const searchMockGenres = (query: string, limit?: number) => 
	mockSearch(MOCK_GENRES, query, (genre) => genre.name, limit);