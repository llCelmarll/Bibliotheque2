// components/forms/AuthorSelector.tsx
import React from 'react';
import { EntitySelector } from './EntitySelector';
import { Author, AuthorSelectorProps, AuthorMetadata } from '@/types/entityTypes';

const AUTHOR_CONFIG = {
	entityType: 'author' as const,
	multiple: true,
	maxSelections: 10,
	placeholder: 'Ajouter un auteur',
	searchEndpoint: '/api/authors/search',
	createEndpoint: '/api/authors',
	icon: undefined,
	label: '👤 Auteurs',
};

export const AuthorSelector: React.FC<AuthorSelectorProps> = ({
	selectedEntities,
	onEntitiesChange,
	disabled = false,
	error
}) => {
	return (
		<EntitySelector<AuthorMetadata>
			selectedEntities={selectedEntities}
			onEntitiesChange={onEntitiesChange}
			config={AUTHOR_CONFIG}
			disabled={disabled}
			error={error}
		/>
	);
};