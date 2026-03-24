// components/forms/EntitySearchModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	Modal,
	ScrollView,
	KeyboardAvoidingView,
	Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Entity, EntityType } from '@/types/entityTypes';
import { entityService } from '@/services/entityService';
import { useTheme } from '@/contexts/ThemeContext';

interface EntitySearchModalProps<T = {}> {
	visible: boolean;
	onClose: () => void;
	onSelectEntity: (entity: Entity<T>) => void;
	entityType: EntityType;
	title: string;
	placeholder: string;
}

export const EntitySearchModal = <T,>({
	visible,
	onClose,
	onSelectEntity,
	entityType,
	title,
	placeholder
}: EntitySearchModalProps<T>) => {
	const theme = useTheme();
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<Entity<T>[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const inputRef = useRef<TextInput>(null);

	// Recherche avec service unifié (API + fallback mock)
	const performSearch = async (query: string) => {
		setIsSearching(true);
		console.log(`🔍 Recherche ${entityType}:`, query);

		try {
			let results: any[] = [];

			switch (entityType) {
				case 'author':
					console.log('📡 Appel API auteurs...');
					results = await entityService.searchAuthors(query, 10);
					break;
				case 'publisher':
					console.log('📋 Appel service éditeurs...');
					results = await entityService.searchPublishers(query, 10);
					break;
				case 'genre':
					console.log('🏷️ Appel service genres...');
					results = await entityService.searchGenres(query, 10);
					break;
				case 'series':
					console.log('📚 Appel service séries...');
					results = await entityService.searchSeries(query, 10);
					break;
			}

			console.log(`✅ Résultats ${entityType}:`, results.length, 'trouvés');
			setSearchResults(results as Entity<T>[]);
		} catch (error) {
			console.error(`❌ Erreur recherche ${entityType}:`, error);
			setSearchResults([]);
		} finally {
			setIsSearching(false);
		}
	};

	// Debounced search
	useEffect(() => {
		if (searchQuery.length >= 2) {
			const timeoutId = setTimeout(() => {
				performSearch(searchQuery);
			}, 300);

			return () => clearTimeout(timeoutId);
		} else {
			setSearchResults([]);
			setIsSearching(false);
		}
	}, [searchQuery, entityType]);

	// Focus sur l'input quand la modal s'ouvre
	useEffect(() => {
		if (visible && inputRef.current) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		}
	}, [visible]);

	// Réinitialiser lors de la fermeture
	useEffect(() => {
		if (!visible) {
			setSearchQuery('');
			setSearchResults([]);
			setIsSearching(false);
		}
	}, [visible]);

	const handleSelectEntity = (entity: Entity<T>) => {
		onSelectEntity(entity);
		onClose();
	};

	const handleCreateNew = () => {
		if (searchQuery.trim()) {
			// Créer une entité temporaire qui ne sera persistée qu'au moment de la soumission du formulaire
			const newEntity: Entity<T> = {
				id: null, // Pas d'ID car pas encore créée en base
				name: searchQuery.trim(),
				exists: false // Indique que c'est une nouvelle entité à créer
			};

			console.log(`📝 Nouvelle entité préparée (${entityType}):`, newEntity.name);
			handleSelectEntity(newEntity);
		}
	};

	const renderSearchResults = () => {
		if (isSearching) {
			return (
				<View style={styles.loadingContainer}>
					<MaterialIcons name="hourglass-empty" size={24} color={theme.accent} />
					<Text style={[styles.loadingText, { color: theme.textSecondary }]}>Recherche en cours...</Text>
				</View>
			);
		}

		if (searchQuery.length < 2) {
			return (
				<View style={styles.hintContainer}>
					<MaterialIcons name="search" size={32} color={theme.textMuted} />
					<Text style={[styles.hintText, { color: theme.textMuted }]}>
						Tapez au moins 2 caractères pour rechercher
					</Text>
				</View>
			);
		}

		if (searchResults.length === 0) {
			return (
				<View style={styles.noResultsContainer}>
					<MaterialIcons name="search-off" size={32} color={theme.textMuted} />
					<Text style={[styles.noResultsText, { color: theme.textMuted }]}>
						Aucun résultat trouvé
					</Text>
					{searchQuery.trim() && (
						<TouchableOpacity
							style={[styles.createNewButton, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}
							onPress={handleCreateNew}
						>
							<MaterialIcons name="add-circle" size={20} color={theme.warning} />
							<Text style={[styles.createNewText, { color: theme.warning }]}>
								Créer "{searchQuery.trim()}"
							</Text>
						</TouchableOpacity>
					)}
				</View>
			);
		}

		return (
			<ScrollView style={styles.resultsContainer}>
				{searchResults.map((entity, index) => (
					<TouchableOpacity
						key={`${entity.id}-${index}`}
						style={[styles.resultItem, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}
						onPress={() => handleSelectEntity(entity)}
					>
						<View style={styles.resultContent}>
							<MaterialIcons
								name={entity.exists ? 'check-circle' : 'add-circle'}
								size={20}
								color={entity.exists ? theme.success : theme.warning}
								style={styles.resultIcon}
							/>

							<View style={styles.resultInfo}>
								<Text style={[styles.resultName, { color: theme.textPrimary }]}>
									{entity.name}
								</Text>

								{/* Métadonnées désactivées temporairement */}
							</View>

							<MaterialIcons
								name="arrow-forward-ios"
								size={16}
								color={theme.textMuted}
							/>
						</View>
					</TouchableOpacity>
				))}

				{/* Option pour créer nouveau même avec des résultats */}
				{searchQuery.trim() && (
					<TouchableOpacity
						style={[styles.resultItem, styles.createNewItem, { backgroundColor: theme.bgCard, borderColor: theme.warning }]}
						onPress={handleCreateNew}
					>
						<View style={styles.resultContent}>
							<MaterialIcons
								name="add-circle"
								size={20}
								color={theme.warning}
								style={styles.resultIcon}
							/>

							<View style={styles.resultInfo}>
								<Text style={[styles.createNewText, { color: theme.warning }]}>
									Créer "{searchQuery.trim()}"
								</Text>
								<Text style={[styles.createNewSubtext, { color: theme.warning }]}>
									Nouvelle entrée
								</Text>
							</View>

							<MaterialIcons
								name="arrow-forward-ios"
								size={16}
								color={theme.warning}
							/>
						</View>
					</TouchableOpacity>
				)}
			</ScrollView>
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				style={[styles.modalContainer, { backgroundColor: theme.bgCard }]}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: theme.borderLight, backgroundColor: theme.bgSecondary }]}>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={onClose}
					>
						<MaterialIcons name="close" size={24} color={theme.textPrimary} />
					</TouchableOpacity>

					<Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{title}</Text>

					<View style={styles.headerSpacer} />
				</View>

				{/* Search Input */}
				<View style={[styles.searchContainer, { backgroundColor: theme.bgInput, borderColor: theme.borderLight }]}>
					<MaterialIcons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
					<TextInput
						ref={inputRef}
						style={[styles.searchInput, { color: theme.textPrimary }]}
						placeholder={placeholder}
						placeholderTextColor={theme.textMuted}
						value={searchQuery}
						onChangeText={setSearchQuery}
						autoCapitalize="words"
						autoCorrect={false}
						returnKeyType="search"
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => setSearchQuery('')}
						>
							<MaterialIcons name="clear" size={20} color={theme.textMuted} />
						</TouchableOpacity>
					)}
				</View>

				{/* Results */}
				<View style={styles.content}>
					{renderSearchResults()}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalContainer: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	closeButton: {
		padding: 4,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
		flex: 1,
	},
	headerSpacer: {
		width: 32, // Même largeur que le bouton close pour centrer le titre
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		margin: 16,
		paddingHorizontal: 12,
		borderWidth: 1,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		paddingVertical: 12,
		fontSize: 16,
	},
	clearButton: {
		padding: 4,
		marginLeft: 8,
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
	},
	hintContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},
	hintText: {
		marginTop: 16,
		fontSize: 16,
		textAlign: 'center',
		paddingHorizontal: 20,
	},
	noResultsContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	noResultsText: {
		marginTop: 16,
		fontSize: 16,
		textAlign: 'center',
	},
	resultsContainer: {
		flex: 1,
	},
	resultItem: {
		borderRadius: 12,
		marginBottom: 8,
		borderWidth: 1,
	},
	createNewItem: {
		borderStyle: 'dashed',
	},
	resultContent: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
	},
	resultIcon: {
		marginRight: 12,
	},
	resultInfo: {
		flex: 1,
	},
	resultName: {
		fontSize: 16,
		fontWeight: '500',
	},
	resultMeta: {
		fontSize: 12,
		marginTop: 2,
	},
	createNewButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginTop: 16,
		borderWidth: 1,
	},
	createNewText: {
		marginLeft: 8,
		fontSize: 14,
		fontWeight: '500',
	},
	createNewSubtext: {
		fontSize: 12,
		marginTop: 2,
	},
});
