// OpenLibraryTab.tsx
import React from 'react';
import {ScrollView, Text, View, StyleSheet, Pressable} from "react-native";
import {BookDetail} from "@/types/book";
import {InfoRow} from "@/components/BookDetail/InfoRow";
import {Tag} from "@/components/BookDetail/Tag";
import { useRoute } from "@react-navigation/native";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

export function OpenLibraryTab() {
	const route = useRoute();
	const { book } = route.params as { book: BookDetail };

	const handleOpenLink = async (url: string) => {
		await WebBrowser.openBrowserAsync(url);
	};

	const renderLinks = () => {
		if (!book.open_library.links || book.open_library.links.length === 0) {
			return null;
		}

		return book.open_library.links.map((link, index) => {
			// Vérifier que le lien a une URL et un titre valides
			if (typeof link.url !== 'string' || typeof link.title !== 'string') {
				return null;
			}

			return (
				<Pressable
					key={index}
					style={styles.linkButton}
					onPress={() => handleOpenLink(link.url)}
				>
					<Ionicons name="open-outline" size={20} color="#007AFF" />
					<Text style={styles.linkText}>{link.title}</Text>
				</Pressable>
			);
		});
	};

	// Ajout d'un lien vers Open Library basé sur la clé du livre
	const renderOpenLibraryLink = () => {
		if (!book.open_library.key) return null;

		const openLibraryUrl = `https://openlibrary.org${book.open_library.key}`;
		return (
			<Pressable
				style={styles.linkButton}
				onPress={() => handleOpenLink(openLibraryUrl)}
			>
				<Ionicons name="open-outline" size={20} color="#007AFF" />
				<Text style={styles.linkText}>Voir sur Open Library</Text>
			</Pressable>
		);
	};



	const renderSubjects = () => {
		if (!book.open_library.subjects || book.open_library.subjects.length === 0) {
			return <Text style={styles.value}>Non renseigné</Text>;
		}
		return (
			<View style={styles.tags}>
				{book.open_library.subjects.map((subject, index) => (
					<Tag key={index} text={subject} />
				))}
			</View>
		);
	};

	const renderContributors = () => {

		if (!book.open_library.contributors || book.open_library.contributors.length === 0) {
			return <Text style={styles.value}>Non renseigné</Text>;
		}
		return (
			<View style={styles.tags}>
				{book.open_library.contributors.map((contributor, index) => {
					// Si c'est un objet avec role et name
					if (typeof contributor === 'object' && contributor.role && contributor.name) {
						return (
							<Tag
								key={index}
								text={`${contributor.name} (${contributor.role})`}
							/>
						);
					}
					// Si c'est une chaîne
					if (typeof contributor === 'string') {
						return (
							<Tag
								key={index}
								text={contributor}
							/>
						);
					}
					return null;
				})}
			</View>
		);
	};



	const renderPublishers = () => {
    if (!book.open_library.publishers || book.open_library.publishers.length === 0) {
        return 'Non renseigné';
    }
    return book.open_library.publishers.join(", ");
};

const renderPublishPlaces = () => {
    if (!book.open_library.publish_places || book.open_library.publish_places.length === 0) {
        return 'Non renseigné';
    }
    return book.open_library.publish_places.join(", ");
};

	return (
		<ScrollView style={styles.container}>
			<View style={styles.linksContainer}>
				{renderOpenLibraryLink()}
				{renderLinks()}
			</View>

			{book.open_library.description && (
				<CollapsibleSection title="Description">
					<Text style={styles.description}>
						{typeof book.open_library.description === 'string'
							? book.open_library.description
							: book.open_library.description?.value || 'Non renseigné'}
					</Text>
				</CollapsibleSection>
			)}


			<CollapsibleSection title="Détails de publication">
				<InfoRow
					label="Éditeurs"
					value={renderPublishers()}
				/>
				<InfoRow
					label="Lieux de publication"
					value={renderPublishPlaces()}
				/>
				<InfoRow
					label="Date de publication"
					value={book.open_library.publish_date || 'Non renseigné'}
				/>
				<InfoRow
					label="Nombre de pages"
					value={book.open_library.number_of_pages ? book.open_library.number_of_pages.toString() : 'Non renseigné'}
				/>
				{book.open_library.by_statement &&(
					<InfoRow
						label="Mention de responsabilité"
						value={book.open_library.by_statement || 'Non renseigné'}
					/>
				)}
			</CollapsibleSection>

			<CollapsibleSection title="Autres titres">
				{!book.open_library.other_titles || book.open_library.other_titles.length === 0 ? (
					<Text style={styles.value}>Non renseigné</Text>
				) : (
					<Text style={styles.text}>{book.open_library.other_titles.join(", ")}</Text>
				)}
			</CollapsibleSection>

			<CollapsibleSection title="Sujets">
				{renderSubjects()}
			</CollapsibleSection>

			<CollapsibleSection title="Contributeurs">
				{renderContributors()}
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
	text: {
		fontSize: 14,
		color: '#333',
	},
	tags: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	value: {
		fontSize: 14,
		color: '#666',
	},
	linksContainer: {
		gap: 8,
		marginBottom: 16,
	},
	linkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		padding: 12,
		borderRadius: 8,
		gap: 8,
	},
	linkText: {
		color: '#007AFF',
		fontSize: 16,
		fontWeight: '500',
		flex: 1,
	},

});