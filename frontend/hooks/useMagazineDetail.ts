import { useState, useCallback } from 'react';
import { MagazineSeries, MagazineIssue } from '@/types/magazine';
import { magazineService } from '@/services/magazineService';

export function useMagazineDetail(seriesId: number) {
    const [series, setSeries] = useState<MagazineSeries | null>(null);
    const [issues, setIssues] = useState<MagazineIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, i] = await Promise.all([
                magazineService.getSeriesById(seriesId),
                magazineService.getIssuesBySeries(seriesId),
            ]);
            setSeries(s);
            setIssues(i);
        } catch {
            setError('Impossible de charger la série');
        } finally {
            setLoading(false);
        }
    }, [seriesId]);

    return { series, issues, loading, error, refetch: load };
}

export function useMagazineIssueDetail(issueId: number) {
    const [issue, setIssue] = useState<MagazineIssue | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await magazineService.getIssueById(issueId);
            setIssue(data);
        } catch {
            setError('Impossible de charger le numéro');
        } finally {
            setLoading(false);
        }
    }, [issueId]);

    return { issue, loading, error, refetch: load };
}
