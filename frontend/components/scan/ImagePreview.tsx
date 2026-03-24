// components/scan/ImagePreview.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ImagePreviewProps {
	url: string;
	debounceMs?: number;
}

export const ImagePreview: React.FC<ImagePreviewProps> = React.memo(({
	url,
	debounceMs = 1500
}) => {
	const theme = useTheme();
	const [debouncedUrl, setDebouncedUrl] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const currentImageRef = useRef<string>('');

	// Callbacks stables pour éviter les re-renders
	const handleLoadStart = useCallback(() => {
		setLoading(true);
		setError(false);
	}, []);

	const handleLoad = useCallback(() => {
		setLoading(false);
	}, []);

	const handleError = useCallback(() => {
		setLoading(false);
		setError(true);
	}, []);

	// Gérer le debounce de l'URL
	useEffect(() => {
		// Clear le timeout précédent
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// Vérifier si l'URL est valide
		const isValidUrl = url && url.length > 10 && 
			(url.startsWith('http://') || url.startsWith('https://'));

		if (!isValidUrl) {
			// Si l'URL devient invalide, reset immédiatement
			if (debouncedUrl) {
				setDebouncedUrl('');
				setError(false);
				setLoading(false);
				currentImageRef.current = '';
			}
			return;
		}

		// Si c'est la même URL que l'image actuelle, pas de changement
		if (url === currentImageRef.current) {
			return;
		}

		// Si l'URL est déjà en cours de debounce vers la même valeur
		if (url === debouncedUrl) {
			return;
		}

		// Debounce pour les nouvelles URLs
		timeoutRef.current = setTimeout(() => {
			setDebouncedUrl(url);
			setError(false);
			currentImageRef.current = url;
		}, debounceMs);

		// Cleanup
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [url, debounceMs, debouncedUrl]);

	// Cleanup au démontage
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// Si pas d'URL debouncée, ne rien afficher
	if (!debouncedUrl) {
		return null;
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }]}>
			<Text style={[styles.label, { color: theme.textSecondary }]}>Aperçu :</Text>
			<View style={styles.imageWrapper}>
				{loading ? (
					<View style={[styles.loadingContainer, { backgroundColor: `${theme.bgSecondary}CC` }]}>
						<ActivityIndicator size="small" color={theme.accent} />
						<Text style={[styles.loadingText, { color: theme.textSecondary }]}>Chargement...</Text>
					</View>
				) : null}
				
				<Image
					source={{ uri: debouncedUrl }}
					style={[
						styles.image,
						{ borderColor: theme.borderLight, backgroundColor: theme.bgCard },
						(loading || error) ? styles.imageHidden : null
					]}
					onLoadStart={handleLoadStart}
					onLoad={handleLoad}
					onError={handleError}
					resizeMode="contain"
				/>
				
				{error ? (
					<View style={[styles.errorContainer, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}>
						<Text style={[styles.errorText, { color: theme.danger }]}>❌ Impossible de charger l'image</Text>
						<Text style={[styles.errorHint, { color: theme.danger }]}>Vérifiez que l'URL est correcte</Text>
					</View>
				) : null}
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		marginTop: 12,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 8,
	},
	imageWrapper: {
		alignItems: 'center',
		position: 'relative',
	},
	image: {
		width: 120,
		height: 160,
		borderRadius: 8,
		borderWidth: 1,
	},
	imageHidden: {
		opacity: 0,
	},
	loadingContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
		zIndex: 1,
	},
	loadingText: {
		marginTop: 8,
		fontSize: 12,
		textAlign: 'center',
	},
	errorContainer: {
		width: 120,
		height: 160,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
		borderWidth: 1,
		padding: 8,
	},
	errorText: {
		fontSize: 12,
		textAlign: 'center',
		fontWeight: '500',
	},
	errorHint: {
		fontSize: 10,
		textAlign: 'center',
		marginTop: 4,
		fontStyle: 'italic',
	},
});