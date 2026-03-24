import { useLocalSearchParams, Stack, useRouter} from "expo-router";
import {View, ScrollView, ActivityIndicator, StyleSheet, Text} from "react-native";
import {useBookDetail} from "@/hooks/useBookDetail";
import {BookHeader} from "@/components/BookDetail/BookHeader";
import { ErrorMessage } from "@/components/ErrorMessage";
import {BookDetailTabs} from "@/components/BookDetail/BookDetailTabs";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export  default function BookDetailScreen() {
	const {id, refresh} = useLocalSearchParams(); // récupération de l'id d'un livre depuis l'URL
	const { book, loading, error, refetch } = useBookDetail(id as string);
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const router = useRouter();
	const theme = useTheme();

	// Rafraîchir les données quand le paramètre refresh change
	useEffect(() => {
		if (refresh) {
			console.log('🔄 Rafraîchissement des détails du livre demandé');
			refetch();
			// Nettoyer l'URL pour éviter les rafraîchissements en boucle
			router.replace(`/books/${id}`);
		}
	}, [refresh, refetch, router, id]);

	useEffect(() => {
		if (!book) return;
		console.log("[BookDetail] Data used by UI", {
			bookId: id,
			google_books: book.google_books,
			open_library: book.open_library,
		});
	}, [book, id]);

	// Si pas authentifié, ne rien afficher (redirection en cours)
	if (!authLoading && !isAuthenticated) {
		return null;
	}

	const isReadOnly = !!book?.base?.borrowed_book &&
		['active', 'overdue'].includes(book.base.borrowed_book.status as string);

	return (
		<>
			<Stack.Screen
				options={{
					title: "Details du livre",
					headerShown: true,
					headerLeft: () => {
						const router = useRouter();
						const MaterialIcons = require('@expo/vector-icons').MaterialIcons;
						return (
							<MaterialIcons
								name="arrow-back"
								size={24}
								color={theme.textPrimary}
								style={{marginLeft: 16}}
								onPress={() => router.replace('/(tabs)/books')}
							/>
						);
					}
				}}
			/>

			<View style={[styles.container, { backgroundColor: theme.bgCard }]}>
				{loading ? (
					<ActivityIndicator size="large" style={styles.loader} />
				) : error ? (
					<ErrorMessage message={error} onRetry={refetch}/>
				) : book ? (
					<View style={styles.content}>
						<BookHeader
							book={book}
							readOnly={isReadOnly}
							onBookDeleted={() => {
								refetch();
							}}
						/>
						<BookDetailTabs book={book} onBookUpdated={refetch} readOnly={isReadOnly}/>
					</View>
				) : null}
			</View>
		</>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loader: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		flex: 1,
	},
});
