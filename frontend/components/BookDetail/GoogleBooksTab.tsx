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
import { useTheme } from '@/contexts/ThemeContext';

export function GoogleBooksTab() {
	const route = useRoute();
	const { book } = route.params as { book: BookDetail };
	const theme = useTheme();

	const googleBooks = book.google_books;

	if (!googleBooks) {
		return (
			<View style={styles.container}>
				<Text style={[styles.value, { color: theme.textSecondary }]}>Aucune donnée Google Books disponible</Text>
			</View>
		);
	}

	const handleOpenGoogleBooks = async () => {
		if (googleBooks?.infoLink) {
			await WebBrowser.openBrowserAsync(googleBooks.infoLink);
		}
	};

	const renderCategories = () => {
		if (!googleBooks?.categories || googleBooks.categories.length === 0) {
			return <Text style={[styles.value, { color: theme.textSecondary }]}>Non renseigné</Text>;
		}
		return (
			<View style={styles.categories}>
				{googleBooks.categories.map((category: string, index: number) => (
					<Tag key={index} text={category} />
				))}
			</View>
		);
	};

	return (
		<ScrollView style={styles.container}>

			{googleBooks?.infoLink && (
				<Pressable
					style={[styles.linkButton, { backgroundColor: theme.bgSecondary }]}
					onPress={handleOpenGoogleBooks}
				>
					<Ionicons name="open-outline" size={20} color={theme.accent} />
					<Text style={[styles.linkText, { color: theme.accent }]}>Voir sur Google Books</Text>
				</Pressable>
			)}

			<CollapsibleSection title="Description" defaultExpanded={!!googleBooks?.description}>
				<Text style={[styles.description, { color: theme.textPrimary }]}>
					{googleBooks?.description || 'Non renseigné'}
				</Text>
			</CollapsibleSection>

			<CollapsibleSection title="Details">
				<InfoRow
					label={googleBooks?.authors && googleBooks.authors.length > 1 ? "Auteurs" : "Auteur"}
					value={googleBooks?.authors ? googleBooks.authors.join(", ") : 'Non renseigné'}
				/>
				<InfoRow
					label="Éditeur"
					value={googleBooks?.publisher || 'Non renseigné'}
				/>
				<InfoRow
					label="Date de publication"
					value={googleBooks?.publishedDate || 'Non renseigné'}
				/>
				<InfoRow
					label="Langue"
					value={googleBooks?.language || 'Non renseigné'}
				/>
				<InfoRow
					label="Pages"
					value={googleBooks?.pageCount ? googleBooks.pageCount.toString() : 'Non renseigné'}
				/>
				<InfoRow
					label="Sous-titre"
					value={googleBooks?.subtitle || 'Non renseigné'}
				/>
			</CollapsibleSection>

			<CollapsibleSection title="Categories" defaultExpanded={!!googleBooks?.categories?.length}>
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
	},
	categories: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	value: {
		fontSize: 14,
	},
	linkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		gap: 8,
	},
	linkText: {
		fontSize: 16,
		fontWeight: '500',
	},

});
