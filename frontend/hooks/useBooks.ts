import {useState, useCallback} from "react";
import {Book} from "@/types/book";
import {BookFilter} from "@/types/filter";
import {fetchBooks, fetchBooksAdvanced, FetchBooksAdvancedParams} from "@/services/booksService";
import {useBookFilters} from "@/hooks/useBookFilters";
import {useAuth} from "@/contexts/AuthContext";

interface UseBooksParams {
	initialPageSize?: number;
	initialSortBy?: string;
	initialOrder?: 'asc' | 'desc';
	initialFilters?: BookFilter[];
}

export function useBooks({
	initialPageSize = 20,
	initialSortBy = 'author',
	initialOrder = 'asc',
	initialFilters = [],
}: UseBooksParams = {}) {
	const { isAuthenticated } = useAuth();
	const [books, setBooks] = useState<Book[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState(initialSortBy);
	const [order, setOrder] = useState<'asc' | 'desc'>(initialOrder);
	const [loadError, setLoadError] = useState(false);
	const [isRead, setIsRead] = useState<boolean | null>(null);
	const [ratingMin, setRatingMin] = useState<number | null>(null);
	const [isAdvancedMode, setIsAdvancedMode] = useState(false);
	const [advancedParams, setAdvancedParams] = useState<FetchBooksAdvancedParams | null>(null);
	const {activeFilters, addFilter, removeFilter, clearFilters} = useBookFilters();

	const loadBooks = useCallback(async (
		pageNumber: number,
		isLoadingMore = false,
		options = {
			currentSortBy: sortBy,
			currentOrder: order,
			currentSearchQuery: searchQuery,
			currentFilters: activeFilters,
			currentIsRead: isRead,
			currentRatingMin: ratingMin,
		}
	) => {
		if (!isAuthenticated) {
			setLoading(false);
			setLoadingMore(false);
			return;
		}
		if (isLoadingMore) setLoadingMore(true);
		else setLoading(true);
		try {
			const newBooks = await fetchBooks({
				page: pageNumber,
				pageSize: initialPageSize,
				sortBy: options.currentSortBy,
				order: options.currentOrder,
				searchQuery: options.currentSearchQuery ?? "",
				filters: options.currentFilters ?? [],
				isRead: options.currentIsRead ?? undefined,
				ratingMin: options.currentRatingMin ?? undefined,
			});
			if (isLoadingMore) setBooks(prev => [...prev, ...newBooks]);
			else setBooks(newBooks);
			setHasMore(newBooks.length === initialPageSize);
		} catch (error) {
			console.error("Erreur lors de la récupération des livres:", error);
			setLoadError(true);
			throw error;
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	}, [sortBy, order, searchQuery, activeFilters, isRead, ratingMin, initialPageSize, isAuthenticated]);

	const loadBooksAdvanced = useCallback(async (
		params: FetchBooksAdvancedParams,
		pageNumber: number,
		isLoadingMore: boolean
	) => {
		if (!isAuthenticated) return;
		if (isLoadingMore) setLoadingMore(true);
		else setLoading(true);
		try {
			const newBooks = await fetchBooksAdvanced({
				...params,
				page: pageNumber,
				pageSize: initialPageSize,
				sortBy: params.sortBy ?? sortBy,
				order: params.order ?? order,
			});
			if (isLoadingMore) setBooks(prev => [...prev, ...newBooks]);
			else setBooks(newBooks);
			setHasMore(newBooks.length === initialPageSize);
		} catch (error) {
			console.error("Erreur recherche avancée:", error);
			setLoadError(true);
			throw error;
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	}, [initialPageSize, sortBy, order, isAuthenticated]);

	const handleFilterSelect = useCallback(async (filter: BookFilter) => {
		addFilter(filter);
		setPage(1);
	}, [addFilter]);

	const handleLoadMore = useCallback(async () => {
		if (!loadingMore && hasMore) {
			try {
				const nextPage = page + 1;
				setPage(nextPage);
				if (isAdvancedMode && advancedParams) {
					await loadBooksAdvanced(advancedParams, nextPage, true);
				} else {
					await loadBooks(nextPage, true);
				}
				setLoadError(false);
			} catch (error) {
				console.error("Erreur de chargement de plus de livres :", error);
				setLoadError(true);
			}
		}
	}, [hasMore, page, loadBooks, loadBooksAdvanced, isAdvancedMode, advancedParams, loadingMore]);

	const handleSortChange = useCallback(async (newSortBy: string, newOrder: 'asc' | 'desc') => {
		setSortBy(newSortBy);
		setOrder(newOrder);
		setPage(1);
		if (isAdvancedMode && advancedParams) {
			await loadBooksAdvanced({ ...advancedParams, sortBy: newSortBy, order: newOrder }, 1, false);
			setAdvancedParams(prev => prev ? { ...prev, sortBy: newSortBy, order: newOrder } : null);
		} else {
			await loadBooks(1, false, {
				currentSortBy: newSortBy,
				currentOrder: newOrder,
				currentSearchQuery: searchQuery,
				currentFilters: activeFilters,
				currentIsRead: isRead,
				currentRatingMin: ratingMin,
			});
		}
	}, [loadBooks, loadBooksAdvanced, searchQuery, activeFilters, isRead, ratingMin, isAdvancedMode, advancedParams]);

	const handleSearch = useCallback(async () => {
		setIsAdvancedMode(false);
		setAdvancedParams(null);
		setPage(1);
		await loadBooks(1);
		setSearchQuery('');
	}, [loadBooks]);

	const runAdvancedSearch = useCallback((params: FetchBooksAdvancedParams) => {
		setIsAdvancedMode(true);
		setAdvancedParams(params);
		setPage(1);
		loadBooksAdvanced(params, 1, false);
	}, [loadBooksAdvanced]);

	const clearAdvancedSearch = useCallback(() => {
		setIsAdvancedMode(false);
		setAdvancedParams(null);
		setPage(1);
		loadBooks(1, false, {
			currentSortBy: sortBy,
			currentOrder: order,
			currentSearchQuery: searchQuery,
			currentFilters: activeFilters,
			currentIsRead: isRead,
			currentRatingMin: ratingMin,
		});
	}, [loadBooks, sortBy, order, searchQuery, activeFilters, isRead, ratingMin]);

	const handleFilterRemove = useCallback(async (filter: BookFilter) => {
		removeFilter(filter);
		setPage(1);
	}, [removeFilter]);

	return {
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
	}
}