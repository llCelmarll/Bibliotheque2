import { useLocalSearchParams, Stack, useRouter} from "expo-router";
import {View, ScrollView, ActivityIndicator, StyleSheet, Text} from "react-native";
import {useBookDetail} from "@/hooks/useBookDetail";
import {BookHeader} from "@/components/BookDetail/BookHeader";
import { ErrorMessage } from "@/components/ErrorMessage";
import {BookDetailTabs} from "@/components/BookDetail/BookDetailTabs";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export  default function BookDetailScreen() {
	const {id, refresh} = useLocalSearchParams(); // récupération de l'id d'un livre depuis l'URL
	const { book, loading, error, refetch } = useBookDetail(id as string);
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const router = useRouter();

	// Protection d'authentification
	useEffect(() => {
		if (!authLoading && !isAuthenticated) {
			router.replace("/auth/login");
		}
	}, [isAuthenticated, authLoading, router]);

	// Rafraîchir les données quand le paramètre refresh change
	useEffect(() => {
		if (refresh) {
			console.log('🔄 Rafraîchissement des détails du livre demandé');
			refetch();
			// Nettoyer l'URL pour éviter les rafraîchissements en boucle
			router.replace(`/books/${id}`);
		}
	}, [refresh, refetch, router, id]);

	// Si pas authentifié, ne rien afficher (redirection en cours)
	if (!authLoading && !isAuthenticated) {
		return null;
	}

	return (
		<>
			<Stack.Screen
				options={{
					title: "Details du livre",
					headerShown: true,
				}}
			/>

			<View style={styles.container}>
				{loading ? (
					<ActivityIndicator size="large" style={styles.loader} />
				) : error ? (
					<ErrorMessage message={error} onRetry={refetch}/>
				) : book ? (
					<View style={styles.content}>
						<BookHeader 
							book={book} 
							onBookDeleted={() => {
								// Optionnel: rafraîchir les données ou naviguer
								refetch();
							}}
						/>
						<BookDetailTabs book={book}/>
					</View>
				) : null}
			</View>
		</>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
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
