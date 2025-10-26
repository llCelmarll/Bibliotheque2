// components/forms/EntityChip.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Entity, EntityType } from '@/types/entityTypes';
import { FEATURE_FLAGS } from '@/utils/featureFlags';
import { entityService } from '@/services/entityService';

interface EntityChipProps<T = {}> {
	entity: Entity<T>;
	onRemove?: () => void;
	disabled?: boolean;
	showMetadata?: boolean; // À réactiver plus tard
}

export const EntityChip = <T,>({ 
	entity, 
	onRemove, 
	disabled = false,
	showMetadata = false 
}: EntityChipProps<T>) => {
	const getChipStyle = () => {
		if (disabled) return [styles.chip, styles.chipDisabled];
		
		// Style selon l'état d'existence
		if (entity.exists) {
			return [styles.chip, styles.chipExisting];
		} else {
			return [styles.chip, styles.chipNew];
		}
	};

	const getTextStyle = () => {
		const baseStyle = styles.chipText;
		
		if (disabled) {
			return [baseStyle, styles.chipTextDisabled];
		} else if (entity.exists) {
			return [baseStyle, styles.chipTextExisting];
		} else {
			return [baseStyle, styles.chipTextNew];
		}
	};

	// Métadonnées désactivées temporairement - à réactiver plus tard
	const renderMetadata = () => {
		return null;
	};

	return (
		<View style={getChipStyle()}>
			{/* Icône d'état */}
			<MaterialIcons
				name={entity.exists ? 'check-circle' : 'add-circle'}
				size={14}
				color={entity.exists ? '#27ae60' : '#f39c12'}
				style={styles.statusIcon}
			/>
			
			{/* Nom de l'entité */}
			<Text 
				style={getTextStyle()} 
				numberOfLines={2} // Permet 2 lignes au lieu d'1
				ellipsizeMode="tail"
				testID="entity-chip-name"
				accessibilityLabel={`Entité: ${entity.name}`}
			>
				{entity?.name || 'Nom manquant'}
			</Text>
			
			{/* Métadonnées optionnelles */}
			{renderMetadata()}
			
			{/* Bouton de suppression */}
			{onRemove && !disabled && (
				<TouchableOpacity
					style={styles.removeButton}
					onPress={onRemove}
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				>
					<MaterialIcons
						name="close"
						size={16}
						color="#7f8c8d"
					/>
				</TouchableOpacity>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 16,
		borderWidth: 1,
		marginRight: 8,
		marginBottom: 8,
		// Pas de maxWidth - laisse les chips grandir selon le contenu
		minWidth: 120, // Plus large pour accommoder les noms longs
		alignSelf: 'flex-start', // Empêche l'étirement sur toute la largeur
	},
	chipExisting: {
		backgroundColor: '#e8f5e8',
		borderColor: '#27ae60',
	},
	chipNew: {
		backgroundColor: '#fff3cd',
		borderColor: '#f39c12',
	},
	chipDisabled: {
		backgroundColor: '#f8f9fa',
		borderColor: '#dee2e6',
		opacity: 0.6,
	},
	chipText: {
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 6,
		textAlign: 'left',
		includeFontPadding: false, // Android: évite les problèmes de padding de police
		color: '#2c3e50', // Couleur par défaut
		flexShrink: 1, // Permet la réduction si vraiment nécessaire
	},
	chipTextExisting: {
		color: '#0d4820', // Vert plus foncé pour meilleur contraste
		fontWeight: '600', // Plus gras pour mobile
	},
	chipTextNew: {
		color: '#6c4f00', // Orange plus foncé pour meilleur contraste
		fontWeight: '600', // Plus gras pour mobile
	},
	chipTextDisabled: {
		color: '#6c757d',
	},
	statusIcon: {
		marginRight: 2,
	},
	metadataText: {
		fontSize: 12,
		color: '#6c757d',
		fontStyle: 'italic',
		marginLeft: 4,
	},
	removeButton: {
		marginLeft: 6,
		padding: 2,
		borderRadius: 8,
	},
});