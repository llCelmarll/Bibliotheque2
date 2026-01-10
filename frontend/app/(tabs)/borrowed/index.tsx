// app/(tabs)/borrowed/index.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchActiveBorrowedBooks } from '@/services/borrowedBookService';
import { BorrowedBook } from '@/types/borrowedBook';
import { BorrowedBookListItem } from '@/components/BorrowedBookListItem';

export default function BorrowedBooksScreen() {
	const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const loadBorrowedBooks = async () => {
		try {
			setLoading(true);
			const data = await fetchActiveBorrowedBooks();
			setBorrowedBooks(data);
		} catch (error) {
			console.error('Erreur chargement emprunts:', error);
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			loadBorrowedBooks();
		}, [])
	);

	const onRefresh = async () => {
		setRefreshing(true);
		await loadBorrowedBooks();
		setRefreshing(false);
	};

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.header}>📚 Livres Empruntés</Text>
			<Text style={styles.subHeader}>{borrowedBooks.length} livre(s) emprunté(s)</Text>

			{borrowedBooks.length === 0 ? (
				<View style={styles.empty}>
					<Text style={styles.emptyText}>Aucun livre emprunté</Text>
					<Text style={styles.emptySubText}>
						Ajoutez un livre en tant qu'emprunt lors du scan ou de l'ajout manuel
					</Text>
				</View>
			) : (
				<FlatList
					data={borrowedBooks}
					keyExtractor={(item) => item.id.toString()}
					renderItem={({ item }) => <BorrowedBookListItem borrowedBook={item} />}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff', padding: 16 },
	header: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
	subHeader: { fontSize: 14, color: '#666', marginBottom: 16 },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
	emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
	emptySubText: { fontSize: 14, color: '#999', textAlign: 'center' },
});
