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
					<MaterialIcons name="hourglass-empty" size={24} color="#3498db" />
					<Text style={styles.loadingText}>Recherche en cours...</Text>
				</View>
			);
		}

		if (searchQuery.length < 2) {
			return (
				<View style={styles.hintContainer}>
					<MaterialIcons name="search" size={32} color="#bdc3c7" />
					<Text style={styles.hintText}>
						Tapez au moins 2 caractères pour rechercher
					</Text>
				</View>
			);
		}

		if (searchResults.length === 0) {
			return (
				<View style={styles.noResultsContainer}>
					<MaterialIcons name="search-off" size={32} color="#95a5a6" />
					<Text style={styles.noResultsText}>
						Aucun résultat trouvé
					</Text>
					{searchQuery.trim() && (
						<TouchableOpacity
							style={styles.createNewButton}
							onPress={handleCreateNew}
						>
							<MaterialIcons name="add-circle" size={20} color="#f39c12" />
							<Text style={styles.createNewText}>
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
						style={styles.resultItem}
						onPress={() => handleSelectEntity(entity)}
					>
						<View style={styles.resultContent}>
							<MaterialIcons
								name={entity.exists ? 'check-circle' : 'add-circle'}
								size={20}
								color={entity.exists ? '#27ae60' : '#f39c12'}
								style={styles.resultIcon}
							/>
							
							<View style={styles.resultInfo}>
								<Text style={styles.resultName}>
									{entity.name}
								</Text>
								
								{/* Métadonnées désactivées temporairement */}
							</View>

							<MaterialIcons
								name="arrow-forward-ios"
								size={16}
								color="#bdc3c7"
							/>
						</View>
					</TouchableOpacity>
				))}
				
				{/* Option pour créer nouveau même avec des résultats */}
				{searchQuery.trim() && (
					<TouchableOpacity
						style={[styles.resultItem, styles.createNewItem]}
						onPress={handleCreateNew}
					>
						<View style={styles.resultContent}>
							<MaterialIcons
								name="add-circle"
								size={20}
								color="#f39c12"
								style={styles.resultIcon}
							/>
							
							<View style={styles.resultInfo}>
								<Text style={styles.createNewText}>
									Créer "{searchQuery.trim()}"
								</Text>
								<Text style={styles.createNewSubtext}>
									Nouvelle entrée
								</Text>
							</View>

							<MaterialIcons
								name="arrow-forward-ios"
								size={16}
								color="#f39c12"
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
				style={styles.modalContainer}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={onClose}
					>
						<MaterialIcons name="close" size={24} color="#2c3e50" />
					</TouchableOpacity>
					
					<Text style={styles.modalTitle}>{title}</Text>
					
					<View style={styles.headerSpacer} />
				</View>

				{/* Search Input */}
				<View style={styles.searchContainer}>
					<MaterialIcons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
					<TextInput
						ref={inputRef}
						style={styles.searchInput}
						placeholder={placeholder}
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
							<MaterialIcons name="clear" size={20} color="#bdc3c7" />
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
		backgroundColor: '#ffffff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e1e8ed',
		backgroundColor: '#f8f9fa',
	},
	closeButton: {
		padding: 4,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#2c3e50',
		textAlign: 'center',
		flex: 1,
	},
	headerSpacer: {
		width: 32, // Même largeur que le bouton close pour centrer le titre
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		margin: 16,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		paddingVertical: 12,
		fontSize: 16,
		color: '#2c3e50',
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
		color: '#7f8c8d',
	},
	hintContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},
	hintText: {
		marginTop: 16,
		fontSize: 16,
		color: '#95a5a6',
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
		color: '#95a5a6',
		textAlign: 'center',
	},
	resultsContainer: {
		flex: 1,
	},
	resultItem: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	createNewItem: {
		borderColor: '#f39c12',
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
		color: '#2c3e50',
	},
	resultMeta: {
		fontSize: 12,
		color: '#7f8c8d',
		marginTop: 2,
	},
	createNewButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff3cd',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginTop: 16,
		borderWidth: 1,
		borderColor: '#f39c12',
	},
	createNewText: {
		marginLeft: 8,
		fontSize: 14,
		fontWeight: '500',
		color: '#856404',
	},
	createNewSubtext: {
		fontSize: 12,
		color: '#856404',
		marginTop: 2,
	},
});