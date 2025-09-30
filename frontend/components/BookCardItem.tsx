import React from "react";
import { View, Text, StyleSheet, Image, Platform } from "react-native";
import { Book } from "@/services/books";
import BookCover from "@/components/BookCover";

interface BookCardItemProps {
	book: Book;
}

const COVER_RATIO = 2 / 3; // width / height (portrait)

export const BookCardItem: React.FC<BookCardItemProps> = ({ book }) => {
	const cover = book.cover_url || "https://via.placeholder.com/300x450?text=Couverture";

	return (
		<View style={styles.card}>
			{/* Couverture : ratio fixe + contain (pas de rognage) */}
			<BookCover
				url={book.cover_url}
				style={styles.cover}
				containerStyle={styles.coverContainer}
				resizeMode="contain"
			/>


			<View style={styles.info}>
				<Text numberOfLines={2} style={styles.title}>
					{book.title}
				</Text>

				{!!book.authors?.length && (
					<Text numberOfLines={1} style={styles.author}>
						{book.authors.map(a => a.name).join(", ")}
					</Text>
				)}

				{!!book.publisher && (
					<Text numberOfLines={1} style={styles.publisher}>
						{book.publisher.name}
					</Text>
				)}

				{!! book.genres?.length && (
					<Text numberOfLines={1} style={styles.genre}>
						{book.genres.map(g => g.name).join(", ")}
					</Text>
				)}

				{!!book.page_count && (
					<Text style={styles.meta}>{book.page_count} p.</Text>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#fff",
		borderRadius: 12,
		overflow: "hidden",
		// ombres
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	cover: {
		width: "100%",
		aspectRatio: COVER_RATIO, // hauteur = largeur / 0.666…
		backgroundColor: "#f2f2f2",
	},
	coverContainer: {
		width: "100%",
		aspectRatio: COVER_RATIO,
		backgroundColor: "#f2f2f2",
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
		color: "#444",
		fontSize: 13,
	},
	publisher: {
		color: "#666",
		fontSize: 12,
	},
	genre: {
		color: "#666",
		fontSize: 12,
	},
	meta: {
		color: "#888",
		fontSize: 12,
		marginTop: 2,
	},
});
