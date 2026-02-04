// components/forms/SeriesSelector.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EntityChip } from './EntityChip';
import { EntitySearchModal } from './EntitySearchModal';
import { Entity, SeriesMetadata } from '@/types/entityTypes';

interface SeriesSelectorProps {
	selectedEntities: Entity<SeriesMetadata>[];
	onEntitiesChange: (entities: Entity<SeriesMetadata>[]) => void;
	disabled?: boolean;
	error?: string;
}

const MAX_SELECTIONS = 10;

export const SeriesSelector: React.FC<SeriesSelectorProps> = ({
	selectedEntities,
	onEntitiesChange,
	disabled = false,
	error
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleVolumeChange = (index: number, text: string) => {
		const volumeNumber = text === '' ? undefined : parseInt(text, 10);
		if (text !== '' && isNaN(volumeNumber as number)) return;

		const updated = selectedEntities.map((entity, i) => {
			if (i !== index) return entity;
			return {
				...entity,
				metadata: {
					...entity.metadata,
					volume_number: volumeNumber,
				},
			};
		});
		onEntitiesChange(updated);
	};

	const handleRemove = (index: number) => {
		if (disabled) return;
		onEntitiesChange(selectedEntities.filter((_, i) => i !== index));
	};

	const handleSelectFromModal = (entity: Entity<SeriesMetadata>) => {
		if (selectedEntities.length >= MAX_SELECTIONS) return;
		const isAlreadySelected = selectedEntities.some(
			existing => existing.name.toLowerCase() === entity.name.toLowerCase()
		);
		if (!isAlreadySelected) {
			onEntitiesChange([...selectedEntities, entity]);
		}
	};

	const canAdd = !disabled && selectedEntities.length < MAX_SELECTIONS;

	return (
		<View style={styles.container}>
			{/* Label */}
			<View style={styles.labelContainer}>
				<Text style={styles.label}>📚 Séries</Text>
				<Text style={styles.limitText}>
					{selectedEntities.length} / {MAX_SELECTIONS}
				</Text>
			</View>

			{/* Séries sélectionnées avec champ volume */}
			{selectedEntities.map((entity, index) => (
				<View key={`${entity.id || 'new'}-${index}`} style={styles.seriesRow}>
					<View style={styles.chipWrapper}>
						<EntityChip
							entity={entity}
							onRemove={() => handleRemove(index)}
							disabled={disabled}
						/>
					</View>
					<View style={styles.volumeContainer}>
						<Text style={styles.volumeLabel}>Tome</Text>
						<TextInput
							style={[styles.volumeInput, disabled && styles.volumeInputDisabled]}
							value={entity.metadata?.volume_number?.toString() || ''}
							onChangeText={(text) => handleVolumeChange(index, text)}
							placeholder="N°"
							keyboardType="numeric"
							editable={!disabled}
							maxLength={4}
						/>
					</View>
				</View>
			))}

			{/* Bouton d'ajout */}
			{canAdd && (
				<TouchableOpacity
					style={[styles.addButton, disabled && styles.addButtonDisabled]}
					onPress={() => setIsModalOpen(true)}
					disabled={disabled}
				>
					<MaterialIcons name="add" size={16} color={disabled ? '#bdc3c7' : '#3498db'} />
					<Text style={[styles.addButtonText, disabled && styles.addButtonTextDisabled]}>
						Ajouter une série
					</Text>
				</TouchableOpacity>
			)}

			{/* Message d'erreur */}
			{error ? <Text style={styles.errorText}>{error}</Text> : null}

			{/* Message d'aide */}
			{selectedEntities.length === 0 && !error ? (
				<Text style={styles.helpText}>
					Cliquez sur "+" pour ajouter des séries
				</Text>
			) : null}

			{/* Modal de recherche */}
			<EntitySearchModal<SeriesMetadata>
				visible={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSelectEntity={handleSelectFromModal}
				entityType="series"
				title="Rechercher une série"
				placeholder="Tapez le nom d'une série..."
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
	label: {
		fontSize: 16,
		fontWeight: '500',
		color: '#34495e',
		flex: 1,
	},
	limitText: {
		fontSize: 12,
		color: '#7f8c8d',
		fontStyle: 'italic',
	},
	seriesRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
		flexWrap: 'nowrap',
	},
	chipWrapper: {
		flexShrink: 1,
	},
	volumeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 4,
	},
	volumeLabel: {
		fontSize: 12,
		color: '#7f8c8d',
		marginRight: 2,
	},
	volumeInput: {
		borderWidth: 1,
		borderColor: '#bdc3c7',
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
		fontSize: 14,
		backgroundColor: '#ffffff',
		color: '#2c3e50',
		width: 50,
		textAlign: 'center',
	},
	volumeInputDisabled: {
		backgroundColor: '#f8f9fa',
		opacity: 0.6,
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ecf0f1',
		borderWidth: 1,
		borderColor: '#bdc3c7',
		borderStyle: 'dashed',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		alignSelf: 'flex-start',
		marginTop: 4,
	},
	addButtonDisabled: {
		backgroundColor: '#f8f9fa',
		opacity: 0.6,
	},
	addButtonText: {
		marginLeft: 6,
		fontSize: 14,
		color: '#3498db',
		fontWeight: '500',
	},
	addButtonTextDisabled: {
		color: '#bdc3c7',
	},
	errorText: {
		color: '#e74c3c',
		fontSize: 14,
		marginTop: 4,
		fontStyle: 'italic',
	},
	helpText: {
		color: '#95a5a6',
		fontSize: 12,
		fontStyle: 'italic',
		marginTop: 4,
	},
});
