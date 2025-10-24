// hooks/useScanResult.ts
import { useState, useEffect } from 'react';
import { scanApi } from "@/services/scanService";
import { ScanResult } from "@/types/scanTypes";

export const useScanResult = (isbn: string) => {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<ScanResult | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setIsLoading(true);
				const result = await scanApi.getScanResult(isbn);
				setData(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Une erreur est survenue');
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [isbn]);

	return { isLoading, error, data };
};