import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator, useWindowDimensions } from "react-native";
import { fetchBooks, Book } from "@/services/books";
import { BookListItem } from "@/components/BookListItem";
import { BookCardItem } from "@/components/BookCardItem";
import { SearchBar } from "@/components/SearchBar";


export default function BooksScreen() {
	const { width: screenWidth } = useWindowDimensions();
	const [books, setBooks] = useState<Book[]>([]);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("title");
	const [order, setOrder] = useState<"asc" | "desc">("asc");
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [isGridView, setIsGridView] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);

	// Calcul du nombre de colonnes et de la largeur des cartes
	const calculateLayout = () => {
		const minCardWidth = 160;
		const horizontalPadding = 16;
		const spacing = 10;
		const availableWidth = screenWidth - horizontalPadding;

		let numColumns = Math.floor(availableWidth / (minCardWidth + spacing));
		numColumns = Math.max(2, Math.min(6, numColumns));

		const cardWidth = (availableWidth - (spacing * (numColumns - 1))) / numColumns;

		return { numColumns, cardWidth };
	};

	const { numColumns, cardWidth } = calculateLayout();

	const loadBooks = async (pageNumber: number, isLoadingMore = false) => {
		if (isLoadingMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
		}

		try {
			const newBooks = await fetchBooks(pageNumber, 20, sortBy, order, searchQuery);
			if (isLoadingMore) {
				setBooks(prevBooks => [...prevBooks, ...newBooks]);
			} else {
				setBooks(newBooks);
			}
			setHasMore(newBooks.length === 20);
		} catch (error) {
			console.error("Erreur lors de la récupération des livres:", error);
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	};

	const handleLoadMore = async () => {
		if (!loadingMore && hasMore) {
			const nextPage = page + 1;
			setPage(nextPage);
			await loadBooks(nextPage, true);
		}
	};

	const handleSearch = async () => {
		setPage(1);
		await loadBooks(1);
	};

	const handleSort = async () => {
		const newSortBy = sortBy === "title" ? "published_date" : "title";
		setSortBy(newSortBy);
		setPage(1);
		await loadBooks(1);
	};

	useEffect(() => {
		loadBooks(1);
	}, []);

	const toggleView = () => {
		setIsGridView(!isGridView);
	};

	const renderItem = ({ item }: { item: Book }) => {
		if (isGridView) {
			return (
				<View style={[styles.cardWrapper, { width: cardWidth }]}>
					<BookCardItem book={item} />
				</View>
			);
		}
		return <BookListItem book={item} />;
	};

	const renderFooter = () => {
		if (!loadingMore) return null;
		return (
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" />
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<SearchBar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				handleSearch={handleSearch}
				handleSort={handleSort}
				isGridView={isGridView}
				toggleView={toggleView}
				sortBy={sortBy}
			/>

			{loading ? (
				<ActivityIndicator style={styles.loader} size="large" />
			) : (
				<FlatList
					key={isGridView ? `grid-${numColumns}` : 'list'}
					data={books}
					keyExtractor={(item) => item.id.toString()}
					renderItem={renderItem}
					numColumns={isGridView ? numColumns : 1}
					contentContainerStyle={styles.listContainer}
					columnWrapperStyle={isGridView ? styles.row : undefined}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					ListFooterComponent={renderFooter}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	loader: {
		flex: 1,
		justifyContent: "center",
	},
	listContainer: {
		padding: 8,
	},
	row: {
		gap: 10,
		justifyContent: 'flex-start',
	},
	cardWrapper: {
		marginBottom: 10,
	},
	footerLoader: {
		paddingVertical: 20,
		alignItems: 'center',
	},
});
