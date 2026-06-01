import { useState, useCallback } from 'react';
import { MagazineSeries } from '@/types/magazine';
import { magazineService } from '@/services/magazineService';
import { useAuth } from '@/contexts/AuthContext';

export function useMagazines() {
    const { isAuthenticated } = useAuth();
    const [series, setSeries] = useState<MagazineSeries[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const loadSeries = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await magazineService.getAllSeries();
            setSeries(data);
        } catch (e) {
            setError('Impossible de charger les magazines');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const filteredSeries = searchQuery.trim()
        ? series.filter(s =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.publisher?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : series;

    return {
        series: filteredSeries,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        loadSeries,
    };
}
