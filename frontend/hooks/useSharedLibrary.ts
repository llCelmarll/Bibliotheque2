import { useState, useCallback } from 'react';
import { Book } from '@/types/book';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { SharedLibraryAdvancedParams } from '@/components/SharedLibraryAdvancedModal';

interface UseSharedLibraryParams {
    userId: number;
    pageSize?: number;
}

export function useSharedLibrary({ userId, pageSize = 20 }: UseSharedLibraryParams) {
    const [books, setBooks] = useState<Book[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [advancedParams, setAdvancedParams] = useState<SharedLibraryAdvancedParams | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadBooks = useCallback(async (options: {
        pageNumber: number;
        isLoadingMore?: boolean;
        search?: string;
        currentSortBy?: string;
        currentSortOrder?: 'asc' | 'desc';
        advanced?: SharedLibraryAdvancedParams | null;
    }) => {
        const {
            pageNumber,
            isLoadingMore = false,
            search,
            currentSortBy = sortBy,
            currentSortOrder = sortOrder,
            advanced,
        } = options;

        if (isLoadingMore) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        try {
            const skip = (pageNumber - 1) * pageSize;
            const params = advanced
                ? {
                    skip,
                    limit: pageSize,
                    sort_by: currentSortBy,
                    sort_order: currentSortOrder,
                    ...advanced,
                }
                : {
                    search: search || undefined,
                    skip,
                    limit: pageSize,
                    sort_by: currentSortBy,
                    sort_order: currentSortOrder,
                };

            const data = await userLoanRequestService.getUserLibrary(userId, params);

            if (isLoadingMore) {
                setBooks(prev => [...prev, ...data.items]);
            } else {
                setBooks(data.items);
            }
            setTotal(data.total);
            setHasMore(data.items.length === pageSize);
        } catch (err: any) {
            if (err.response?.status === 403) {
                setError("Cet utilisateur n'a pas encore partagé sa bibliothèque avec vous");
            } else {
                setError('Impossible de charger la bibliothèque');
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [userId, pageSize, sortBy, sortOrder]);

    const load = useCallback(() => {
        setIsAdvancedMode(false);
        setAdvancedParams(null);
        setPage(1);
        return loadBooks({ pageNumber: 1, search: searchQuery });
    }, [loadBooks, searchQuery]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        setIsAdvancedMode(false);
        setAdvancedParams(null);
        setPage(1);
        loadBooks({ pageNumber: 1, search: query });
    }, [loadBooks]);

    const runAdvancedSearch = useCallback((params: SharedLibraryAdvancedParams) => {
        setIsAdvancedMode(true);
        setAdvancedParams(params);
        setSearchQuery('');
        setPage(1);
        loadBooks({ pageNumber: 1, advanced: params, currentSortBy: params.sort_by ?? sortBy, currentSortOrder: params.sort_order ?? sortOrder });
    }, [loadBooks, sortBy, sortOrder]);

    const clearAdvancedSearch = useCallback(() => {
        setIsAdvancedMode(false);
        setAdvancedParams(null);
        setPage(1);
        loadBooks({ pageNumber: 1, search: '' });
    }, [loadBooks]);

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            if (isAdvancedMode && advancedParams) {
                loadBooks({ pageNumber: nextPage, isLoadingMore: true, advanced: advancedParams });
            } else {
                loadBooks({ pageNumber: nextPage, isLoadingMore: true, search: searchQuery });
            }
        }
    }, [loadingMore, hasMore, page, loadBooks, searchQuery, isAdvancedMode, advancedParams]);

    const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setPage(1);
        if (isAdvancedMode && advancedParams) {
            loadBooks({ pageNumber: 1, advanced: advancedParams, currentSortBy: newSortBy, currentSortOrder: newSortOrder });
        } else {
            loadBooks({ pageNumber: 1, search: searchQuery, currentSortBy: newSortBy, currentSortOrder: newSortOrder });
        }
    }, [loadBooks, searchQuery, isAdvancedMode, advancedParams]);

    const handleRefresh = useCallback(() => {
        setPage(1);
        if (isAdvancedMode && advancedParams) {
            return loadBooks({ pageNumber: 1, advanced: advancedParams });
        }
        return loadBooks({ pageNumber: 1, search: searchQuery });
    }, [loadBooks, searchQuery, isAdvancedMode, advancedParams]);

    return {
        books,
        total,
        loading,
        loadingMore,
        hasMore,
        searchQuery,
        setSearchQuery,
        sortBy,
        sortOrder,
        isAdvancedMode,
        error,
        load,
        handleSearch,
        runAdvancedSearch,
        clearAdvancedSearch,
        handleLoadMore,
        handleSortChange,
        handleRefresh,
    };
}
