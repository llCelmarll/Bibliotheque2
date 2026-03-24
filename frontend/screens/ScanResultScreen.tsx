// screens/ScanResultScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useScanResult } from '@/hooks/useScanResult';
import { ExistingBookCard } from "@/components/scan/ExistingBookCard";
import { BookForm } from "@/components/scan/BookForm";
import { ExternalDataSection} from "@/components/scan/ExternalDataSection";
import { SimilarBooksSection } from "@/components/scan/SimilarBooksSection";
import { bookService } from "@/services/bookService";
import { useTheme } from '@/contexts/ThemeContext';

interface ScanResultScreenProps {
	isbn?: string; // ISBN peut être passé directement en prop
}

export const ScanResultScreen: React.FC<ScanResultScreenProps> = ({ isbn: propIsbn }) => {
	const theme = useTheme();

	// Support pour les deux types de navigation (React Navigation et Expo Router)
	let isbn = propIsbn;

	// Si pas d'ISBN en prop, essayer de le récupérer des paramètres de route
	if (!isbn) {
		try {
			// Essayer Expo Router en premier
			const params = useLocalSearchParams();
			isbn = (params as any)?.isbn;
		} catch {
			// Fallback vers React Navigation
			try {
				const route = useRoute();
				isbn = (route.params as any)?.isbn;
			} catch {
				// Aucune navigation détectée
			}
		}
	}

	const { isLoading, error, data } = useScanResult(isbn || '');

	// État pour gérer les données du formulaire
	const [formData, setFormData] = useState<any>(null);

	if (!isbn) {
		return (
			<View style={styles.centerContainer}>
				<Text style={[styles.errorText, { color: theme.danger }]}>Aucun ISBN fourni</Text>
			</View>
		);
	}

	if (isLoading) return (
		<View style={styles.centerContainer}>
			<ActivityIndicator size="large" color={theme.accent} />
			<Text style={[styles.loadingText, { color: theme.accent }]}>Analyse de l'ISBN en cours...</Text>
		</View>
	);
	if (error) return (
		<View style={styles.centerContainer}>
			<Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
		</View>
	);
	if (!data) return (
		<View style={styles.centerContainer}>
			<Text style={[styles.errorText, { color: theme.danger }]}>Aucune donnée trouvée pour cet ISBN</Text>
		</View>
	);

	const handleFormSubmit = async (values: any) => {
		try {
			console.log('🚀 Début soumission du formulaire:', values);

			// Validation côté client
			const validation = bookService.validateBookData(values);
			if (!validation.isValid) {
				console.error('❌ Validation échouée:', validation.errors);
				// TODO: Afficher les erreurs à l'utilisateur
				return;
			}

			// Appel API pour créer le livre
			const createdBook = await bookService.createBook(values);

			console.log('✅ Livre créé avec succès! ID:', createdBook.id);
			// TODO: Navigation vers la fiche du livre créé ou message de succès

		} catch (error) {
			console.error('❌ Erreur lors de la soumission:', error);
			// TODO: Afficher un message d'erreur à l'utilisateur
		}
	};

	const handleImportData = (source: 'google' | 'openLibrary', importedData: any) => {
		try {
			console.log('Import de données depuis', source, ':', importedData);

			// Fusionner avec les données existantes du formulaire
			const currentData = formData || data.suggested;
			const updatedFormData = {
				...currentData,
				// Mapper les données importées vers la structure SuggestedBook
				title: importedData.title || currentData?.title || '',
				authors: importedData.authors || currentData?.authors || [],
				publisher: importedData.publisher || currentData?.publisher || '',
				published_date: importedData.publishedDate || currentData?.published_date || '',
				page_count: importedData.pageCount || currentData?.page_count || 0,
				isbn: importedData.isbn || currentData?.isbn || '',
				genres: importedData.genres || currentData?.genres || [], // Use 'genres' not 'categories'
				cover_url: importedData.thumbnail || currentData?.cover_url || '',
				barcode: currentData?.barcode || '',
			};

			setFormData(updatedFormData);

		} catch (error) {
			console.error('Erreur lors de l\'import:', error);
		}
	};

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.bgSecondary }]} contentContainerStyle={styles.contentContainer}>
			{/* Livre existant trouvé */}
			{data.base && (
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Livre trouvé dans votre bibliothèque</Text>
					<ExistingBookCard
						book={data.base}
						onPress={() => {
							// TODO: Navigation vers les détails du livre
							console.log('Navigation vers les détails du livre:', data.base?.id);
						}}
					/>
				</View>
			)}

			{/* Formulaire de suggestion */}
			{data.suggested && (
				<View style={styles.section}>
					<BookForm
						initialData={formData || data.suggested}
						onSubmit={handleFormSubmit}
						key={formData ? 'updated' : 'initial'} // Force re-render when formData changes
					/>
				</View>
			)}

			{/* Livres similaires */}
			{data.title_match && data.title_match.length > 0 && (
				<View style={styles.section}>
					<SimilarBooksSection
						books={data.title_match}
						onSelectBook={(book) => {
							console.log('Livre similaire sélectionné:', book.id);
						}}
					/>
				</View>
			)}

			{/* Données externes */}
			<View style={styles.section}>
				<ExternalDataSection
					googleData={data.google_book}
					openLibraryData={data.openlibrary}
					onImportData={handleImportData}
				/>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		padding: 16,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		fontWeight: '500',
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		fontWeight: '500',
	},
	section: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 12,
		textAlign: 'center',
	},
});
