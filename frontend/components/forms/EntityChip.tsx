// components/forms/EntityChip.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Entity, EntityType } from '@/types/entityTypes';
import { FEATURE_FLAGS } from '@/utils/featureFlags';
import { entityService } from '@/services/entityService';
import { useTheme } from '@/contexts/ThemeContext';

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
	const theme = useTheme();

	const getChipStyle = () => {
		if (disabled) return [styles.chip, styles.chipDisabled, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }];

		// Style selon l'état d'existence
		if (entity.exists) {
			return [styles.chip, { backgroundColor: theme.successBg, borderColor: theme.success }];
		} else {
			return [styles.chip, { backgroundColor: theme.warningBg, borderColor: theme.warning }];
		}
	};

	const getTextStyle = () => {
		const baseStyle = styles.chipText;

		if (disabled) {
			return [baseStyle, { color: theme.textSecondary }];
		} else if (entity.exists) {
			return [baseStyle, { color: theme.success }];
		} else {
			return [baseStyle, { color: theme.warning }];
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
				color={entity.exists ? theme.success : theme.warning}
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
						color={theme.textMuted}
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
	chipDisabled: {},
	chipText: {
		fontSize: 14,
		fontWeight: '600',
		marginLeft: 6,
		textAlign: 'left',
		includeFontPadding: false,
		flexShrink: 1,
	},
	statusIcon: {
		marginRight: 2,
	},
	metadataText: {
		fontSize: 12,
		fontStyle: 'italic',
		marginLeft: 4,
	},
	removeButton: {
		marginLeft: 6,
		padding: 2,
		borderRadius: 8,
	},
});
