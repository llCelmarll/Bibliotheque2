// components/forms/PublisherSelector.tsx
import React from 'react';
import { EntitySelector } from './EntitySelector';
import { Entity, PublisherMetadata } from '@/types/entityTypes';

interface PublisherSelectorProps {
	selectedEntities: Entity<PublisherMetadata>[];
	onEntitiesChange: (entities: Entity<PublisherMetadata>[]) => void;
	disabled?: boolean;
	error?: string;
}

const PUBLISHER_CONFIG = {
	entityType: 'publisher' as const,
	multiple: false, // Sélection simple pour les éditeurs
	maxSelections: 1,
	placeholder: 'Sélectionner un éditeur',
	searchEndpoint: '/api/publishers/search',
	createEndpoint: '/api/publishers',
	icon: undefined,
	label: '🏢 Éditeur',
};

export const PublisherSelector: React.FC<PublisherSelectorProps> = ({
	selectedEntities,
	onEntitiesChange,
	disabled = false,
	error
}) => {
	return (
		<EntitySelector<PublisherMetadata>
			selectedEntities={selectedEntities}
			onEntitiesChange={onEntitiesChange}
			config={PUBLISHER_CONFIG}
			disabled={disabled}
			error={error}
		/>
	);
};