// components/forms/EntitySelector.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Entity, EntitySelectorConfig } from '@/types/entityTypes';
import { EntityChip } from './EntityChip';
import { EntitySearchModal } from './EntitySearchModal';
import { useTheme } from '@/contexts/ThemeContext';

interface EntitySelectorProps<T = {}> {
	selectedEntities: Entity<T>[];
	onEntitiesChange: (entities: Entity<T>[]) => void;
	config: EntitySelectorConfig;
	disabled?: boolean;
	error?: string;
}

export const EntitySelector = <T,>({
	selectedEntities,
	onEntitiesChange,
	config,
	disabled = false,
	error
}: EntitySelectorProps<T>) => {
	const theme = useTheme();
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Gestion de l'ouverture de la modal de recherche
	const handleAddEntity = () => {
		if (disabled) return;
		setIsModalOpen(true);
	};

	// Gestion de la sélection d'une entité depuis la modal
	const handleSelectFromModal = (entity: Entity<T>) => {
		if (config.multiple) {
			// Vérifier la limite maximale
			if (config.maxSelections && selectedEntities.length >= config.maxSelections) {
				return;
			}
			// Vérifier si l'entité n'est pas déjà sélectionnée
			const isAlreadySelected = selectedEntities.some(
				existing => existing.name.toLowerCase() === entity.name.toLowerCase()
			);

			if (!isAlreadySelected) {
				onEntitiesChange([...selectedEntities, entity]);
			}
		} else {
			// Mode single : remplacer l'entité existante
			onEntitiesChange([entity]);
		}
	};

	// Gestion de la suppression d'entité
	const handleRemoveEntity = (indexToRemove: number) => {
		if (disabled) return;

		const updatedEntities = selectedEntities.filter((_, index) => index !== indexToRemove);
		onEntitiesChange(updatedEntities);
	};

	// Vérifier si on peut ajouter une nouvelle entité
	const canAddEntity = () => {
		if (disabled) return false;
		if (!config.multiple && selectedEntities.length >= 1) return false;
		if (config.maxSelections && selectedEntities.length >= config.maxSelections) return false;
		return true;
	};

	const renderAddButton = () => {
		if (!canAddEntity()) return null;

		return (
			<TouchableOpacity
				style={[styles.addButton, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }, disabled && styles.addButtonDisabled]}
				onPress={handleAddEntity}
				disabled={disabled}
			>
				<MaterialIcons
					name="add"
					size={16}
					color={disabled ? theme.textMuted : theme.accent}
				/>
				<Text style={[styles.addButtonText, { color: theme.accent }, disabled && { color: theme.textMuted }]}>
					{config.placeholder}
				</Text>
			</TouchableOpacity>
		);
	};

	const renderEntityChips = () => {
		if (selectedEntities.length === 0) return null;

		return (
			<View style={styles.chipsContainer}>
				{selectedEntities.map((entity, index) => (
					<EntityChip
						key={`${entity.id || 'new'}-${index}`}
						entity={entity}
						onRemove={() => handleRemoveEntity(index)}
						disabled={disabled}
					/>
				))}
			</View>
		);
	};

	const renderLimitIndicator = () => {
		if (!config.multiple || !config.maxSelections) return null;

		return (
			<Text style={[styles.limitText, { color: theme.textMuted }]}>
				{selectedEntities.length} / {config.maxSelections}
			</Text>
		);
	};

		return (
		<View style={styles.container}>
			{/* Label avec icône optionnelle */}
			<View style={styles.labelContainer}>
				{config.icon ? (
					<MaterialIcons
						name={config.icon as any}
						size={18}
						color={theme.textPrimary}
						style={styles.labelIcon}
					/>
				) : null}
				<Text style={[styles.label, { color: theme.textSecondary }]}>{config.label}</Text>
				{renderLimitIndicator()}
			</View>
			{/* Entités sélectionnées */}
			{renderEntityChips()}

			{/* Bouton d'ajout */}
			{renderAddButton()}

			{/* Message d'erreur */}
			{error ? (
				<Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
			) : null}

			{/* Message d'aide */}
			{selectedEntities.length === 0 && !error ? (
				<Text style={[styles.helpText, { color: theme.textMuted }]}>
					Cliquez sur "+" pour ajouter {config.multiple ? 'des' : 'un'} {config.entityType === 'series' ? 'série' : config.entityType}{config.multiple && config.entityType !== 'series' ? 's' : ''}
				</Text>
			) : null}

			{/* Modal de recherche */}
			<EntitySearchModal<T>
				visible={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSelectEntity={handleSelectFromModal}
				entityType={config.entityType}
				title={`Rechercher ${config.entityType === 'author' ? 'un auteur' :
					config.entityType === 'publisher' ? 'un éditeur' :
					config.entityType === 'series' ? 'une série' : 'un genre'}`}
				placeholder={`Tapez le nom d${config.entityType === 'author' ? "'un auteur" :
					config.entityType === 'publisher' ? "'un éditeur" :
					config.entityType === 'series' ? "'une série" : "'un genre"}...`}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	labelContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	labelIcon: {
		marginRight: 8,
	},
	label: {
		fontSize: 16,
		fontWeight: '500',
		flex: 1,
	},
	limitText: {
		fontSize: 12,
		fontStyle: 'italic',
	},
	chipsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginBottom: 8,
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderStyle: 'dashed',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		alignSelf: 'flex-start',
	},
	addButtonDisabled: {
		opacity: 0.6,
	},
	addButtonText: {
		marginLeft: 6,
		fontSize: 14,
		fontWeight: '500',
	},
	errorText: {
		fontSize: 14,
		marginTop: 4,
		fontStyle: 'italic',
	},
	helpText: {
		fontSize: 12,
		fontStyle: 'italic',
		marginTop: 4,
	},
});
