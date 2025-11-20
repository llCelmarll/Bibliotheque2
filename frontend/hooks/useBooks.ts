import {useState, useCallback, useEffect} from "react";
import {Book} from "@/types/book";
import {BookFilter, FilterType} from "@/types/filter";
import {fetchBooks} from "@/services/booksService";
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
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const [books, setBooks] = useState<Book[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState(initialSortBy);
	const [order, setOrder] = useState<'asc' | 'desc'>(initialOrder);
	const [loadError, setLoadError] = useState(false);
	const {activeFilters, addFilter, removeFilter, clearFilters} = useBookFilters();

	const loadBooks = useCallback(async (
		pageNumber: number,
		isLoadingMore = false,
		options = {
			currentSortBy: sortBy,
			currentOrder: order,
			currentSearchQuery: searchQuery,
			currentFilters: activeFilters,
		}
	) => {
		// Ne pas charger si l'utilisateur n'est pas authentifié
		if (!isAuthenticated) {
			setLoading(false);
			setLoadingMore(false);
			return;
		}

		if (isLoadingMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
		}

		try {
			const newBooks = await fetchBooks({
				page: pageNumber,
				pageSize: initialPageSize,
				sortBy: options.currentSortBy,
				order: options.currentOrder,
				searchQuery: options.currentSearchQuery,
				filters: options.currentFilters
			});

			if (isLoadingMore) {
				setBooks(prevBooks => [...prevBooks, ...newBooks]);
			} else {
				setBooks(newBooks);
			}
			setHasMore(newBooks.length === initialPageSize);
		} catch (error) {
			console.error("Erreur lors de la récupération des livres:", error);
			setLoadError(true);
			throw error;
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	}, [sortBy, order, searchQuery, activeFilters, initialPageSize, isAuthenticated]);

	const handleFilterSelect = useCallback(async (filter: BookFilter) => {
		addFilter(filter);
		setPage(1);
	}, [addFilter]);

	const handleLoadMore = useCallback(async () => {
		if (!loadingMore && hasMore) {
			try {
				const nextPage = page + 1;
				setPage(nextPage);
				await loadBooks(nextPage, true);
				setLoadError(false);
			} catch (error) {
				console.error("Erreur de chargement de plus de livres :", error);
				setLoadError(true);
			}
		}
	}, [hasMore, page, loadBooks, loadingMore]);

	const handleSortChange = useCallback(async (newSortBy: string, newOrder: 'asc' | 'desc') => {
		setSortBy(newSortBy);
		setOrder(newOrder);
		setPage(1);
		await loadBooks(1, false, {
			currentSortBy: newSortBy,
			currentOrder: newOrder,
			currentSearchQuery: searchQuery,
			currentFilters: activeFilters,
		});
	}, [loadBooks, searchQuery])

	const handleSearch = useCallback(async () => {
		setPage(1);
		await loadBooks(1);
		setSearchQuery('');
	}, [loadBooks])

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