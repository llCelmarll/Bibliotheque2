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
import { useTheme } from "@/contexts/ThemeContext";
import { Book } from "@/types/book";
import { BookListItem } from "@/components/BookListItem";
import { BookCardItem } from "@/components/BookCardItem";
import { SearchBar } from "@/components/SearchBar";
import { BookFilters } from "@/components/BookFilters";
import { SimpleSearchFilters } from "@/components/SimpleSearchFilters";
import { AdvancedSearchModal } from "@/components/AdvancedSearchModal";
import { useBooks } from "@/hooks/useBooks";
import { useNotifications } from "@/contexts/NotificationsContext";
import { UserLoanRequestStatus } from "@/types/userLoanRequest";
import BookCover from "@/components/BookCover";


export default function Index() {
	const { width: screenWidth } = useWindowDimensions();
	const [isGridView, setIsGridView] = useState(false);
	const [advancedModalVisible, setAdvancedModalVisible] = useState(false);
	const router = useRouter();
	const theme = useTheme();
	const { outgoingLoanRequests } = useNotifications();
	const acceptedOutgoing = outgoingLoanRequests.filter(r => r.status === UserLoanRequestStatus.ACCEPTED);
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
				<View style={[styles.footerError, { backgroundColor: theme.dangerBg }]}>
					<Text style={[styles.footerErrorText, { color: theme.danger }]}>
						Une erreur est survenue lors du chargement
					</Text>
					<Text style={[styles.footerSubText, { color: theme.textSecondary }]}>
						Appuyez pour réessayer
					</Text>
					<TouchableOpacity
						style={[styles.retryButton, { backgroundColor: theme.danger }]}
						onPress={handleLoadMore}
					>
						<Text style={[styles.retryButtonText, { color: theme.textInverse }]}>Réessayer</Text>
					</TouchableOpacity>
				</View>
			);
		}

		if (hasMore) {
			return (
				<View style={styles.footerInfo}>
					<Text style={[styles.footerInfoText, { color: theme.textSecondary }]}>
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
		<View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
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
				<View style={[styles.advancedBanner, { backgroundColor: theme.accentLight, borderBottomColor: theme.borderMedium }]}>
					<Text style={[styles.advancedBannerText, { color: theme.accent }]}>Recherche avancée active</Text>
					<TouchableOpacity onPress={clearAdvancedSearch}>
						<Text style={[styles.advancedBannerLink, { color: theme.accent }]}>Réinitialiser</Text>
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
					ListHeaderComponent={acceptedOutgoing.length > 0 ? (
						<View style={[styles.borrowedSection, { backgroundColor: theme.bgCard, borderColor: theme.warning }]}>
							<View style={[styles.borrowedSectionHeader, { backgroundColor: theme.warningBg, borderBottomColor: theme.borderLight }]}>
								<MaterialIcons name="swap-horiz" size={16} color={theme.warning} />
								<Text style={[styles.borrowedSectionTitle, { color: theme.warning }]}>Emprunts en cours ({acceptedOutgoing.length})</Text>
							</View>
							{acceptedOutgoing.map(r => {
								const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
								const dueDate = r.due_date ? formatDate(r.due_date) : null;
								const isOverdue = r.due_date ? new Date(r.due_date) < new Date() : false;
								return (
									<TouchableOpacity
										key={r.id}
										style={[styles.borrowedItem, { borderTopColor: theme.borderLight, backgroundColor: theme.bgCard }]}
										onPress={() => router.push(`/(tabs)/loans/library/${r.lender_id}/book/${r.book.id}`)}
										activeOpacity={0.7}
									>
										<BookCover
											url={r.book.cover_url}
											style={styles.borrowedCover}
											containerStyle={styles.borrowedCoverContainer}
											resizeMode="cover"
										/>
										<View style={styles.borrowedInfo}>
											<Text style={[styles.borrowedTitle, { color: theme.textPrimary }]} numberOfLines={2}>{r.book.title}</Text>
											<Text style={[styles.borrowedFrom, { color: theme.textSecondary }]}>Emprunté à {r.lender_username}</Text>
											{dueDate && (
												<Text style={[styles.borrowedDue, { color: isOverdue ? theme.danger : theme.textMuted }, isOverdue && { fontWeight: '600' }]}>
													{isOverdue ? '⚠️ ' : ''}Retour : {dueDate}
												</Text>
											)}
										</View>
										<MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
									</TouchableOpacity>
								);
							})}
						</View>
					) : null}
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
				style={[
					styles.addButton,
					{
						backgroundColor: theme.accent,
						...Platform.select({
							web: {
								boxShadow: `0 4px 12px ${theme.textPrimary}4D`,
							},
						}),
					},
				]}
				onPress={() => router.push('/scan/manual')}
				activeOpacity={0.8}
			>
				<MaterialIcons name="add" size={24} color={theme.textInverse} />
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
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
		borderRadius: 8,
		margin: 10,
	},
	footerErrorText: {
		fontSize: 16,
		marginBottom: 4,
	},
	footerSubText: {
		fontSize: 14,
		marginBottom: 12,
	},
	retryButton: {
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 4,
	},
	retryButtonText: {
		fontWeight: 'bold',
	},
	footerInfo: {
		padding: 16,
		alignItems: 'center',
	},
	footerInfoText: {
		fontSize: 14,
	},
	advancedBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
	},
	advancedBannerText: {
		fontSize: 14,
	},
	advancedBannerLink: {
		fontSize: 14,
		fontWeight: "600",
	},
	addButton: {
		position: 'absolute',
		bottom: 20,
		right: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			android: {
				elevation: 8,
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
		textAlign: 'center',
	},
	borrowedSection: {
		marginBottom: 8,
		borderRadius: 10,
		overflow: 'hidden',
		borderWidth: 1,
	},
	borrowedSectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
	},
	borrowedSectionTitle: {
		fontSize: 13,
		fontWeight: '700',
	},
	borrowedItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderTopWidth: 1,
		gap: 10,
	},
	borrowedCoverContainer: {
		width: 44,
		height: 64,
		borderRadius: 4,
		flexShrink: 0,
	},
	borrowedCover: {
		width: 44,
		height: 64,
		borderRadius: 4,
	},
	borrowedInfo: {
		flex: 1,
	},
	borrowedTitle: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 2,
	},
	borrowedFrom: {
		fontSize: 12,
		marginBottom: 2,
	},
	borrowedDue: {
		fontSize: 11,
	},
	borrowedOverdue: {
		fontWeight: '600',
	},
});

	// ...existing code...
