import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	useWindowDimensions,
} from "react-native";
import { useBookFilters} from "@/hooks/useBookFilters";
import { fetchBooks } from "@/services/booksService";
import { Book } from "@/types/book";
import {BookFilter, FilterType} from "@/types/filter";
import { BookListItem } from "@/components/BookListItem";
import { BookCardItem } from "@/components/BookCardItem";
import { SearchBar } from "@/components/SearchBar";
import { BookFilters} from "@/components/BookFilters";
import { createFilter, isFilterActive} from "@/services/filtersService";


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

	const { activeFilters, addFilter, removeFilter, clearFilters} = useBookFilters();

	// Calcul du nombre de colonnes et de la largeur des cartes
	const calculateLayout = () => {
		// console.log("Calcul du nombre de colonnes et de la largeur des cartes ...")
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

	const loadBooks = useCallback(async (
		pageNumber: number,
		isLoadingMore = false,
		sort = sortBy,
		orderDir = order,
		query = searchQuery,
		filters = activeFilters,
	) => {
		if (isLoadingMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
		}

		try {
			const newBooks = await fetchBooks({
				page: pageNumber,
				sortBy: sort,
				order: orderDir,
				searchQuery: query,
				filters: filters
			})

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
	}, [sortBy, order, searchQuery, activeFilters]);

	const handleLoadMore = async () => {
		// console.log("Chargement de plus de livres ...")
		// console.log(
		// 	`LoadingMore: ${loadingMore}, HasMore: ${hasMore}, Page: ${page}, SortBy: ${sortBy}, Order: ${order}, SearchQuery: ${searchQuery}`
		// )
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

	const handleSortChange = async (newSortBy : string, newOrder: "asc" | "desc") => {
		setSortBy(newSortBy);
		setOrder(newOrder)
		setPage(1);
		await loadBooks(1, false, newSortBy, newOrder, searchQuery);
	};

	const handleFilterSelect = useCallback(async (type:FilterType, id: number) => {
		let filterName = "";
		if (type === "author") {
			const book = books.find(b => b.authors?.some(a => a.id === id));
			const author = book?.authors?.find(a => a.id === id);
			filterName = author?.name || "Auteur inconnu";
		} else if (type === "genre") {
			const book = books.find(b => b.genres?.some(g => g.id === id));
			const genre = book?.genres?.find(g => g.id === id);
			filterName = genre?.name || "Genre inconnu";
		} else if (type === "publisher") {
			const book = books.find(b => b.publisher?.id === id);
			filterName = book?.publisher?.name || "Éditeur inconnu";
		}

		// Utiliser le service de filtres pour créer et ajouter le filtre
		const newFilter = createFilter(type, {id, name: filterName});
		addFilter(newFilter);
		// setPage(1);
		// await loadBooks(1, false, sortBy, order, searchQuery, activeFilters);

	}, [books, addFilter, loadBooks, sortBy, order, searchQuery]);

	useEffect(() => {
		setPage(1);
		loadBooks(1);
	}, [activeFilters]);

	// useEffect(() => {
	// 	// console.log("Appel de useEffect");
	// 	loadBooks(1);
	// }, []);

	const handleFilterRemove = useCallback(async (type: FilterType, id: number) => {
		removeFilter(type, id);
		if (activeFilters.length <= 1) {
			setPage(1);
			await loadBooks(1);
		}
	}, [removeFilter, activeFilters.length, loadBooks]);


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
		return <BookListItem book={item} onFilterSelect={handleFilterSelect} />;
	};

	const renderFooter = () => {
		// console.log("Affichage du loader de chargement de plus de livres ...")
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
				isGridView={isGridView}
				toggleView={toggleView}
				sortBy={sortBy}
				order={order}
				onSortChange={handleSortChange}
			/>

			<BookFilters activeFilters={activeFilters} onFilterRemove={handleFilterRemove} onClearFilters={clearFilters}/>

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
