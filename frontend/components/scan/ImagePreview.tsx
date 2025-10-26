// components/scan/ImagePreview.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';

interface ImagePreviewProps {
	url: string;
	debounceMs?: number;
}

export const ImagePreview: React.FC<ImagePreviewProps> = React.memo(({ 
	url, 
	debounceMs = 1500 
}) => {
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
		<View style={styles.container}>
			<Text style={styles.label}>Aperçu :</Text>
			<View style={styles.imageWrapper}>
				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#3498db" />
						<Text style={styles.loadingText}>Chargement...</Text>
					</View>
				) : null}
				
				<Image
					source={{ uri: debouncedUrl }}
					style={[
						styles.image,
						(loading || error) ? styles.imageHidden : null
					]}
					onLoadStart={handleLoadStart}
					onLoad={handleLoad}
					onError={handleError}
					resizeMode="contain"
				/>
				
				{error ? (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>❌ Impossible de charger l'image</Text>
						<Text style={styles.errorHint}>Vérifiez que l'URL est correcte</Text>
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
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#495057',
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
		borderColor: '#dee2e6',
		backgroundColor: '#ffffff',
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
		backgroundColor: 'rgba(248, 249, 250, 0.8)',
		borderRadius: 8,
		zIndex: 1,
	},
	loadingText: {
		marginTop: 8,
		fontSize: 12,
		color: '#6c757d',
		textAlign: 'center',
	},
	errorContainer: {
		width: 120,
		height: 160,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8d7da',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#f5c6cb',
		padding: 8,
	},
	errorText: {
		fontSize: 12,
		color: '#721c24',
		textAlign: 'center',
		fontWeight: '500',
	},
	errorHint: {
		fontSize: 10,
		color: '#721c24',
		textAlign: 'center',
		marginTop: 4,
		fontStyle: 'italic',
	},
});