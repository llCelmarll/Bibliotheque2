// components/scan/ExternalDataSection.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { entityService } from '@/services/entityService';
import { Author, Publisher, Genre } from '@/types/entityTypes';
import { useTheme } from '@/contexts/ThemeContext';

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
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState<'google' | 'openLibrary'>('google');
	const [selectedData, setSelectedData] = useState<{[key: string]: boolean}>({
		title: false,
		subtitle: false,
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
					subtitle: data.subtitle,
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
			subtitle: false,
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
		const iconName = entity.exists ? 'check-circle' : 'add-circle';
		const iconColor = entity.exists ? theme.success : theme.warning;
		const chipBg = entity.exists ? theme.successBg : theme.warningBg;
		const chipBorder = entity.exists ? theme.success : theme.warning;

		return (
			<View key={`${type}-${entity.id || entity.name}`} style={[styles.entityChip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
				<MaterialIcons name={iconName} size={14} color={iconColor} />
				<Text style={[styles.entityChipText, { color: theme.textPrimary }]}>{entity.name}</Text>
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
					style={[styles.dataItem, { backgroundColor: theme.bgCard, borderLeftColor: theme.accent }, isSelected && { backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 2 }]}
					onPress={() => toggleSelection(key)}
				>
					<View style={styles.dataItemHeader}>
						<Text style={[styles.dataLabel, { color: theme.textMuted }]}>{label}</Text>
						{isEnriching ? (
							<MaterialIcons name="hourglass-empty" size={20} color={theme.warning} />
						) : (
							<MaterialIcons
								name={isSelected ? 'check-box' : 'check-box-outline-blank'}
								size={20}
								color={isSelected ? theme.success : theme.borderMedium}
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
					style={[styles.dataItem, { backgroundColor: theme.bgCard, borderLeftColor: theme.accent }, isSelected && { backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 2 }]}
					onPress={() => toggleSelection(key)}
				>
					<View style={styles.dataItemHeader}>
						<Text style={[styles.dataLabel, { color: theme.textMuted }]}>{label}</Text>
						{isEnriching ? (
							<MaterialIcons name="hourglass-empty" size={20} color={theme.warning} />
						) : (
							<MaterialIcons
								name={isSelected ? 'check-box' : 'check-box-outline-blank'}
								size={20}
								color={isSelected ? theme.success : theme.borderMedium}
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
					style={[styles.dataItem, { backgroundColor: theme.bgCard, borderLeftColor: theme.accent }, isSelected && { backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 2 }]}
					onPress={() => toggleSelection(key)}
				>
					<View style={styles.dataItemHeader}>
						<Text style={[styles.dataLabel, { color: theme.textMuted }]}>Genres</Text>
						{isEnriching ? (
							<MaterialIcons name="hourglass-empty" size={20} color={theme.warning} />
						) : (
							<MaterialIcons
								name={isSelected ? 'check-box' : 'check-box-outline-blank'}
								size={20}
								color={isSelected ? theme.success : theme.borderMedium}
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
				style={[styles.dataItem, { backgroundColor: theme.bgCard, borderLeftColor: theme.accent }, isSelected && { backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 2 }]}
				onPress={() => toggleSelection(key)}
			>
				<View style={styles.dataItemHeader}>
					<Text style={[styles.dataLabel, { color: theme.textMuted }]}>{label}</Text>
					<MaterialIcons
						name={isSelected ? 'check-box' : 'check-box-outline-blank'}
						size={20}
						color={isSelected ? theme.success : theme.borderMedium}
					/>
				</View>
				<Text style={[styles.dataValue, { color: theme.textPrimary }, key === 'isbn' && { backgroundColor: theme.bgSecondary }]}>
					{displayValue}
				</Text>
			</TouchableOpacity>
		);
	};

	const renderExploitableData = (bookInfo: any) => {
		if (!bookInfo) return null;

		return (
			<View style={[styles.exploitableSection, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
				<Text style={[styles.subsectionTitle, { color: theme.textPrimary }]}>📋 Sélectionnez les données à importer</Text>
				<Text style={[styles.subsectionSubtitle, { color: theme.textMuted }]}>Cliquez sur les éléments pour les sélectionner/désélectionner</Text>
				
				<View style={styles.exploitableGrid}>
					{renderCheckableDataItem('title', 'Titre', bookInfo.title, selectedData.title)}
					{renderCheckableDataItem('subtitle', 'Sous-titre', bookInfo.subtitle, selectedData.subtitle)}
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
						style={[styles.selectAllButton, { backgroundColor: theme.success }]}
						onPress={() => setSelectedData({
							title: true,
							subtitle: true,
							authors: true,
							publisher: true,
							publishedDate: true,
							pageCount: true,
							isbn: true,
							categories: true,
							thumbnail: true,
						})}
					>
						<Text style={[styles.selectAllButtonText, { color: theme.textInverse }]}>✓ Tout sélectionner</Text>
					</TouchableOpacity>
					
					<TouchableOpacity
						style={[styles.selectNoneButton, { backgroundColor: theme.danger }]}
						onPress={() => setSelectedData({
							title: false,
							subtitle: false,
							authors: false,
							publisher: false,
							publishedDate: false,
							pageCount: false,
							isbn: false,
							categories: false,
							thumbnail: false,
						})}
					>
						<Text style={[styles.selectNoneButtonText, { color: theme.textInverse }]}>✗ Tout désélectionner</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	const renderRawData = (data: any, source: 'google' | 'openLibrary') => {
		if (!data) return null;

		const isUrl = (val: any): val is string =>
			typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));

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

		const renderRawValue = (key: string, value: any) => {
			// Valeur unique qui est une URL
			if (isUrl(value)) {
				return (
					<TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(value)}>
						<Text style={[styles.rawDataValue, styles.rawDataLink, { color: theme.accent }]} numberOfLines={2}>
							{value}
						</Text>
					</TouchableOpacity>
				);
			}
			// Tableau contenant des URLs (ex: links dans OpenLibrary)
			if (Array.isArray(value) && value.length > 0 && value.every((v: any) => typeof v === 'object' && v.url)) {
				return (
					<View>
						{value.map((item: any, i: number) => (
							<TouchableOpacity key={i} onPress={() => WebBrowser.openBrowserAsync(item.url)}>
								<Text style={[styles.rawDataValue, styles.rawDataLink, { color: theme.accent }]} numberOfLines={1}>
									{item.title || item.url}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				);
			}
			return (
				<Text style={[styles.rawDataValue, { color: theme.textSecondary }]} numberOfLines={3}>
					{renderValue(value)}
				</Text>
			);
		};

		return (
			<View style={[styles.rawDataSection, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }]}>
				<Text style={[styles.subsectionTitle, { color: theme.textPrimary }]}>🔍 Toutes les informations détaillées</Text>

				<ScrollView style={styles.rawDataScroll} nestedScrollEnabled>
					{Object.entries(data).map(([key, value]) => (
						<View key={key} style={[styles.rawDataItem, { backgroundColor: theme.bgCard, borderLeftColor: theme.borderMedium }]}>
							<Text style={[styles.rawDataKey, { color: theme.textSecondary }]}>{key}</Text>
							{renderRawValue(key, value)}
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
					<Text style={[styles.noDataText, { color: theme.textMuted }]}>
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
							style={[styles.thumbnail, { borderColor: theme.borderLight }]}
							resizeMode="cover"
						/>
					</View>
				)}

				{/* Section des données exploitables */}
				{renderExploitableData(bookInfo.exploitable)}

				{/* Bouton d'import */}
				<TouchableOpacity
					style={[styles.importButton, { backgroundColor: theme.success }, !hasSelectedData() && { backgroundColor: theme.borderMedium, opacity: 0.7 }]}
					onPress={() => handleImport(bookInfo.exploitable, source)}
					disabled={!hasSelectedData()}
				>
					<Text style={[styles.importButtonText, { color: theme.textInverse }, !hasSelectedData() && { opacity: 0.8 }]}>
						✅ Importer les données sélectionnées ({getSelectedCount()})
					</Text>
				</TouchableOpacity>

				{/* Section des données brutes détaillées */}
				{renderRawData(bookInfo.raw, source)}
			</ScrollView>
		);
	};

	const hasGoogleData = !!googleData;
	const hasOpenLibraryData = !!openLibraryData;

	if (!hasGoogleData && !hasOpenLibraryData && !googleError && !openLibraryError) {
		return (
			<View style={styles.container}>
				<Text style={styles.sectionTitle}>Données externes</Text>
				<View style={styles.noDataContainer}>
					<Text style={[styles.noDataText, { color: theme.textMuted }]}>
						Aucune donnée externe disponible
					</Text>
				</View>
			</View>
		);
	}

	const renderErrorBanner = (error: string) => (
		<View style={[styles.errorBanner, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
			<MaterialIcons name="warning" size={20} color={theme.warning} />
			<Text style={[styles.errorBannerText, { color: theme.warning }]}>{error}</Text>
		</View>
	);

	return (
		<View style={[styles.container, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
			<Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Données externes</Text>

			{/* Bandeaux d'erreur en haut, toujours visibles */}
			{googleError && renderErrorBanner(googleError)}
			{openLibraryError && renderErrorBanner(openLibraryError)}

			{/* Tabs + Content — uniquement si au moins une source a des données */}
			{(hasGoogleData || hasOpenLibraryData) && (
				<>
					<View style={[styles.tabContainer, { backgroundColor: theme.bgMuted }]}>
						{hasGoogleData && (
							<TouchableOpacity
								style={[styles.tab, activeTab === 'google' && { backgroundColor: theme.accent }]}
								onPress={() => setActiveTab('google')}
							>
								<Text style={[styles.tabText, { color: theme.textMuted }, activeTab === 'google' && { color: theme.textInverse }]}>
									Google Books
								</Text>
							</TouchableOpacity>
						)}

						{hasOpenLibraryData && (
							<TouchableOpacity
								style={[styles.tab, activeTab === 'openLibrary' && { backgroundColor: theme.accent }]}
								onPress={() => setActiveTab('openLibrary')}
							>
								<Text style={[styles.tabText, { color: theme.textMuted }, activeTab === 'openLibrary' && { color: theme.textInverse }]}>
									OpenLibrary
								</Text>
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.contentContainer}>
						{activeTab === 'google' && renderBookInfo(googleData, 'google')}
						{activeTab === 'openLibrary' && renderBookInfo(openLibraryData, 'openLibrary')}
					</View>
				</>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 12,
		margin: 16,
		borderWidth: 1,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 16,
		textAlign: 'center',
	},
	tabContainer: {
		flexDirection: 'row',
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
	tabText: {
		fontSize: 14,
		fontWeight: '500',
	},
	contentContainer: {
		minHeight: 300,
	},
	errorBanner: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
	},
	errorBannerText: {
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
	},
	// Section des données exploitables
	exploitableSection: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		borderWidth: 2,
	},
	subsectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	subsectionSubtitle: {
		fontSize: 12,
		textAlign: 'center',
		marginBottom: 16,
		fontStyle: 'italic',
	},
	exploitableGrid: {
		gap: 12,
	},
	dataItem: {
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 4,
	},
	dataLabel: {
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'uppercase',
		marginBottom: 4,
	},
	dataValue: {
		fontSize: 14,
		lineHeight: 20,
	},
	isbnValue: {
		fontFamily: 'monospace',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	// Section des données brutes
	rawDataSection: {
		borderRadius: 12,
		padding: 16,
		marginTop: 20,
		borderWidth: 1,
	},
	rawDataScroll: {
		maxHeight: 300,
	},
	rawDataItem: {
		borderRadius: 6,
		padding: 10,
		marginBottom: 8,
		borderLeftWidth: 3,
	},
	rawDataKey: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4,
		textTransform: 'capitalize',
	},
	rawDataValue: {
		fontSize: 13,
		lineHeight: 18,
		fontFamily: 'monospace',
	},
	rawDataLink: {
		textDecorationLine: 'underline',
		fontFamily: undefined,
	},
	// Bouton d'import amélioré
	importButton: {
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		alignItems: 'center',
		marginVertical: 20,
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	importButtonText: {
		fontSize: 16,
		fontWeight: '600',
	},
	importButtonDisabled: {
		opacity: 0.7,
	},
	importButtonTextDisabled: {
		opacity: 0.8,
	},
	dataItemSelected: {
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
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		flex: 0.48,
		alignItems: 'center',
	},
	selectAllButtonText: {
		fontSize: 14,
		fontWeight: '600',
	},
	selectNoneButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		flex: 0.48,
		alignItems: 'center',
	},
	selectNoneButtonText: {
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
	entityChipText: {
		fontSize: 12,
		fontWeight: '500',
		marginLeft: 4,
	},
});