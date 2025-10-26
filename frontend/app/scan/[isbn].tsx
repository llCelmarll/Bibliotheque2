// app/scan/[isbn].tsx
import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScanResult } from '@/hooks/useScanResult';
import { ExistingBookCard } from "@/components/scan/ExistingBookCard";
import { SuggestedBookForm } from "@/components/scan/SuggestedBookForm";
import { ExternalDataSection} from "@/components/scan/ExternalDataSection";
import { SimilarBooksSection } from "@/components/scan/SimilarBooksSection";
import { SuggestedBook } from "@/types/scanTypes";
import { bookService } from "@/services/bookService";

// Composants utilitaires simples
const LoadingIndicator: React.FC = () => (
	<View style={styles.centerContainer}>
		<ActivityIndicator size="large" color="#3498db" />
		<Text style={styles.loadingText}>Analyse de l'ISBN en cours...</Text>
		<Text style={styles.loadingSubtext}>
			Recherche dans votre bibliothèque et sur les services externes
		</Text>
	</View>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
	<View style={styles.centerContainer}>
		<Text style={styles.errorText}>{message}</Text>
	</View>
);

export default function ScanResultPage() {
	const { isbn } = useLocalSearchParams<{ isbn: string }>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { isLoading, error, data } = useScanResult(isbn || '');
	
	// État pour gérer les données du formulaire et le feedback
	const [formData, setFormData] = useState<SuggestedBook | null>(null);
	const [importFeedback, setImportFeedback] = useState<{
		visible: boolean;
		message: string;
		source: string;
	}>({ visible: false, message: '', source: '' });
	
	// Animation pour le feedback
	const fadeAnim = useRef(new Animated.Value(0)).current;

	if (!isbn) {
		return <ErrorMessage message="Aucun ISBN fourni" />;
	}

	if (isLoading) return <LoadingIndicator />;
	if (error) return <ErrorMessage message={error} />;
	if (!data) return <ErrorMessage message="Aucune donnée trouvée pour cet ISBN" />;

	const showImportFeedback = (source: string, count: number) => {
		const sourceName = source === 'google' ? 'Google Books' : 'OpenLibrary';
		setImportFeedback({
			visible: true,
			message: `${count} donnée(s) importée(s) depuis ${sourceName}`,
			source: sourceName
		});

		// Animation d'apparition
		Animated.sequence([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.delay(2500),
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start(() => {
			setImportFeedback({ visible: false, message: '', source: '' });
		});
	};

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
			
			// Navigation vers la fiche du livre créé
			router.push(`/(tabs)/books/${createdBook.id}`);
			
		} catch (error) {
			console.error('❌ Erreur lors de la soumission:', error);
			// TODO: Afficher un message d'erreur à l'utilisateur
		}
	};

	const handleImportData = (source: 'google' | 'openLibrary', importedData: any) => {
		try {
			console.log('Import de données depuis', source, ':', importedData);
			
			// Compter les champs importés
			const importedFields = Object.keys(importedData).filter(key => 
				importedData[key] !== null && 
				importedData[key] !== undefined && 
				importedData[key] !== ''
			);
			
			// Fusionner avec les données existantes du formulaire
			const currentData = formData || data.suggested;
			const updatedFormData: SuggestedBook = {
				...currentData,
				// Mapper les données importées vers la structure SuggestedBook
				title: importedData.title || currentData?.title || '',
				authors: importedData.authors || currentData?.authors || [],
				publisher: importedData.publisher || currentData?.publisher || '',
				published_date: importedData.publishedDate || currentData?.published_date || '',
				page_count: importedData.pageCount || currentData?.page_count || 0,
				isbn: importedData.isbn || currentData?.isbn || '',
				genres: importedData.genres || currentData?.genres || [], // Fixed: use 'genres' not 'categories'
				cover_url: importedData.thumbnail || currentData?.cover_url || '',
				barcode: currentData?.barcode || '',
			};
			
			setFormData(updatedFormData);
			showImportFeedback(source, importedFields.length);
			
		} catch (error) {
			console.error('Erreur lors de l\'import:', error);
		}
	};

	return (
		<View style={styles.container}>
			{/* Header avec bouton retour et ISBN */}
			<View style={[styles.header, { paddingTop: insets.top + 10 }]}>
				<TouchableOpacity 
					style={styles.backButton}
					onPress={() => router.push('/(tabs)/scanner')}
				>
					<MaterialIcons name="arrow-back" size={24} color="#ffffff" />
				</TouchableOpacity>
				<Text style={styles.isbnTitle}>ISBN: {isbn}</Text>
				<TouchableOpacity 
					style={styles.scanButton}
					onPress={() => router.push('/(tabs)/scanner')}
				>
					<MaterialIcons name="qr-code-scanner" size={24} color="#ffffff" />
				</TouchableOpacity>
			</View>

			{/* Feedback d'import */}
			{importFeedback.visible && (
				<Animated.View 
					style={[styles.importFeedback, { opacity: fadeAnim }]}
				>
					<MaterialIcons name="check-circle" size={20} color="#27ae60" />
					<Text style={styles.importFeedbackText}>
						{importFeedback.message}
					</Text>
				</Animated.View>
			)}

			<ScrollView contentContainerStyle={styles.contentContainer}>
				{/* Livre existant trouvé */}
				{data.base && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Livre trouvé dans votre bibliothèque</Text>
						<ExistingBookCard
							book={data.base}
							onPress={() => {
								// Navigation vers les détails du livre
								router.push(`/(tabs)/books/${data.base?.id}`);
							}}
						/>
					</View>
				)}

				{/* Formulaire de suggestion - seulement si le livre n'existe pas déjà */}
				{data.suggested && !data.base && (
					<View style={styles.section}>
						<SuggestedBookForm
							initialData={formData || data.suggested}
							onSubmit={handleFormSubmit}
							key={formData ? 'updated' : 'initial'} // Force re-render quand formData change
						/>
					</View>
				)}

				{/* Données externes - seulement si le livre n'existe pas déjà */}
				{!data.base && (
					<View style={styles.section}>
						<ExternalDataSection
							googleData={data.google_book}
							openLibraryData={data.openlibrary}
							onImportData={handleImportData}
						/>
					</View>
				)}

				{/* Livres similaires */}
				{data.title_match && data.title_match.length > 0 && (
					<View style={styles.section}>
						<SimilarBooksSection 
							books={data.title_match} 
							onSelectBook={(book) => {
								router.push(`/(tabs)/books/${book.id}`);
							}}
						/>
					</View>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
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
		color: '#3498db',
		fontWeight: '500',
	},
	loadingSubtext: {
		marginTop: 8,
		fontSize: 14,
		color: '#7f8c8d',
		textAlign: 'center',
		paddingHorizontal: 20,
	},
	errorText: {
		fontSize: 16,
		color: '#e74c3c',
		textAlign: 'center',
		fontWeight: '500',
	},
	header: {
		backgroundColor: '#3498db',
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backButton: {
		padding: 8,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	scanButton: {
		padding: 8,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	isbnTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#ffffff',
		flex: 1,
		textAlign: 'center',
	},
	section: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#2c3e50',
		marginBottom: 12,
		textAlign: 'center',
	},
	importFeedback: {
		backgroundColor: '#d4edda',
		borderColor: '#27ae60',
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		margin: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	importFeedbackText: {
		color: '#155724',
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 8,
		flex: 1,
		textAlign: 'center',
	},
});