import { useState, useCallback } from 'react';
import {BookFilter, FilterType} from '@/types/filter';

export function useBookFilters() {
	const [activeFilters, setActiveFilters] = useState<BookFilter[]>([]);

	const addFilter = useCallback((filter: BookFilter) => {
		setActiveFilters(prev => {
			// Évite les doublons
			if (prev.some(f => f.type === filter.type && f.id === filter.id)) {
				return prev;
			}
			return [...prev, filter];
		});
	}, []);

	const removeFilter = useCallback((filter: BookFilter) => {
		setActiveFilters(prev =>
			prev.filter(f => !(f.type === filter.type && f.id === filter.id))
		);
	}, []);

	const clearFilters = useCallback(() => {
		setActiveFilters([]);
	}, []);

	return {
		activeFilters,
		addFilter,
		removeFilter,
		clearFilters
	};
}