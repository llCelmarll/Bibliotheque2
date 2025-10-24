// screens/ScanResultScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useScanResult } from '@/hooks/useScanResult';
import { ExistingBookCard } from "@/components/scan/ExistingBookCard";
import { SuggestedBookForm } from "@/components/scan/SuggestedBookForm";
import { ExternalDataSection} from "@/components/scan/ExternalDataSection";
import { SimilarBooksSection } from "@/components/scan/SimilarBooksSection";

// Composants utilitaires simples
const LoadingIndicator: React.FC = () => (
	<View style={styles.centerContainer}>
		<ActivityIndicator size="large" color="#3498db" />
		<Text style={styles.loadingText}>Analyse de l'ISBN en cours...</Text>
	</View>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
	<View style={styles.centerContainer}>
		<Text style={styles.errorText}>{message}</Text>
	</View>
);

interface ScanResultScreenProps {
	isbn?: string; // ISBN peut être passé directement en prop
}

export const ScanResultScreen: React.FC<ScanResultScreenProps> = ({ isbn: propIsbn }) => {
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

	if (!isbn) {
		return <ErrorMessage message="Aucun ISBN fourni" />;
	}

	if (isLoading) return <LoadingIndicator />;
	if (error) return <ErrorMessage message={error} />;
	if (!data) return <ErrorMessage message="Aucune donnée trouvée pour cet ISBN" />;

	if (isLoading) return <LoadingIndicator />;
	if (error) return <ErrorMessage message={error} />;
	if (!data) return <ErrorMessage message="Aucune donnée trouvée" />;

	const handleFormSubmit = async (values: any) => {
		try {
			// TODO: Implémenter la logique de soumission
			console.log('Soumission du formulaire:', values);
		} catch (error) {
			console.error('Erreur lors de la soumission:', error);
		}
	};

	const handleImportData = (source: 'google' | 'openLibrary', importedData: any) => {
		try {
			// TODO: Implémenter la logique d'import
			console.log('Import de données depuis', source, ':', importedData);
		} catch (error) {
			console.error('Erreur lors de l\'import:', error);
		}
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
			{/* Livre existant trouvé */}
			{data.base && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Livre trouvé dans votre bibliothèque</Text>
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
					<SuggestedBookForm
						initialData={data.suggested}
						onSubmit={handleFormSubmit}
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
	errorText: {
		fontSize: 16,
		color: '#e74c3c',
		textAlign: 'center',
		fontWeight: '500',
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
});