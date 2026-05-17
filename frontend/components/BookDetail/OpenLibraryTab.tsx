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
import { useTheme } from '@/contexts/ThemeContext';

export function OpenLibraryTab() {
	const route = useRoute();
	const { book } = route.params as { book: BookDetail };
	const theme = useTheme();

	const ol = book.open_library;

	if (!ol) {
		return (
			<View style={styles.container}>
				<Text style={[styles.value, { color: theme.textSecondary }]}>Aucune donnée Open Library disponible</Text>
			</View>
		);
	}

	const handleOpenLink = async (url: string) => {
		await WebBrowser.openBrowserAsync(url);
	};

	const renderLinks = () => {
		if (!ol.links || ol.links.length === 0) return null;
		return ol.links.map((link: any, index: number) => {
			if (typeof link.url !== 'string' || typeof link.title !== 'string') return null;
			return (
				<Pressable
					key={index}
					style={[styles.linkButton, { backgroundColor: theme.bgSecondary }]}
					onPress={() => handleOpenLink(link.url)}
				>
					<Ionicons name="open-outline" size={20} color={theme.accent} />
					<Text style={[styles.linkText, { color: theme.accent }]}>{link.title}</Text>
				</Pressable>
			);
		});
	};

	const renderOpenLibraryLink = () => {
		if (!ol.key) return null;
		const url = `https://openlibrary.org${ol.key}`;
		return (
			<Pressable
				style={[styles.linkButton, { backgroundColor: theme.bgSecondary }]}
				onPress={() => handleOpenLink(url)}
			>
				<Ionicons name="open-outline" size={20} color={theme.accent} />
				<Text style={[styles.linkText, { color: theme.accent }]}>Voir sur Open Library</Text>
			</Pressable>
		);
	};

	const renderSubjects = () => {
		if (!ol.subjects || ol.subjects.length === 0) {
			return <Text style={[styles.value, { color: theme.textSecondary }]}>Non renseigné</Text>;
		}
		return (
			<View style={styles.tags}>
				{ol.subjects.map((subject: string, index: number) => <Tag key={index} text={subject} />)}
			</View>
		);
	};

	const renderContributors = () => {
		if (!ol.contributors || ol.contributors.length === 0) {
			return <Text style={[styles.value, { color: theme.textSecondary }]}>Non renseigné</Text>;
		}
		return (
			<View style={styles.tags}>
				{ol.contributors.map((c: any, index: number) => {
					const label = typeof c === 'object' && c.name
						? (c.role ? `${c.name} (${c.role})` : c.name)
						: String(c);
					return <Tag key={index} text={label} />;
				})}
			</View>
		);
	};

	const publishersStr = ol.publishers?.length ? ol.publishers.join(', ') : 'Non renseigné';
	const publishPlacesStr = ol.publish_places?.length ? ol.publish_places.join(', ') : 'Non renseigné';

	return (
		<ScrollView style={styles.container}>
			<View style={styles.linksContainer}>
				{renderOpenLibraryLink()}
				{renderLinks()}
			</View>

			{ol.description && (
				<CollapsibleSection title="Description">
					<Text style={[styles.description, { color: theme.textPrimary }]}>
						{typeof ol.description === 'string' ? ol.description : ol.description?.value || 'Non renseigné'}
					</Text>
				</CollapsibleSection>
			)}

			<CollapsibleSection title="Détails de publication">
				<InfoRow label="Éditeurs" value={publishersStr} />
				<InfoRow label="Lieux de publication" value={publishPlacesStr} />
				<InfoRow label="Date de publication" value={ol.publish_date || 'Non renseigné'} />
				<InfoRow label="Nombre de pages" value={ol.number_of_pages ? ol.number_of_pages.toString() : 'Non renseigné'} />
				{ol.by_statement && <InfoRow label="Mention de responsabilité" value={ol.by_statement} />}
			</CollapsibleSection>

			<CollapsibleSection title="Autres titres">
				{!ol.other_titles || ol.other_titles.length === 0
					? <Text style={[styles.value, { color: theme.textSecondary }]}>Non renseigné</Text>
					: <Text style={[styles.text, { color: theme.textPrimary }]}>{ol.other_titles.join(', ')}</Text>
				}
			</CollapsibleSection>

			<CollapsibleSection title="Sujets">{renderSubjects()}</CollapsibleSection>
			<CollapsibleSection title="Contributeurs">{renderContributors()}</CollapsibleSection>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16 },
	description: { fontSize: 14, lineHeight: 20 },
	text: { fontSize: 14 },
	tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	value: { fontSize: 14 },
	linksContainer: { gap: 8, marginBottom: 16 },
	linkButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, gap: 8 },
	linkText: { fontSize: 16, fontWeight: '500', flex: 1 },
});
