import React from 'react';
import { View, Text, StyleSheet, Image } from "react-native";
import { Book } from "@/services/books";
import BookCover from "@/components/BookCover";

interface BookListItemProps {
	book: Book;
}

export const BookListItem: React.FC<BookListItemProps> = ({ book }) => {
	return (
		<View style={styles.container}>
			{/* Couverture du livre */}
			<BookCover
				url={book.cover_url}
				style={styles.cover}
				containerStyle={styles.coverContainer}
				resizeMode="cover"
			/>


			<View style={styles.infoContainer}>
				<Text style={styles.title}>{book.title}</Text>

				{book.authors && book.authors.length > 0 && (
					<Text style={styles.author}>
						Par : {book.authors.map(author => author.name).join(", ")}
					</Text>
				)}

				{book.publisher && (
					<Text style={styles.publisher}>
						Éditeur : {book.publisher.name}
					</Text>
				)}

				{book.genres && book.genres.length > 0 && (
					<Text style={styles.genre}>
						{book.genres.length > 1? "Genres" : "Genre"} : {book.genres.map(genre => genre.name).join(", ")}
					</Text>
				)}

				{book.page_count && (
					<Text style={styles.pages}>
						{book.page_count} pages
					</Text>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#ddd",
		flexDirection: 'row',
	},
	cover: {
		width: 70,
		height: 100,
		marginRight: 10,
	},
	coverContainer: {
		width: 70,
		height: 100,
		marginRight: 10,
	},
	infoContainer: {
		flex: 1,
		justifyContent: 'space-between',
	},
	title: {
		fontWeight: "bold",
		fontSize: 16,
		marginBottom: 4,
	},
	author: {
		color: "#666",
		fontSize: 14,
		marginBottom: 2,
	},
	publisher: {
		color: "#666",
		fontSize: 13,
		marginBottom: 2,
	},
	genre: {
		color: "#666",
		fontSize: 13,
		marginBottom: 2,
	},
	pages: {
		color: "#888",
		fontSize: 12,
	},
});