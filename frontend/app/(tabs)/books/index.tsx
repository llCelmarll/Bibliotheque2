import React, { useState, useEffect, useCallback } from "react";
import {
	Text,
	View,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	useWindowDimensions,
	TouchableOpacity,
	Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Book } from "@/types/book";
import { BookListItem } from "@/components/BookListItem";
import { BookCardItem } from "@/components/BookCardItem";
import { SearchBar } from "@/components/SearchBar";
import { BookFilters } from "@/components/BookFilters";
import { SimpleSearchFilters } from "@/components/SimpleSearchFilters";
import { AdvancedSearchModal } from "@/components/AdvancedSearchModal";
import { useBooks } from "@/hooks/useBooks";


export default function Index() {
	const { width: screenWidth } = useWindowDimensions();
	const [isGridView, setIsGridView] = useState(false);
	const [advancedModalVisible, setAdvancedModalVisible] = useState(false);
	const router = useRouter();
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
		isRead,
		setIsRead,
		ratingMin,
		setRatingMin,
		isAdvancedMode,
		runAdvancedSearch,
		clearAdvancedSearch,
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
		if (!isAdvancedMode) {
			loadBooks(1, false, {
				currentSortBy: sortBy,
				currentOrder: order,
				currentSearchQuery: searchQuery,
				currentFilters: activeFilters,
				currentIsRead: isRead,
				currentRatingMin: ratingMin,
			});
		}
	}, [activeFilters, isRead, ratingMin, isAdvancedMode]);

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
				onAdvancedPress={() => setAdvancedModalVisible(true)}
				isAdvancedMode={isAdvancedMode}
			/>

			{isAdvancedMode ? (
				<View style={styles.advancedBanner}>
					<Text style={styles.advancedBannerText}>Recherche avancée active</Text>
					<TouchableOpacity onPress={clearAdvancedSearch}>
						<Text style={styles.advancedBannerLink}>Réinitialiser</Text>
					</TouchableOpacity>
				</View>
			) : (
				<SimpleSearchFilters
					isRead={isRead}
					setIsRead={setIsRead}
					ratingMin={ratingMin}
					setRatingMin={setRatingMin}
				/>
			)}

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
			
			<AdvancedSearchModal
				visible={advancedModalVisible}
				onClose={() => setAdvancedModalVisible(false)}
				onSearch={(params) => {
					runAdvancedSearch(params);
					setAdvancedModalVisible(false);
				}}
				sortBy={sortBy}
				order={order}
			/>

			{/* Bouton d'ajout manuel flottant */}
			<TouchableOpacity 
				style={styles.addButton}
				onPress={() => router.push('/scan/manual')}
				activeOpacity={0.8}
			>
				<MaterialIcons name="add" size={24} color="#fff" />
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
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
	advancedBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: "#e8f4fc",
		borderBottomWidth: 1,
		borderBottomColor: "#b8daff",
	},
	advancedBannerText: {
		fontSize: 14,
		color: "#004085",
	},
	advancedBannerLink: {
		fontSize: 14,
		color: "#007bff",
		fontWeight: "600",
	},
	addButton: {
		position: 'absolute',
		bottom: 20,
		right: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#3498db',
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 6,
			},
			android: {
				elevation: 8,
			},
			web: {
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
			},
		}),
	},
	authLoading: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	authLoadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
	},
});

	// ...existing code...
