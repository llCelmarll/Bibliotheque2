// components/scan/ExternalDataSection.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { entityService } from '@/services/entityService';
import { Author, Publisher, Genre } from '@/types/entityTypes';

interface ExternalDataSectionProps {
	googleData?: any;
	openLibraryData?: any;
	googleError?: string;
	openLibraryError?: string;
	onImportData: (source: 'google' | 'openLibrary', selectedData: any) => void;
}

export const ExternalDataSection: React.FC<ExternalDataSectionProps> = ({
																			googleData,
																			openLibraryData,
																			googleError,
																			openLibraryError,
																			onImportData
																		}) => {
	const [activeTab, setActiveTab] = useState<'google' | 'openLibrary'>('google');
	const [selectedData, setSelectedData] = useState<{[key: string]: boolean}>({
		title: false,
		authors: false,
		publisher: false,
		publishedDate: false,
		pageCount: false,
		isbn: false,
		categories: false,
		thumbnail: false,
	});
	
	// États pour les entités enrichies
	const [enrichedAuthors, setEnrichedAuthors] = useState<Author[]>([]);
	const [enrichedPublisher, setEnrichedPublisher] = useState<Publisher | null>(null);
	const [enrichedGenres, setEnrichedGenres] = useState<Genre[]>([]);
	const [isEnriching, setIsEnriching] = useState(false);

	// Extraction et normalisation des données selon la source
	const extractBookInfo = (data: any, source: 'google' | 'openLibrary') => {
		if (!data) return null;

		if (source === 'google') {
			return {
				// Données exploitables pour la base
				exploitable: {
					title: data.title,
					authors: data.authors || [],
					publisher: data.publisher,
					publishedDate: data.publishedDate,
					pageCount: data.pageCount,
					isbn: data.industryIdentifiers?.find((id: any) => 
						id.type === 'ISBN_13' || id.type === 'ISBN_10'
					)?.identifier,
					thumbnail: data.imageLinks?.thumbnail,
					categories: data.categories || [],
				},
				// Toutes les données brutes pour les détails
				raw: data
			};
		} else if (source === 'openLibrary') {
			return {
				exploitable: {
					title: data.title,
					authors: data.authors?.map((a: any) => a.name) || [],
					publisher: data.publishers?.[0],
					publishedDate: data.publish_date,
					pageCount: data.number_of_pages,
					isbn: data.isbn_13?.[0] || data.isbn_10?.[0],
					thumbnail: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg` : null,
					categories: data.subjects || [],
				},
				raw: data
			};
		}
		return null;
	};

	// Effet pour enrichir les entités quand les données changent
	useEffect(() => {
		const currentData = activeTab === 'google' ? googleData : openLibraryData;
		if (currentData) {
			const bookInfo = extractBookInfo(currentData, activeTab);
			if (bookInfo) {
				enrichEntities(bookInfo.exploitable);
			}
		} else {
			// Reset si pas de données
			setEnrichedAuthors([]);
			setEnrichedPublisher(null);
			setEnrichedGenres([]);
		}
	}, [activeTab, googleData, openLibraryData]);

	// Effet pour réinitialiser la sélection quand on change d'onglet
	useEffect(() => {
		console.log('🔄 Reset de la sélection lors du changement d\'onglet');
		setSelectedData({
			title: false,
			authors: false,
			publisher: false,
			publishedDate: false,
			pageCount: false,
			isbn: false,
			categories: false,
			thumbnail: false,
		});
	}, [activeTab]);

	// Fonction pour enrichir les entités avec vérification d'existence
	const enrichEntities = async (bookInfo: any) => {
		if (!bookInfo || isEnriching) return;
		
		setIsEnriching(true);
		console.log('🔍 Enrichissement des entités...');
		
		try {
			// Enrichir les auteurs
			if (bookInfo.authors && Array.isArray(bookInfo.authors)) {
				const enrichedAuthorsList: Author[] = [];
				for (const authorName of bookInfo.authors) {
					if (typeof authorName === 'string' && authorName.trim()) {
						// Chercher si l'auteur existe déjà
						const existingAuthors = await entityService.searchAuthors(authorName, 1);
						const exactMatch = existingAuthors.find(a => 
							a.name.toLowerCase() === authorName.toLowerCase()
						);
						
						if (exactMatch) {
							enrichedAuthorsList.push({
								id: exactMatch.id,
								name: exactMatch.name,
								exists: true
							});
							console.log(`✅ Auteur existant: ${exactMatch.name}`);
						} else {
							enrichedAuthorsList.push({
								id: null,
								name: authorName.trim(),
								exists: false
							});
							console.log(`🆕 Nouvel auteur: ${authorName}`);
						}
					}
				}
				setEnrichedAuthors(enrichedAuthorsList);
			}
			
			// Enrichir l'éditeur
			if (bookInfo.publisher && typeof bookInfo.publisher === 'string') {
				const existingPublishers = await entityService.searchPublishers(bookInfo.publisher, 1);
				const exactMatch = existingPublishers.find(p => 
					p.name.toLowerCase() === bookInfo.publisher.toLowerCase()
				);
				
				if (exactMatch) {
					setEnrichedPublisher({
						id: exactMatch.id,
						name: exactMatch.name,
						exists: true
					});
					console.log(`✅ Éditeur existant: ${exactMatch.name}`);
				} else {
					setEnrichedPublisher({
						id: null,
						name: bookInfo.publisher.trim(),
						exists: false
					});
					console.log(`🆕 Nouvel éditeur: ${bookInfo.publisher}`);
				}
			}
			
			// Enrichir les genres/catégories
			if (bookInfo.categories && Array.isArray(bookInfo.categories)) {
				const enrichedGenresList: Genre[] = [];
				for (const categoryName of bookInfo.categories.slice(0, 5)) { // Limiter à 5 catégories
					if (typeof categoryName === 'string' && categoryName.trim()) {
						const existingGenres = await entityService.searchGenres(categoryName, 1);
						const exactMatch = existingGenres.find(g => 
							g.name.toLowerCase() === categoryName.toLowerCase()
						);
						
						if (exactMatch) {
							enrichedGenresList.push({
								id: exactMatch.id,
								name: exactMatch.name,
								exists: true
							});
							console.log(`✅ Genre existant: ${exactMatch.name}`);
						} else {
							enrichedGenresList.push({
								id: null,
								name: categoryName.trim(),
								exists: false
							});
							console.log(`🆕 Nouveau genre: ${categoryName}`);
						}
					}
				}
				setEnrichedGenres(enrichedGenresList);
			}
			
		} catch (error) {
			console.error('Erreur lors de l\'enrichissement des entités:', error);
		} finally {
			setIsEnriching(false);
		}
	};

	// Fonctions utilitaires pour la sélection
	const hasSelectedData = () => Object.values(selectedData).some(Boolean);
	
	const getSelectedCount = () => Object.values(selectedData).filter(Boolean).length;

	const handleImport = (bookInfo: any, source: 'google' | 'openLibrary') => {
		console.log('🔍 DEBUG - État de sélection:', selectedData);
		console.log('🔍 DEBUG - Entités enrichies:', { 
			authors: enrichedAuthors, 
			publisher: enrichedPublisher, 
			genres: enrichedGenres 
		});
		console.log('🔍 DEBUG - Données brutes reçues:', bookInfo);
		
		// Créer un objet avec seulement les données sélectionnées
		const selectedBookData: any = {};
		
		// Parcourir chaque clé de sélection
		Object.keys(selectedData).forEach(key => {
			const isSelected = selectedData[key];
			console.log(`🔍 DEBUG - Clé "${key}": sélectionnée=${isSelected}`);
			
			if (isSelected) {
				switch (key) {
					case 'authors':
						// Utiliser les entités enrichies si disponibles, sinon les données brutes
						if (enrichedAuthors.length > 0) {
							selectedBookData[key] = enrichedAuthors;
							console.log('✅ Auteurs ajoutés (enrichis):', enrichedAuthors);
						} else if (bookInfo.authors && bookInfo.authors.length > 0) {
							// Fallback vers données brutes si enrichissement a échoué
							selectedBookData[key] = bookInfo.authors.map((name: string) => ({
								id: null,
								name: name,
								exists: false
							}));
							console.log('⚠️ Auteurs ajoutés (données brutes):', bookInfo.authors);
						}
						break;
					case 'publisher':
						// Utiliser l'entité enrichie si disponible, sinon les données brutes
						if (enrichedPublisher) {
							selectedBookData[key] = enrichedPublisher;
							console.log('✅ Éditeur ajouté (enrichi):', enrichedPublisher);
						} else if (bookInfo.publisher) {
							// Fallback vers données brutes
							selectedBookData[key] = {
								id: null,
								name: bookInfo.publisher,
								exists: false
							};
							console.log('⚠️ Éditeur ajouté (données brutes):', bookInfo.publisher);
						}
						break;
					case 'categories':
						// Utiliser les genres enrichis si disponibles, sinon les données brutes
						if (enrichedGenres.length > 0) {
							selectedBookData['genres'] = enrichedGenres; // Mapper vers 'genres'
							console.log('✅ Genres ajoutés (enrichis, categories → genres):', enrichedGenres);
						} else if (bookInfo.categories && bookInfo.categories.length > 0) {
							// Fallback vers données brutes
							selectedBookData['genres'] = bookInfo.categories.map((name: string) => ({
								id: null,
								name: name,
								exists: false
							}));
							console.log('⚠️ Genres ajoutés (données brutes, categories → genres):', bookInfo.categories);
						}
						break;
					default:
						// Pour les autres champs (title, isbn, etc.), utiliser directement les données brutes
						if (bookInfo[key] !== undefined && bookInfo[key] !== null) {
							selectedBookData[key] = bookInfo[key];
							console.log(`✅ Champ standard "${key}" ajouté:`, bookInfo[key]);
						} else {
							console.log(`⚠️ Champ "${key}" sélectionné mais absent des données brutes`);
						}
						break;
				}
			}
		});

		console.log('📤 Données finales sélectionnées pour import:', selectedBookData);
		onImportData(source, selectedBookData);
	};

	const toggleSelection = (key: string) => {
		console.log(`🔄 Toggle sélection "${key}": ${selectedData[key]} → ${!selectedData[key]}`);
		setSelectedData(prev => {
			const newState = {
				...prev,
				[key]: !prev[key]
			};
			console.log('📊 Nouvel état de sélection:', newState);
			return newState;
		});
	};

	// Composant pour afficher une entité avec son statut
	const renderEntityChip = (entity: Author | Publisher | Genre, type: 'author' | 'publisher' | 'genre') => {
		const chipStyle = entity.exists ? styles.entityChipExisting : styles.entityChipNew;
		const iconName = entity.exists ? 'check-circle' : 'add-circle';
		const iconColor = entity.exists ? '#27ae60' : '#f39c12';
		
		return (
			<View key={`${type}-${entity.id || entity.name}`} style={[styles.entityChip, chipStyle]}>
				<MaterialIcons name={iconName} size={14} color={iconColor} />
				<Text style={styles.entityChipText}>{entity.name}</Text>
			</View>
		);
	};

	const renderCheckableDataItem = (key: string, label: string, value: any, isSelected: boolean) => {
		if (!value) return null;
		
		// Rendu spécial pour les entités enrichies
		if (key === 'authors' && enrichedAuthors.length > 0) {
			return (
				<TouchableOpacity 
					key={key}
					style={[styles.dataItem, isSelected && styles.dataItemSelected]}
					onPress={() => toggleSelection(key)}
				>
					<View style={styles.dataItemHeader}>
						<Text style={styles.dataLabel}>{label}</Text>
						{isEnriching ? (
							<MaterialIcons name="hourglass-empty" size={20} color="#f39c12" />
						) : (
							<MaterialIcons
								name={isSelected ? 'check-box' : 'check-box-outline-blank'}
								size={20}
								color={isSelected ? '#27ae60' : '#bdc3c7'}
							/>
						)}
					</View>
					<View style={styles.entitiesContainer}>
						{enrichedAuthors.map(author => renderEntityChip(author, 'author'))}
					</View>
				</TouchableOpacity>
			);
		}
		
		if (key === 'publisher' && enrichedPublisher) {
			return (
				<TouchableOpacity 
					key={key}
					style={[styles.dataItem, isSelected && styles.dataItemSelected]}
					onPress={() => toggleSelection(key)}
				>
					<View style={styles.dataItemHeader}>
						<Text style={styles.dataLabel}>{label}</Text>
						{isEnriching ? (
							<MaterialIcons name="hourglass-empty" size={20} color="#f39c12" />
						) : (
							<MaterialIcons
								name={isSelected ? 'check-box' : 'check-box-outline-blank'}
								size={20}
								color={isSelected ? '#27ae60' : '#bdc3c7'}
							/>
						)}
					</View>
					<View style={styles.entitiesContainer}>
						{renderEntityChip(enrichedPublisher, 'publisher')}
					</View>
				</TouchableOpacity>
			);
		}
		
		if (key === 'categories' && enrichedGenres.length > 0) {
			return (
				<TouchableOpacity 
					key={key}
					style={[styles.dataItem, isSelected && styles.dataItemSelected]}
					onPress={() => toggleSelection(key)}
				>
					<View style={styles.dataItemHeader}>
						<Text style={styles.dataLabel}>Genres</Text>
						{isEnriching ? (
							<MaterialIcons name="hourglass-empty" size={20} color="#f39c12" />
						) : (
							<MaterialIcons
								name={isSelected ? 'check-box' : 'check-box-outline-blank'}
								size={20}
								color={isSelected ? '#27ae60' : '#bdc3c7'}
							/>
						)}
					</View>
					<View style={styles.entitiesContainer}>
						{enrichedGenres.map(genre => renderEntityChip(genre, 'genre'))}
					</View>
				</TouchableOpacity>
			);
		}
		
		// Rendu standard pour les autres champs
		const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
		
		return (
			<TouchableOpacity 
				key={key}
				style={[styles.dataItem, isSelected && styles.dataItemSelected]}
				onPress={() => toggleSelection(key)}
			>
				<View style={styles.dataItemHeader}>
					<Text style={styles.dataLabel}>{label}</Text>
					<MaterialIcons
						name={isSelected ? 'check-box' : 'check-box-outline-blank'}
						size={20}
						color={isSelected ? '#27ae60' : '#bdc3c7'}
					/>
				</View>
				<Text style={[styles.dataValue, key === 'isbn' && styles.isbnValue]}>
					{displayValue}
				</Text>
			</TouchableOpacity>
		);
	};

	const renderExploitableData = (bookInfo: any) => {
		if (!bookInfo) return null;

		return (
			<View style={styles.exploitableSection}>
				<Text style={styles.subsectionTitle}>📋 Sélectionnez les données à importer</Text>
				<Text style={styles.subsectionSubtitle}>Cliquez sur les éléments pour les sélectionner/désélectionner</Text>
				
				<View style={styles.exploitableGrid}>
					{renderCheckableDataItem('title', 'Titre', bookInfo.title, selectedData.title)}
					{renderCheckableDataItem('authors', 'Auteur(s)', bookInfo.authors, selectedData.authors)}
					{renderCheckableDataItem('publisher', 'Éditeur', bookInfo.publisher, selectedData.publisher)}
					{renderCheckableDataItem('publishedDate', 'Date de publication', bookInfo.publishedDate, selectedData.publishedDate)}
					{renderCheckableDataItem('pageCount', 'Nombre de pages', bookInfo.pageCount, selectedData.pageCount)}
					{renderCheckableDataItem('isbn', 'ISBN', bookInfo.isbn, selectedData.isbn)}
					{renderCheckableDataItem('categories', 'Catégories', bookInfo.categories?.slice(0, 3), selectedData.categories)}
				</View>
				
				{/* Boutons de sélection rapide */}
				<View style={styles.selectionButtons}>
					<TouchableOpacity
						style={styles.selectAllButton}
						onPress={() => setSelectedData({
							title: true,
							authors: true,
							publisher: true,
							publishedDate: true,
							pageCount: true,
							isbn: true,
							categories: true,
							thumbnail: true,
						})}
					>
						<Text style={styles.selectAllButtonText}>✓ Tout sélectionner</Text>
					</TouchableOpacity>
					
					<TouchableOpacity
						style={styles.selectNoneButton}
						onPress={() => setSelectedData({
							title: false,
							authors: false,
							publisher: false,
							publishedDate: false,
							pageCount: false,
							isbn: false,
							categories: false,
							thumbnail: false,
						})}
					>
						<Text style={styles.selectNoneButtonText}>✗ Tout désélectionner</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	const renderRawData = (data: any, source: 'google' | 'openLibrary') => {
		if (!data) return null;

		const renderValue = (value: any, depth = 0): string => {
			if (value === null || value === undefined) return 'N/A';
			if (typeof value === 'string') return value;
			if (typeof value === 'number' || typeof value === 'boolean') return String(value);
			if (Array.isArray(value)) {
				return value.length > 0 ? value.slice(0, 3).map(v => renderValue(v, depth + 1)).join(', ') + (value.length > 3 ? '...' : '') : 'Vide';
			}
			if (typeof value === 'object') {
				const keys = Object.keys(value).slice(0, 3);
				return keys.map(key => `${key}: ${renderValue(value[key], depth + 1)}`).join(', ');
			}
			return String(value);
		};

		return (
			<View style={styles.rawDataSection}>
				<Text style={styles.subsectionTitle}>🔍 Toutes les informations détaillées</Text>
				
				<ScrollView style={styles.rawDataScroll} nestedScrollEnabled>
					{Object.entries(data).map(([key, value]) => (
						<View key={key} style={styles.rawDataItem}>
							<Text style={styles.rawDataKey}>{key}</Text>
							<Text style={styles.rawDataValue} numberOfLines={3}>
								{renderValue(value)}
							</Text>
						</View>
					))}
				</ScrollView>
			</View>
		);
	};

	const renderBookInfo = (data: any, source: 'google' | 'openLibrary') => {
		const hasError = source === 'google' ? googleError : openLibraryError;
		const sourceName = source === 'google' ? 'Google Books' : 'OpenLibrary';
		if (!data) {
			// Si erreur service, le bandeau est déjà affiché au-dessus — pas besoin de "aucune donnée"
			if (hasError) return null;
			return (
				<View style={styles.noDataContainer}>
					<Text style={styles.noDataText}>
						Livre non trouvé sur {sourceName}
					</Text>
				</View>
			);
		}

		const bookInfo = extractBookInfo(data, source);
		if (!bookInfo) return null;

		return (
			<ScrollView style={styles.bookInfoContainer} nestedScrollEnabled>
				{/* Couverture si disponible */}
				{bookInfo.exploitable.thumbnail && (
					<View style={styles.thumbnailContainer}>
						<Image 
							source={{ uri: bookInfo.exploitable.thumbnail }} 
							style={styles.thumbnail}
							resizeMode="cover"
						/>
					</View>
				)}

				{/* Section des données exploitables */}
				{renderExploitableData(bookInfo.exploitable)}

				{/* Bouton d'import */}
				<TouchableOpacity
					style={[styles.importButton, !hasSelectedData() && styles.importButtonDisabled]}
					onPress={() => handleImport(bookInfo.exploitable, source)}
					disabled={!hasSelectedData()}
				>
					<Text style={[styles.importButtonText, !hasSelectedData() && styles.importButtonTextDisabled]}>
						✅ Importer les données sélectionnées ({getSelectedCount()})
					</Text>
				</TouchableOpacity>

				{/* Section des données brutes détaillées */}
				{renderRawData(bookInfo.raw, source)}
			</ScrollView>
		);
	};

	const hasGoogleTab = googleData || googleError;
	const hasOpenLibraryTab = openLibraryData || openLibraryError;

	if (!hasGoogleTab && !hasOpenLibraryTab) {
		return (
			<View style={styles.container}>
				<Text style={styles.sectionTitle}>Données externes</Text>
				<View style={styles.noDataContainer}>
					<Text style={styles.noDataText}>
						Aucune donnée externe disponible
					</Text>
				</View>
			</View>
		);
	}

	const renderErrorBanner = (error: string) => (
		<View style={styles.errorBanner}>
			<MaterialIcons name="warning" size={20} color="#856404" />
			<Text style={styles.errorBannerText}>{error}</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			<Text style={styles.sectionTitle}>Données externes</Text>

			{/* Bandeaux d'erreur en haut, toujours visibles */}
			{googleError && renderErrorBanner(googleError)}
			{openLibraryError && renderErrorBanner(openLibraryError)}

			{/* Tabs */}
			<View style={styles.tabContainer}>
				{hasGoogleTab && (
					<TouchableOpacity
						style={[styles.tab, activeTab === 'google' && styles.activeTab]}
						onPress={() => setActiveTab('google')}
					>
						<Text style={[styles.tabText, activeTab === 'google' && styles.activeTabText]}>
							Google Books
						</Text>
					</TouchableOpacity>
				)}

				{hasOpenLibraryTab && (
					<TouchableOpacity
						style={[styles.tab, activeTab === 'openLibrary' && styles.activeTab]}
						onPress={() => setActiveTab('openLibrary')}
					>
						<Text style={[styles.tabText, activeTab === 'openLibrary' && styles.activeTabText]}>
							OpenLibrary
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Content */}
			<View style={styles.contentContainer}>
				{activeTab === 'google' && renderBookInfo(googleData, 'google')}
				{activeTab === 'openLibrary' && renderBookInfo(openLibraryData, 'openLibrary')}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		margin: 16,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#2c3e50',
		marginBottom: 16,
		textAlign: 'center',
	},
	tabContainer: {
		flexDirection: 'row',
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		padding: 4,
		marginBottom: 16,
	},
	tab: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		alignItems: 'center',
	},
	activeTab: {
		backgroundColor: '#3498db',
	},
	tabText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#7f8c8d',
	},
	activeTabText: {
		color: '#ffffff',
	},
	contentContainer: {
		minHeight: 300,
	},
	errorBanner: {
		backgroundColor: '#fff3cd',
		borderColor: '#ffc107',
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
	},
	errorBannerText: {
		color: '#856404',
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 8,
		flex: 1,
	},
	noDataContainer: {
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	noDataText: {
		fontSize: 16,
		color: '#95a5a6',
		textAlign: 'center',
		fontStyle: 'italic',
	},
	bookInfoContainer: {
		flex: 1,
		maxHeight: 600,
	},
	thumbnailContainer: {
		alignItems: 'center',
		marginBottom: 20,
	},
	thumbnail: {
		width: 100,
		height: 150,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	// Section des données exploitables
	exploitableSection: {
		backgroundColor: '#f0f8ff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		borderWidth: 2,
		borderColor: '#3498db',
	},
	subsectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#2c3e50',
		marginBottom: 8,
		textAlign: 'center',
	},
	subsectionSubtitle: {
		fontSize: 12,
		color: '#7f8c8d',
		textAlign: 'center',
		marginBottom: 16,
		fontStyle: 'italic',
	},
	exploitableGrid: {
		gap: 12,
	},
	dataItem: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 4,
		borderLeftColor: '#3498db',
	},
	dataLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#7f8c8d',
		textTransform: 'uppercase',
		marginBottom: 4,
	},
	dataValue: {
		fontSize: 14,
		color: '#2c3e50',
		lineHeight: 20,
	},
	isbnValue: {
		fontFamily: 'monospace',
		backgroundColor: '#ecf0f1',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	// Section des données brutes
	rawDataSection: {
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		padding: 16,
		marginTop: 20,
		borderWidth: 1,
		borderColor: '#dee2e6',
	},
	rawDataScroll: {
		maxHeight: 300,
	},
	rawDataItem: {
		backgroundColor: '#ffffff',
		borderRadius: 6,
		padding: 10,
		marginBottom: 8,
		borderLeftWidth: 3,
		borderLeftColor: '#6c757d',
	},
	rawDataKey: {
		fontSize: 12,
		fontWeight: '600',
		color: '#495057',
		marginBottom: 4,
		textTransform: 'capitalize',
	},
	rawDataValue: {
		fontSize: 13,
		color: '#6c757d',
		lineHeight: 18,
		fontFamily: 'monospace',
	},
	// Bouton d'import amélioré
	importButton: {
		backgroundColor: '#27ae60',
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		alignItems: 'center',
		marginVertical: 20,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	importButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	importButtonDisabled: {
		backgroundColor: '#bdc3c7',
		opacity: 0.7,
	},
	importButtonTextDisabled: {
		color: '#ecf0f1',
		opacity: 0.8,
	},
	dataItemSelected: {
		backgroundColor: '#e8f5e8',
		borderColor: '#27ae60',
		borderWidth: 2,
	},
	dataItemHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	selectionButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
		paddingHorizontal: 8,
	},
	selectAllButton: {
		backgroundColor: '#27ae60',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		flex: 0.48,
		alignItems: 'center',
	},
	selectAllButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	selectNoneButton: {
		backgroundColor: '#e74c3c',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		flex: 0.48,
		alignItems: 'center',
	},
	selectNoneButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	// Styles pour les entités enrichies
	entitiesContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8,
	},
	entityChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		borderWidth: 1,
		marginRight: 6,
		marginBottom: 4,
	},
	entityChipExisting: {
		backgroundColor: '#e8f5e8',
		borderColor: '#27ae60',
	},
	entityChipNew: {
		backgroundColor: '#fff3cd',
		borderColor: '#f39c12',
	},
	entityChipText: {
		fontSize: 12,
		fontWeight: '500',
		marginLeft: 4,
		color: '#2c3e50',
	},
});