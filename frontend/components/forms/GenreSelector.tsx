// components/forms/GenreSelector.tsx
import React from 'react';
import { EntitySelector } from './EntitySelector';
import { Entity, GenreMetadata } from '@/types/entityTypes';

interface GenreSelectorProps {
	selectedEntities: Entity<GenreMetadata>[];
	onEntitiesChange: (entities: Entity<GenreMetadata>[]) => void;
	disabled?: boolean;
	error?: string;
}

const GENRE_CONFIG = {
	entityType: 'genre' as const,
	multiple: true, // Sélection multiple pour les genres
	maxSelections: 5,
	placeholder: 'Ajouter un genre',
	searchEndpoint: '/api/genres/search',
	createEndpoint: '/api/genres',
	icon: undefined,
	label: '🏷️ Genres',
};

export const GenreSelector: React.FC<GenreSelectorProps> = ({
	selectedEntities,
	onEntitiesChange,
	disabled = false,
	error
}) => {
	return (
		<EntitySelector<GenreMetadata>
			selectedEntities={selectedEntities}
			onEntitiesChange={onEntitiesChange}
			config={GENRE_CONFIG}
			disabled={disabled}
			error={error}
		/>
	);
};