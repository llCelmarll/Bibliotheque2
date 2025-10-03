import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	useWindowDimensions,
	TouchableOpacity,
	ScrollView,
	Platform,
	Text
} from "react-native";
import Animated, {
	useAnimatedStyle,
	withSpring,
	useSharedValue,
	withTiming,
	Layout,
} from "react-native-reanimated";
import { fetchBooks, fetchBooksBy, Book } from "@/services/books";
import { BookListItem } from "@/components/BookListItem";
import { BookCardItem } from "@/components/BookCardItem";
import { SearchBar } from "@/components/SearchBar";

interface BookFilter {
	type: "author" | "genre" | "publisher";
	id: number;
	name?: string;
}


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
	const [activeFilters, setActiveFilter] = useState<BookFilter[]>([]);

	const filterHeight = useSharedValue(0);

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
		fromFilter? : BookFilter[],
	) => {
		// console.log("Chargement de livres ...")
		if (isLoadingMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
		}

		try {
			let newBooks: Book[] = [];
			if (fromFilter && fromFilter.length > 0) {
				// Appliquez les filtres séquentiellement ou en combinaison
				// Option 1: Utilisez seulement le premier filtre actif

				newBooks = await fetchBooksBy(fromFilter[0].type, fromFilter[0].id)
				// Option 2 (plus avancée): Implémentez une API qui supporte plusieurs filtres
				// newBooks = await fetchBooksWithMultipleFilters(fromFilters, pageNumber, 20, sort, orderDir, query);

			} else {
				newBooks = await fetchBooks(pageNumber, 20, sort, orderDir, query);
			}
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
	}, [sortBy, order, searchQuery]);

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

	const handleFilterSelect = useCallback(async (type: "author" | "genre" | "publisher", id: number) => {
		console.log("Recherche par : " + type + " : " + id);

		// Vérifier si le filtre existe déjà
		if (activeFilters.some(filter => filter.type === type && filter.id === id)) {
			return; // Ne pas ajouter de doublons
		}


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

		setActiveFilter(prev => [...prev, { type, id, name: filterName }]);

		setPage(1);
		await loadBooks(1, false, sortBy, order, searchQuery, [{type, id, name: filterName}]);
	}, [books, sortBy, order, searchQuery, loadBooks]);

	const removeFilter = useCallback(async (index : number) => {
		setActiveFilter(prev => prev.filter((_, i) => i !== index));
		// Recharger avec les filtres réstants ou sans filtre si la liste est vide
		setPage(1);
		if (activeFilters.length <= 1) {
			// Si c'était le dernier filtre, revenez à la recherche standard

			await loadBooks(1)
		} else {
			// Sinon recherger avec le premier filtre restant
			const newFilters =  activeFilters.filter((_, i) => i !== index);
			await loadBooks(1, false, sortBy, order, searchQuery, [newFilters[0]]);
		}
	}, [activeFilters, sortBy, order, searchQuery, loadBooks]);

	const resetFilters = useCallback(async () => {
		setActiveFilter([]);
		setPage(1);
		await loadBooks(1);
	}, [loadBooks]);

	useEffect(() => {
		// Animation de la hauteur des filtres
		filterHeight.value = withTiming(activeFilters.length > 0 ? 50 : 0, {duration: 300});
	}, [activeFilters.length]);

	const filterContainerStyle = useAnimatedStyle(() => {
		return {
			height: filterHeight.value,
			opacity: filterHeight.value > 0 ? 1 : 0,
			overflow: 'hidden',
		};
	})

	useEffect(() => {
		// console.log("Appel de useEffect");
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

			{activeFilters.length > 0 && (
				<Animated.View style={filterContainerStyle}>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.filtersContainer}>
						{activeFilters.map((filter, index) => (
							<Animated.View
								key={`${filter.type}-${filter.id}-${index}`}
								layout={Layout.springify()}>
								<TouchableOpacity
									style={styles.activeFilter}
									onPress={() => removeFilter(index)}>
									<Text style={styles.activeFilterText}>
										{filter.name} ✕
									</Text>
								</TouchableOpacity>
							</Animated.View>
						))}
					</ScrollView>
				</Animated.View>
			)}

			{activeFilters.length > 0 && (
				<TouchableOpacity
				style={styles.resetButton}
				onPress={resetFilters}>
					<Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
				</TouchableOpacity>
			)}

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
	filtersContainer: {
		paddingHorizontal: 8,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center', // Ajoutez ceci
	},
	activeFilter: {
		backgroundColor: '#007bff',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		marginRight: 8, // Changez marginBottom par marginRight
	},
	activeFilterText: {
		color: '#fff',
		fontSize: 14,
		fontFamily: Platform.OS === 'ios' ? 'System' : 'normal', // Améliore l'apparence de la police
	},
	resetButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: 12,
		paddingVertical: 6,
		margin: 8,
	},
	resetButtonText: {
		color: '#ff3b30',
		fontSize: 14,
		fontWeight: '500',
	},

});
