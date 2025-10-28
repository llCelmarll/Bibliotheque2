import React from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from "react-native";
import {Author, Book, Genre} from "@/types/book";
import BookCover from "@/components/BookCover";
import {ClickableTag} from "@/components/ClickableTag";
import {BookFilter, FilterType} from "@/types/filter";
import {createFilter} from "@/services/filtersService";
import { useRouter} from "expo-router";

interface BookListItemProps {
	book: Book;
	onFilterSelect: (filter: BookFilter) => void;
}

export const BookListItem: React.FC<BookListItemProps> = ({ book , onFilterSelect}) => {

	const router = useRouter();

	const handlePress = () => {
		router.push(`/(tabs)/books/${book.id}`);
	}

	return (
		<View style={styles.container}>
			<TouchableOpacity onPress={handlePress} testID="book-item-touchable">
				{/* Couverture du livre */}
				<BookCover
					url={book.cover_url}
					style={styles.cover}
					containerStyle={styles.coverContainer}
					resizeMode="cover"
				/>
			</TouchableOpacity>


			<View style={styles.infoContainer}>
				<TouchableOpacity onPress={handlePress}>
					<Text style={styles.title}>{book.title}</Text>
				</TouchableOpacity>

				{book.authors && book.authors.length > 0 && (
					<View style={styles.author}>
						<Text>{book.authors.length > 1? "Auteurs" : "Auteur"} :</Text>
						{book.authors.map((author: Author) => (
							<ClickableTag
								key={author.id}
								filter={createFilter("author", author)}
								onPress={onFilterSelect}
							/>
						))}
					</View>
				)}

				{book.publisher && (
					<View style={styles.publisher}>
						<Text>Editeur : </Text>
						<ClickableTag
							filter={createFilter("publisher", book.publisher)}
							onPress={onFilterSelect}
						/>
					</View>
				)}

				{book.genres && book.genres.length > 0 && (
					<View style={styles.genre}>
						<Text>{book.genres.length > 1? "Genres" : "Genre"} : </Text>
						{book.genres.map((genre: Genre) => (
							<ClickableTag
								key={genre.id}
								filter={createFilter("genre", genre)}
								onPress={onFilterSelect}
							/>
						))}
					</View>
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
		flexDirection: "row",
		flexWrap: "wrap"
	},
	publisher: {
		color: "#666",
		fontSize: 13,
		marginBottom: 2,
		flexDirection: "row",
		flexWrap: "wrap"
	},
	genre: {
		color: "#666",
		fontSize: 13,
		marginBottom: 2,
		flexDirection: "row",
		flexWrap: "wrap"
	},
	pages: {
		color: "#888",
		fontSize: 12,
	},
});