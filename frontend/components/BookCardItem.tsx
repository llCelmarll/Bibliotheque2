import React from "react";
import { View, Text, StyleSheet, Image, Platform, TouchableOpacity } from "react-native";
import { Book } from "@/types/book"
import BookCover from "@/components/BookCover";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

interface BookCardItemProps {
	book: Book;
}

const COVER_RATIO = 2 / 3; // width / height (portrait)

export const BookCardItem: React.FC<BookCardItemProps> = ({ book }) => {
	const router = useRouter();
	const theme = useTheme();

	const handlePress = () => {
		router.push(`/(tabs)/books/${book.id}`)
	}

	return (
		<TouchableOpacity onPress={handlePress} style={[styles.card, { backgroundColor: theme.bgCard, borderRadius: theme.radiusCard, shadowColor: theme.accent }]}>

			{/* Couverture : ratio fixe + contain (pas de rognage) */}
			<BookCover
				url={book.cover_url}
				style={styles.cover}
				containerStyle={styles.coverContainer}
				resizeMode="contain"
			/>


			<View style={styles.info}>
				<Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>
					{book.title}
				</Text>

				{!!book.authors?.length && (
					<Text numberOfLines={1} style={[styles.author, { color: theme.textSecondary }]}>
						{book.authors.map(a => a.name).join(", ")}
					</Text>
				)}

				{!!book.publisher && (
					<Text numberOfLines={1} style={[styles.publisher, { color: theme.textMuted }]}>
						{book.publisher.name}
					</Text>
				)}

				{!!book.genres?.length && (
					<Text numberOfLines={1} style={[styles.genre, { color: theme.textMuted }]}>
						{book.genres.map(g => g.name).join(", ")}
					</Text>
				)}

				{!!book.page_count && (
					<Text style={[styles.meta, { color: theme.textMuted }]}>{book.page_count} p.</Text>
				)}
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	card: {
		overflow: "hidden",
		shadowOpacity: 0.07,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 3 },
		elevation: 3,
	},
	cover: {
		width: "100%",
		aspectRatio: COVER_RATIO,
	},
	coverContainer: {
		width: "100%",
		aspectRatio: COVER_RATIO,
	},
	info: {
		padding: 10,
		gap: 4,
	},
	title: {
		fontWeight: "600",
		fontSize: Platform.OS === "web" ? 15 : 16,
	},
	author: {
		fontSize: 13,
	},
	publisher: {
		fontSize: 12,
	},
	genre: {
		fontSize: 12,
	},
	meta: {
		fontSize: 12,
		marginTop: 2,
	},
});
