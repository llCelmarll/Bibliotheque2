// types/entityTypes.ts
export type EntityType = 'author' | 'publisher' | 'genre' | 'series';

// Interface générique pour toutes les entités
export interface Entity<T = {}> {
	id: number | null;
	name: string;
	exists: boolean; // true si l'entité existe déjà en BDD, false si nouvelle
	metadata?: T;
}

// Métadonnées spécifiques par type d'entité
export interface AuthorMetadata {
	bookCount?: number;
	isPopular?: boolean;
}

export interface PublisherMetadata {
	bookCount?: number;
	country?: string;
}

export interface GenreMetadata {
	bookCount?: number;
	isMainGenre?: boolean;
}

export interface SeriesMetadata {
	bookCount?: number;
	volume_number?: number;
}

// Types spécialisés (ce sont des alias, pas des extensions)
export type Author = Entity<AuthorMetadata>;
export type Publisher = Entity<PublisherMetadata>;
export type Genre = Entity<GenreMetadata>;
export type Series = Entity<SeriesMetadata>;

// Configuration pour EntitySelector
export interface EntitySelectorConfig {
	entityType: EntityType;
	multiple: boolean;
	maxSelections?: number;
	placeholder: string;
	searchEndpoint?: string;
	createEndpoint?: string;
	icon?: string;  // Icône optionnelle pour éviter la duplication avec les emojis
	label: string;
}

// Props pour les composants de sélection
export interface EntitySelectorProps<T = {}> {
	selectedEntities: Entity<T>[];
	onEntitiesChange: (entities: Entity<T>[]) => void;
	config: EntitySelectorConfig;
	disabled?: boolean;
	error?: string;
}

// Props pour les composants spécialisés
export interface AuthorSelectorProps {
	selectedEntities: Author[];
	onEntitiesChange: (entities: Author[]) => void;
	disabled?: boolean;
	error?: string;
}

export interface PublisherSelectorProps {
	selectedEntities: Publisher[];
	onEntitiesChange: (entities: Publisher[]) => void;
	disabled?: boolean;
	error?: string;
}

export interface GenreSelectorProps {
	selectedEntities: Genre[];
	onEntitiesChange: (entities: Genre[]) => void;
	disabled?: boolean;
	error?: string;
}

export interface SeriesSelectorProps {
	selectedEntities: Series[];
	onEntitiesChange: (entities: Series[]) => void;
	disabled?: boolean;
	error?: string;
}

// Utilitaires pour la conversion
export interface EntitySearchResult<T = {}> {
	results: Entity<T>[];
	total: number;
	hasMore: boolean;
}

export interface EntitySearchParams {
	query: string;
	limit?: number;
	offset?: number;
}