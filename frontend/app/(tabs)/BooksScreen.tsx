import React, { useState, useEffect, useCallback } from "react";
import {
	Text,
	Button,
	View,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	useWindowDimensions,
    TouchableOpacity,
} from "react-native";
import { Book } from "@/types/book";
import { BookListItem } from "@/components/BookListItem";
import { BookCardItem } from "@/components/BookCardItem";
import { SearchBar } from "@/components/SearchBar";
import { BookFilters} from "@/components/BookFilters";
import { useBooks } from "@/hooks/useBooks";


export default function BooksScreen() {
	const { width: screenWidth } = useWindowDimensions();
	const [isGridView, setIsGridView] = useState(false);

	const {
		books,
		loading,
		loadingMore,
		loadError,
		hasMore,
		searchQuery,
		setSearchQuery,
		sortBy,
		order,
		handleFilterSelect,
		handleFilterRemove,
		handleLoadMore,
		handleSortChange,
		handleSearch,
		loadBooks,
		activeFilters,
		clearFilters,
	} = useBooks();


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
		if (loadingMore) {
			return (
				<View style={styles.footerLoader}>
					<ActivityIndicator size="small" />
				</View>
			);
		}

		if (loadError && hasMore) {
			return (
				<View style={styles.footerError}>
					<Text style={styles.footerErrorText}>
						Une erreur est survenue lors du chargement
					</Text>
					<Text style={styles.footerSubText}>
						Appuyez pour réessayer
					</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={handleLoadMore}
					>
						<Text style={styles.retryButtonText}>Réessayer</Text>
					</TouchableOpacity>
				</View>
			);
		}

		if (hasMore) {
			return (
				<View style={styles.footerInfo}>
					<Text style={styles.footerInfoText}>
						Tirez pour charger plus de livres
					</Text>
				</View>
			);
		}

		return null;
	};

	useEffect(() => {
		loadBooks(1)
	}, [activeFilters]);

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
	footerError: {
		padding: 20,
		alignItems: 'center',
		backgroundColor: '#fff8f8',
		borderRadius: 8,
		margin: 10,
	},
	footerErrorText: {
		color: '#d32f2f',
		fontSize: 16,
		marginBottom: 4,
	},
	footerSubText: {
		color: '#666',
		fontSize: 14,
		marginBottom: 12,
	},
	retryButton: {
		backgroundColor: '#d32f2f',
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 4,
	},
	retryButtonText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	footerInfo: {
		padding: 16,
		alignItems: 'center',
	},
	footerInfoText: {
		color: '#666',
		fontSize: 14,
	},


});
