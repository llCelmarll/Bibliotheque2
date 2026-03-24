import React from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from "react-native";
import {Author, Book, Genre, BookSeries} from "@/types/book";
import BookCover from "@/components/BookCover";
import {ClickableTag} from "@/components/ClickableTag";
import {StarRating} from "@/components/StarRating";
import {BookFilter, FilterType} from "@/types/filter";
import {createFilter} from "@/services/filtersService";
import { useRouter} from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

interface BookListItemProps {
	book: Book;
	onFilterSelect: (filter: BookFilter) => void;
}

export const BookListItem: React.FC<BookListItemProps> = ({ book , onFilterSelect}) => {

	const router = useRouter();
	const theme = useTheme();

	const handlePress = () => {
		router.push(`/(tabs)/books/${book.id}`);
	}

	const formatDate = (dateString?: string) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	};

	return (
		<View style={[styles.container, { borderBottomColor: theme.borderLight }]}>
			<TouchableOpacity onPress={handlePress} testID="book-item-touchable">
				<BookCover
					url={book.cover_url}
					style={styles.cover}
					containerStyle={styles.coverContainer}
					resizeMode="cover"
				/>
			</TouchableOpacity>

			<View style={styles.infoContainer}>
				{/* Titre + badge lecture */}
				<View style={styles.titleRow}>
					<TouchableOpacity onPress={handlePress} style={styles.titleTouchable}>
						<Text style={[styles.title, { color: theme.textPrimary }]}>{book.title}</Text>
					</TouchableOpacity>
					{book.is_read === true && (
						<View style={[styles.readBadge, { backgroundColor: theme.successBg }]}>
							<Text style={[styles.readBadgeText, { color: theme.success }]}>Lu</Text>
						</View>
					)}
					{book.is_read === false && (
						<View style={[styles.unreadBadge, { backgroundColor: theme.bgMuted }]}>
							<Text style={[styles.unreadBadgeText, { color: theme.textMuted }]}>Non lu</Text>
						</View>
					)}
					{book.rating != null && book.rating > 0 && (
						<StarRating value={book.rating} editable={false} size={16} />
					)}
				</View>

				{/* Auteurs */}
				{book.authors && book.authors.length > 0 && (
					<View style={styles.author}>
						<Text style={{ color: theme.textSecondary }}>{book.authors.length > 1? "Auteurs" : "Auteur"} :</Text>
						{book.authors.map((author: Author) => (
							<ClickableTag
								key={author.id}
								filter={createFilter("author", author)}
								onPress={onFilterSelect}
							/>
						))}
					</View>
				)}

				{/* Éditeur */}
				{book.publisher && (
					<View style={styles.publisher}>
						<Text style={{ color: theme.textSecondary }}>Editeur : </Text>
						<ClickableTag
							filter={createFilter("publisher", book.publisher)}
							onPress={onFilterSelect}
						/>
					</View>
				)}

				{/* Genres */}
				{book.genres && book.genres.length > 0 && (
					<View style={styles.genre}>
						<Text style={{ color: theme.textSecondary }}>{book.genres.length > 1? "Genres" : "Genre"} : </Text>
						{book.genres.map((genre: Genre) => (
							<ClickableTag
								key={genre.id}
								filter={createFilter("genre", genre)}
								onPress={onFilterSelect}
							/>
						))}
					</View>
				)}

				{/* Séries */}
				{book.series && book.series.length > 0 && (
					<View style={styles.series}>
						<Text style={{ color: theme.textSecondary }}>{book.series.length > 1 ? "Séries" : "Série"} : </Text>
						{book.series.map((s: BookSeries) => (
							<ClickableTag
								key={s.id}
								filter={createFilter("series", {
									...s,
									name: s.volume_number ? s.name + ' — T.' + s.volume_number : s.name
								})}
								onPress={onFilterSelect}
							/>
						))}
					</View>
				)}

				{/* Nombre de pages */}
				{book.page_count && (
					<Text style={[styles.pages, { color: theme.textMuted }]}>
						{book.page_count} pages
					</Text>
				)}

				{/* Badge de prêt (TO other) */}
				{book.current_loan && (
					<View style={[styles.loanBadge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
						<Text style={[styles.loanBadgeText, { color: theme.warning }]}>
							📖 Prêté à {book.current_loan.contact?.name || 'Contact inconnu'}
						</Text>
						{book.current_loan.due_date && (
							<Text style={[
								styles.loanDateText,
								{ color: theme.warning },
								new Date(book.current_loan.due_date) < new Date() && { color: theme.danger, fontWeight: '600' }
							]}>
								Retour : {formatDate(book.current_loan.due_date)}
							</Text>
						)}
					</View>
				)}

				{/* Badge emprunt (FROM other) */}
				{book.borrowed_book && book.borrowed_book.status === 'active' && (
					<View style={[styles.loanBadge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
						<Text style={[styles.loanBadgeText, { color: theme.warning }]}>
							📚 Emprunté à {book.borrowed_book.borrowed_from}
						</Text>
						{book.borrowed_book.expected_return_date && (
							<Text style={[
								styles.loanDateText,
								{ color: theme.warning },
								new Date(book.borrowed_book.expected_return_date) < new Date() && { color: theme.danger, fontWeight: '600' }
							]}>
								{new Date(book.borrowed_book.expected_return_date) < new Date() ? '⚠️ ' : ''}
								Retour: {formatDate(book.borrowed_book.expected_return_date)}
							</Text>
						)}
					</View>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 12,
		borderBottomWidth: 1,
		flexDirection: 'row',
	},
	cover: {
		width: 70,
		height: 100,
		marginRight: 12,
		borderRadius: 8,
	},
	coverContainer: {
		width: 70,
		height: 100,
		marginRight: 12,
		borderRadius: 8,
		overflow: 'hidden',
	},
	infoContainer: {
		flex: 1,
		justifyContent: 'space-between',
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
		flexWrap: 'wrap',
		gap: 6,
	},
	titleTouchable: {
		flexShrink: 1,
	},
	title: {
		fontWeight: "bold",
		fontSize: 16,
	},
	readBadge: {
		borderRadius: 20,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	readBadgeText: {
		fontSize: 10,
		fontWeight: '600',
	},
	unreadBadge: {
		borderRadius: 20,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	unreadBadgeText: {
		fontSize: 10,
		fontWeight: '600',
	},
	author: {
		fontSize: 14,
		marginBottom: 2,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
	},
	publisher: {
		fontSize: 13,
		marginBottom: 2,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
	},
	genre: {
		fontSize: 13,
		marginBottom: 2,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
	},
	series: {
		fontSize: 13,
		marginBottom: 2,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
	},
	pages: {
		fontSize: 12,
	},
	loanBadge: {
		marginTop: 6,
		padding: 6,
		borderRadius: 8,
		borderWidth: 1,
	},
	loanBadgeText: {
		fontSize: 11,
		fontWeight: '600',
		marginBottom: 2,
	},
	loanDateText: {
		fontSize: 10,
	},
});