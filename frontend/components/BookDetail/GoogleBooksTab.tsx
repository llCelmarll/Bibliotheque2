// GoogleBooksTab.tsx
import React from 'react';
import {ScrollView, Text, View, StyleSheet, Pressable} from "react-native";
import {BookDetail} from "@/types/book";
import {InfoRow} from "@/components/BookDetail/InfoRow";
import {Tag} from "@/components/BookDetail/Tag";
import { useRoute } from "@react-navigation/native";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {Ionicons} from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser';

export function GoogleBooksTab() {
	const route = useRoute();
	const { book } = route.params as { book: BookDetail };

	const handleOpenGoogleBooks = async () => {
		if (book.google_books.infoLink) {
			await WebBrowser.openBrowserAsync(book.google_books.infoLink);
		}
	};


	const renderCategories = () => {
		if (!book.google_books.categories || book.google_books.categories.length === 0) {
			return <Text style={styles.value}>Non renseigné</Text>;
		}
		return (
			<View style={styles.categories}>
				{book.google_books.categories.map((category, index) => (
					<Tag key={index} text={category} />
				))}
			</View>
		);
	};

	return (
		<ScrollView style={styles.container}>

			{book.google_books.infoLink && (
				<Pressable
					style={styles.linkButton}
					onPress={handleOpenGoogleBooks}
				>
					<Ionicons name="open-outline" size={20} color="#007AFF" />
					<Text style={styles.linkText}>Voir sur Google Books</Text>
				</Pressable>
			)}

			<CollapsibleSection title="Description" defaultExpanded={!!book.google_books.description}>
				<Text style={styles.description}>
					{book.google_books.description || 'Non renseigné'}
				</Text>
			</CollapsibleSection>

			<CollapsibleSection title="Details">
				<InfoRow
					label={book.google_books.authors.length > 1 ? "Auteurs" : "Auteur"}
					value={book.google_books.authors.join(", ") || 'Non reseigné'}
				/>
				<InfoRow
					label="Éditeur" 
					value={book.google_books.publisher || 'Non renseigné'} 
				/>
				<InfoRow 
					label="Date de publication" 
					value={book.google_books.publishedDate || 'Non renseigné'} 
				/>
				<InfoRow 
					label="Langue" 
					value={book.google_books.language || 'Non renseigné'} 
				/>
				<InfoRow 
					label="Pages" 
					value={book.google_books.pageCount ? book.google_books.pageCount.toString() : 'Non renseigné'} 
				/>
				<InfoRow
					label="Sous-titre"
					value={book.google_books.subtitle || 'Non renseigné'}
				/>
			</CollapsibleSection>

			<CollapsibleSection title="Categories" defaultExpanded={!!book.google_books.categories?.length}>
				{renderCategories()}
			</CollapsibleSection>



		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
		color: '#333',
	},
	categories: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	value: {
		fontSize: 14,
		color: '#666',
	},
	linkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		gap: 8,
	},
	linkText: {
		color: '#007AFF',
		fontSize: 16,
		fontWeight: '500',
	},

});