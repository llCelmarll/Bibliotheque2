import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from "react-native";
import { fetchBooks, Book } from "@/services/books";
import BookCover from "@/components/BookCover";

export default function BooksScreen() {
	const [books, setBooks] = useState<Book[]>([]);
	const [page, setPage] = useState(1); // Suivi de la page courante
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false); // Chargement en cours de plus de livres
	const [hasMore, setHasMore] = useState(true); // Indicateur de fin de liste
	const [error, setError] = useState<String | null>(null);


	const loadBooks = async (pageToLoad : number) => {
		try {
			const newBooks = await fetchBooks(pageToLoad);
			if (newBooks.length > 0) {
				setBooks((prevBooks) => [...prevBooks, ...newBooks]);
			} else {
				setHasMore(false);
			}
		} catch (error) {
			console.error("Erreur de chargement : ", error)
			setError("Une erreur est survenue lors du chargement des livres ???");
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	};

	useEffect(() => {
		if (books.length === 0) {
		loadBooks(1);
		}
	}, []);

	const loadMore = () => {
		if (!loadingMore && hasMore) {
			const nextPage = page + 1;
			setLoadingMore(true);
			loadBooks(nextPage);
			setPage(nextPage);
		}
	}

	if (loading) {
		return <ActivityIndicator size="large" style={styles.loader} />
	}

	if (error) {
		return <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>;

	}

	return (
		<View style={styles.container}>
			<FlatList
				data={books}
				keyExtractor={(item) => item.id.toString()}
				renderItem={({ item }) => (
					<View style={styles.bookItem}>
						<BookCover url={item.cover_url} />
						<View style={styles.bookInfo}>
							<Text style={styles.title}>{item.title}</Text>

							{/*Affichage des auteurs*/}
							{item.authors && item.authors.length > 0 ? (
								<Text style={styles.authors}>
									{`Auteur(s) : ${item.authors.map((author) => author.name).join(',')}`}
								</Text>
							) : (
								<Text style={styles.authors}>
									Auteur inconnu
								</Text>

							)}

							{/*Affichage de l'éditeur */}

							{item.publisher && <Text style={styles.subtitle}>Editeur: {item.publisher.name}</Text>}

							{/*{item.isbn && <Text style={styles.subtitle}>ISBN: {item.isbn}</Text>}*/}
							{item.page_count && <Text>{item.page_count} pages</Text>}
						</View>
					</View>
				)}
				onEndReached={loadMore} // Chargement automatique lorsque l'utilisateur arrive au bas de la liste'
				onEndReachedThreshold={0.1} // Seuil de déclenchement ( 50% de la taille de la liste )
				ListFooterComponent={
					loadingMore ? <ActivityIndicator style={styles.loadingMore} /> : null
				}// Indicateur de chargement supplémentaire
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: "#fff" },
	loader: { flex: 1, justifyContent: "center", alignItems: "center" },
	bookItem: {
		marginBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#ddd",
		paddingBottom: 8,
		flexDirection: "row",
		gap: 12,
	},
	bookInfo: { flex: 1 },
	title: { fontSize: 16, fontWeight: "bold" },
	subtitle: { color: "#666" },
	loadingMore: { padding: 16 , justifyContent: "center", alignItems: "center" },
	authors: {
		color: "#444",
		fontStyle: "italic",
		marginTop: 4
	},

});
